<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\OptionChoice;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderItemOption;
use App\Models\OrderStatusHistory;
use App\Models\Payment;
use App\Models\PickupToken;
use App\Models\Product;
use App\Models\UserAddress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    /**
     * Krijon një porosi të re me transaksion të plotë në databazë dhe rillogaritje të çmimeve në server.
     */
    public function store(Request $request)
    {
        // Normalizim inteligjent i artikujve dhe degës për përputhshmëri të plotë (katalog & shportë)
        $rawItems = $request->input('items', []);
        $detectedBranchId = $request->input('branch_id');

        if (is_array($rawItems) && count($rawItems) > 0) {
            $normalizedItems = [];
            foreach ($rawItems as $item) {
                $pId = $item['product_id'] ?? null;
                $foundProduct = null;

                if (is_numeric($pId)) {
                    $foundProduct = Product::find((int) $pId);
                }

                if (!$foundProduct && !empty($pId)) {
                    $foundProduct = Product::where('slug', (string) $pId)->first();
                }

                if (!$foundProduct && !empty($item['name'])) {
                    $foundProduct = Product::where('name', $item['name'])->first();
                }

                if ($foundProduct) {
                    $item['product_id'] = $foundProduct->id;
                    if (!$detectedBranchId && $foundProduct->menuCategory && $foundProduct->menuCategory->restaurant) {
                        $branch = $foundProduct->menuCategory->restaurant->branches()->where('is_active', true)->first();
                        if ($branch) {
                            $detectedBranchId = $branch->id;
                        }
                    }
                }

                $normalizedItems[] = $item;
            }
            $request->merge(['items' => $normalizedItems]);
        }

        if (empty($detectedBranchId)) {
            $fallbackBranch = Branch::where('is_active', true)->first();
            $detectedBranchId = $fallbackBranch ? $fallbackBranch->id : 1;
        }

        $request->merge(['branch_id' => $detectedBranchId]);

        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'order_type' => 'nullable|string|in:delivery,pickup',
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'required|email|max:255',
            'customer_phone' => 'required|string|max:50',
            'customer_note' => 'nullable|string|max:1000',
            'payment_method' => 'required|string|in:cash_on_delivery,card',
            'save_address' => 'nullable|boolean',
            'delivery_address' => 'nullable',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1|max:99',
            'items.*.selected_choices' => 'nullable|array',
        ]);

        $orderType = $validated['order_type'] ?? 'delivery';

        // Validim i adresës kur porosia është me dërgesë
        if ($orderType === 'delivery') {
            if (empty($validated['delivery_address'])) {
                return response()->json([
                    'message' => 'Adresa e dërgesës është e detyrueshme për porositë me dërgesë.',
                    'errors' => ['delivery_address' => ['Ju lutem shënoni adresën e dërgesës.']]
                ], 422);
            }
        }

        $authUser = $request->user('sanctum') ?? $request->user();
        $userId = $authUser ? $authUser->id : null;

        // Nëse përdoruesi nuk është i kyçur, gjejmë ose krijojmë llogari klienti sipas email-it për të plotësuar foreign key në orders
        if (!$userId) {
            $existingUser = \App\Models\User::where('email', $validated['customer_email'])->first();
            if ($existingUser) {
                $userId = $existingUser->id;
            } else {
                $createdCustomer = \App\Models\User::create([
                    'name' => $validated['customer_name'],
                    'email' => $validated['customer_email'],
                    'phone' => $validated['customer_phone'],
                    'password' => bcrypt(Str::random(24)),
                    'role' => 'customer',
                ]);
                $userId = $createdCustomer->id;
            }
        }

        // Kontroll i parandalimit të double-click (brenda 3 sekondave nga i njëjti përdorues me të njëjtën degë)
        if ($userId && !app()->environment('testing')) {
            $recentOrder = Order::where('customer_id', $userId)
                ->where('branch_id', $validated['branch_id'])
                ->where('created_at', '>=', now()->subSeconds(3))
                ->first();

            if ($recentOrder) {
                return response()->json([
                    'message' => 'Një porosi e njëjtë sapo u procesua. Ju lutem prisni disa sekonda.',
                    'order' => $recentOrder
                ], 429);
            }
        }

        // Llogaritja rigoroze e çmimeve në Backend nga databaza
        $branch = Branch::findOrFail($validated['branch_id']);
        $subtotal = 0.00;
        $preparedItems = [];

        foreach ($validated['items'] as $itemData) {
            $product = Product::with(['optionGroups.choices', 'menuCategory'])->findOrFail($itemData['product_id']);

            if (!$product->is_available) {
                return response()->json([
                    'message' => "Artikulli '{$product->name}' nuk është aktualisht i disponueshëm.",
                    'errors' => ['items' => ["Artikulli '{$product->name}' është shitur ose jo aktiv."]]
                ], 422);
            }

            $unitBasePrice = (float) $product->base_price;
            $optionsPrice = 0.00;
            $itemOptionsSnapshots = [];

            // Përpunimi i opsioneve/modifikuesve të zgjedhur
            $choiceIds = [];
            if (!empty($itemData['selected_choices'])) {
                // Mund të vijë si array i id-ve ose map [groupId => [choiceIds]]
                if (is_array($itemData['selected_choices'])) {
                    foreach ($itemData['selected_choices'] as $val) {
                        if (is_array($val)) {
                            foreach ($val as $cId) {
                                $choiceIds[] = (int) $cId;
                            }
                        } elseif (is_numeric($val)) {
                            $choiceIds[] = (int) $val;
                        }
                    }
                }
            }

            if (!empty($choiceIds)) {
                $choices = OptionChoice::with('group')
                    ->whereIn('id', $choiceIds)
                    ->get();

                foreach ($choices as $choice) {
                    $addPrice = (float) $choice->additional_price;
                    $optionsPrice += $addPrice;
                    $itemOptionsSnapshots[] = [
                        'option_choice_id' => $choice->id,
                        'option_group_name_snapshot' => $choice->group ? $choice->group->name : 'Opsion',
                        'option_choice_name_snapshot' => $choice->name,
                        'additional_price_snapshot' => $addPrice,
                    ];
                }
            }

            $unitFinalPrice = $unitBasePrice + $optionsPrice;
            $qty = (int) $itemData['quantity'];
            $lineTotal = round($unitFinalPrice * $qty, 2);
            $subtotal += $lineTotal;

            $preparedItems[] = [
                'product' => $product,
                'unit_price' => $unitFinalPrice,
                'quantity' => $qty,
                'line_total' => $lineTotal,
                'options' => $itemOptionsSnapshots,
            ];
        }

        $subtotal = round($subtotal, 2);
        $deliveryFee = ($orderType === 'delivery') ? 1.50 : 0.00;
        $taxAmount = 0.00;
        $totalPrice = round($subtotal + $deliveryFee + $taxAmount, 2);

        // Fillimi i transaksionit të sigurt në databazë
        $createdOrder = DB::transaction(function () use (
            $validated,
            $userId,
            $orderType,
            $subtotal,
            $deliveryFee,
            $taxAmount,
            $totalPrice,
            $preparedItems,
            $request
        ) {
            // Gjenerimi i numrit unik të porosisë me formatin TASTIO-XXXXXX
            do {
                $orderNumber = 'TASTIO-' . strtoupper(Str::random(8));
            } while (Order::where('order_number', $orderNumber)->exists());

            // Përgatitja e formatit të adresës
            $deliveryAddressString = is_array($validated['delivery_address'] ?? null)
                ? json_encode($validated['delivery_address'], JSON_UNESCAPED_UNICODE)
                : ($validated['delivery_address'] ?? null);

            // 1. Krijimi i Porosisë
            $order = Order::create([
                'order_number' => $orderNumber,
                'customer_id' => $userId,
                'branch_id' => $validated['branch_id'],
                'order_type' => $orderType,
                'customer_name' => $validated['customer_name'],
                'customer_email' => $validated['customer_email'],
                'customer_phone' => $validated['customer_phone'],
                'delivery_address' => $deliveryAddressString,
                'status' => 'confirmed', // Menjëherë e konfirmuar për t'u shfaqur në KDS dhe Admin
                'scheduled_pickup_at' => null,
                'customer_note' => $validated['customer_note'] ?? null,
                'subtotal' => $subtotal,
                'delivery_fee' => $deliveryFee,
                'tax_amount' => $taxAmount,
                'total_price' => $totalPrice,
                'payment_status' => 'pending',
                'payment_method' => $validated['payment_method'],
            ]);

            // 2. Krijimi i Artikujve të Porosisë me Snapshot
            foreach ($preparedItems as $prep) {
                $orderItem = OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $prep['product']->id,
                    'station_id' => null,
                    'product_name_snapshot' => $prep['product']->name,
                    'unit_price_snapshot' => $prep['unit_price'],
                    'quantity' => $prep['quantity'],
                    'line_total' => $prep['line_total'],
                    'item_status' => 'pending',
                ]);

                // Opsionet e artikullit
                foreach ($prep['options'] as $opt) {
                    OrderItemOption::create([
                        'order_item_id' => $orderItem->id,
                        'option_choice_id' => $opt['option_choice_id'],
                        'option_group_name_snapshot' => $opt['option_group_name_snapshot'],
                        'option_choice_name_snapshot' => $opt['option_choice_name_snapshot'],
                        'additional_price_snapshot' => $opt['additional_price_snapshot'],
                    ]);
                }
            }

            // 3. Krijimi i Historikut të Statusit
            OrderStatusHistory::create([
                'order_id' => $order->id,
                'from_status' => null,
                'to_status' => 'confirmed',
                'changed_by_user_id' => $userId,
                'reason_or_notes' => 'Porosia u krijua me sukses nga klienti.',
            ]);

            // 4. Krijimi i Regjistrit të Pagesës
            Payment::create([
                'order_id' => $order->id,
                'amount' => $totalPrice,
                'method' => $validated['payment_method'],
                'status' => 'pending',
                'processed_by_user_id' => null,
                'transaction_reference' => 'COD-' . Str::random(10),
                'paid_at' => null,
            ]);

            // 5. Gjenerimi i Pass-it Digjital / PickupToken
            $tokenRaw = Str::random(40);
            PickupToken::create([
                'order_id' => $order->id,
                'token_hash' => hash('sha256', $tokenRaw),
                'short_code' => (string) rand(100000, 999999),
                'qr_payload' => "TASTIO:ORDER:{$order->order_number}:{$tokenRaw}",
                'expires_at' => now()->addDays(2),
                'is_redeemed' => false,
            ]);

            // 6. Ruajtja e adresës nëse përdoruesi e zgjodhi këtë opsion
            if (!empty($validated['save_address']) && $userId && !empty($validated['delivery_address'])) {
                $addr = is_array($validated['delivery_address'])
                    ? $validated['delivery_address']
                    : json_decode($validated['delivery_address'], true);

                if (is_array($addr) && !empty($addr['street'])) {
                    UserAddress::create([
                        'user_id' => $userId,
                        'title' => $addr['title'] ?? 'Adresë e Ruajtur',
                        'city' => $addr['city'] ?? 'Prishtinë',
                        'street' => $addr['street'],
                        'building' => $addr['building'] ?? null,
                        'floor' => $addr['floor'] ?? null,
                        'notes' => $addr['notes'] ?? null,
                        'is_default' => true,
                    ]);
                }
            }

            return $order;
        });

        // Ngarkojmë marrëdhëniet për përgjigjen e plotë
        $createdOrder->load([
            'branch.restaurant',
            'items.options',
            'payment',
            'pickupToken'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Porosia u konfirmua dhe u ruajt me sukses.',
            'order' => $createdOrder
        ], 201);
    }

    /**
     * Merr detajet e një porosie sipas numrit të saj unik (për faqen e konfirmimit dhe ndjekjes).
     */
    public function show($orderNumber, Request $request)
    {
        $order = Order::with([
            'branch.restaurant',
            'items.options',
            'statusHistory',
            'payment',
            'pickupToken'
        ])
        ->where('order_number', $orderNumber)
        ->firstOrFail();

        // Nëse përdoruesi është i kyçur si klient, lejohet të shohë porosinë e tij
        if ($request->user() && $request->user()->role === 'customer' && $order->customer_id !== $request->user()->id) {
            return response()->json(['message' => 'Nuk keni autorizim për këtë porosi.'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $order
        ]);
    }

    /**
     * Merr adresat e ruajtura të përdoruesit të kyçur.
     */
    public function getAddresses(Request $request)
    {
        $addresses = $request->user()
            ->addresses()
            ->orderBy('is_default', 'desc')
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $addresses
        ]);
    }

    /**
     * Ruan një adresë të re për përdoruesin.
     */
    public function saveAddress(Request $request)
    {
        $validated = $request->validate([
            'title' => 'nullable|string|max:100',
            'city' => 'required|string|max:100',
            'street' => 'required|string|max:255',
            'building' => 'nullable|string|max:100',
            'floor' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:500',
            'is_default' => 'nullable|boolean',
        ]);

        if (!empty($validated['is_default'])) {
            $request->user()->addresses()->update(['is_default' => false]);
        }

        $address = $request->user()->addresses()->create([
            'title' => $validated['title'] ?? 'Shtëpi',
            'city' => $validated['city'],
            'street' => $validated['street'],
            'building' => $validated['building'] ?? null,
            'floor' => $validated['floor'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'is_default' => $validated['is_default'] ?? false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Adresa u ruajt me sukses.',
            'data' => $address
        ], 201);
    }
}
