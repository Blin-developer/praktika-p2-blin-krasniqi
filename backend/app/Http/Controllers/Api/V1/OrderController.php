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

        // Faza 3: Validimi i plotë i disponueshmërisë së restorantit, orarit, pushimeve dhe stokut të produkteve
        $availabilityService = app(\App\Services\RestaurantAvailabilityService::class);
        $availabilityService->validateOrderAvailability($branch, $orderType, $validated['items']);

        // Llogaritja e kohës së përgatitjes për porosinë (snapshot)
        $estimatedPrepTime = $availabilityService->calculateOrderPrepTime($branch, $validated['items']);

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
            $estimatedPrepTime,
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
                'estimated_prep_time_minutes' => $estimatedPrepTime,
                'customer_note' => $validated['customer_note'] ?? null,
                'subtotal' => $subtotal,
                'delivery_fee' => $deliveryFee,
                'tax_amount' => $taxAmount,
                'total_price' => $totalPrice,
                'payment_status' => 'pending',
                'payment_method' => $validated['payment_method'],
            ]);

            // 2. Krijimi i Artikujve të Porosisë me Snapshot dhe Përditësimi i Sigurt i Stokut
            foreach ($preparedItems as $prep) {
                // Kyçje me lockForUpdate për të parandaluar garën e porosive (race conditions)
                $lockedProduct = Product::where('id', $prep['product']->id)->lockForUpdate()->first();
                if ($lockedProduct && $lockedProduct->track_stock && $lockedProduct->stock_quantity !== null) {
                    if ($lockedProduct->stock_quantity < $prep['quantity']) {
                        throw \Illuminate\Validation\ValidationException::withMessages([
                            'items' => ["Sasia e artikullit '{$lockedProduct->name}' sapo u ndryshua dhe nuk ka stok të mjaftueshëm."],
                        ]);
                    }
                    $lockedProduct->decrement('stock_quantity', $prep['quantity']);
                    if ($lockedProduct->fresh()->stock_quantity <= 0) {
                        $lockedProduct->update(['is_out_of_stock' => true]);
                    }
                }

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
            $frontendBase = rtrim(env('FRONTEND_URL', 'http://192.168.0.163:5173'), '/');
            $verifyUrl = "{$frontendBase}/orders/{$order->id}/verify?token={$tokenRaw}";
            PickupToken::create([
                'order_id' => $order->id,
                'token_hash' => hash('sha256', $tokenRaw),
                'short_code' => (string) rand(100000, 999999),
                'qr_payload' => $verifyUrl,
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
     * Siguron që porosia ka një PickupToken me URL të vlefshme për skanim QR.
     * Nuk gjeneron token të ri nëse URL-ja ekzistuese është e vlefshme.
     * Sinkronizon gjithmonë token_hash me token-in brenda URL-së.
     */
    private function ensureValidPickupToken(Order $order): PickupToken
    {
        $frontendBase = rtrim(env('FRONTEND_URL', 'http://192.168.0.163:5173'), '/');
        $token = $order->pickupToken;
        if (!$token) {
            $tokenRaw = Str::random(40);
            $verifyUrl = "{$frontendBase}/orders/{$order->id}/verify?token={$tokenRaw}";
            $token = PickupToken::create([
                'order_id' => $order->id,
                'token_hash' => hash('sha256', $tokenRaw),
                'short_code' => (string) rand(100000, 999999),
                'qr_payload' => $verifyUrl,
                'expires_at' => now()->addDays(30),
                'is_redeemed' => false,
            ]);
            $order->setRelation('pickupToken', $token);
        } elseif (!str_starts_with($token->qr_payload ?? '', 'http') || str_contains($token->qr_payload ?? '', 'tastio.com')) {
            // URL-ja nuk është e vlefshme (nuk fillon me http ose përmban tastio.com)
            // Nxjerrim token-in ekzistues nga URL-ja e vjetër për ta ruajtur të njëjtin token
            $rawPart = '';
            if (str_contains($token->qr_payload ?? '', '?token=')) {
                parse_str(parse_url($token->qr_payload, PHP_URL_QUERY) ?? '', $queryParams);
                $rawPart = $queryParams['token'] ?? '';
            } elseif (str_starts_with($token->qr_payload ?? '', 'TASTIO:ORDER:')) {
                $parts = explode(':', $token->qr_payload);
                $rawPart = end($parts) ?: '';
            }

            // Nëse nuk mund të nxjerrim token-in, gjenerojmë një të ri
            if (empty($rawPart)) {
                $rawPart = Str::random(40);
            }

            $verifyUrl = "{$frontendBase}/orders/{$order->id}/verify?token={$rawPart}";
            $token->update([
                'qr_payload' => $verifyUrl,
                'token_hash' => hash('sha256', $rawPart),
                'expires_at' => ($token->expires_at && $token->expires_at->isPast()) ? now()->addDays(30) : $token->expires_at,
            ]);
            $token->qr_payload = $verifyUrl;
            $token->token_hash = hash('sha256', $rawPart);
        }

        // Zgjat token-ët e skaduar që i përkasin porosive aktive
        if ($token->expires_at && $token->expires_at->isPast() && !in_array($order->status, ['completed', 'cancelled'])) {
            $token->update(['expires_at' => now()->addDays(30)]);
            $token->expires_at = now()->addDays(30);
        }

        return $token;
    }

    /**
     * Merr detajet e një porosie sipas numrit të saj unik (për faqen e konfirmimit dhe ndjekjes).
     */
    public function show($orderNumber, Request $request)
    {
        $order = Order::with([
            'branch.restaurant',
            'items.options',
            'statusHistory.changedBy',
            'payment',
            'pickupToken'
        ])
        ->where('order_number', $orderNumber)
        ->firstOrFail();

        $this->ensureValidPickupToken($order);

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
     * Lista e porosive për klientin e kyçur me kërkim, filtrim dhe faqosje.
     */
    public function myOrders(Request $request)
    {
        $user = $request->user();

        $query = Order::with([
            'branch.restaurant',
            'items.options',
            'payment',
            'pickupToken',
            'statusHistory.changedBy',
        ])->where('customer_id', $user->id);

        // Filtrim sipas statusit
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Kërkim sipas numrit të porosisë, emrit të restorantit ose artikullit
        if ($request->filled('search')) {
            $term = trim($request->search);
            $query->where(function ($q) use ($term) {
                $q->where('order_number', 'like', "%{$term}%")
                  ->orWhereHas('items', function ($iq) use ($term) {
                      $iq->where('product_name_snapshot', 'like', "%{$term}%");
                  })
                  ->orWhereHas('branch.restaurant', function ($rq) use ($term) {
                      $rq->where('name', 'like', "%{$term}%");
                  });
            });
        }

        // Filtrim sipas intervalit të datës
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $ordersQuery = $query->orderBy('created_at', 'desc');

        if ($request->boolean('all')) {
            $data = $ordersQuery->get();
            foreach ($data as $ord) {
                $this->ensureValidPickupToken($ord);
            }
            return response()->json([
                'success' => true,
                'data' => $data,
                'total' => $data->count(),
            ]);
        }

        $perPage = min(max((int) $request->query('per_page', 10), 1), 50);
        $paginated = $ordersQuery->paginate($perPage);

        foreach ($paginated->items() as $ord) {
            $this->ensureValidPickupToken($ord);
        }

        return response()->json([
            'success' => true,
            'data' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * Verifikimi publik dhe i sigurt i porosisë nga skanimi i Kodit QR me telefon.
     * I qasshëm me URL të vlefshme si: https://tastio.com/orders/{order_id}/verify?token=...
     * Mbron të dhënat e klientit duke maskuar emrin dhe duke mos ekspozuar të dhëna private.
     */
    public function verifyOrder($orderIdentifier, Request $request)
    {
        $order = Order::with([
            'branch.restaurant',
            'items.options',
            'payment',
            'pickupToken'
        ])
        ->where('order_number', $orderIdentifier)
        ->when(is_numeric($orderIdentifier), fn($q) => $q->orWhere('id', $orderIdentifier))
        ->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'verified' => false,
                'message' => 'Porosia nuk u gjet ose kodi i verifikimit është i pavlefshëm.',
            ], 404);
        }

        // NUK thirret ensureValidPickupToken gjatë verifikimit
        // për të parandaluar mutimin e token-it derisa përdoruesi po tenton ta verifikojë.

        $providedToken = $request->query('token') ?? $request->input('token');

        // Nëse është dhënë një token, kryejmë verifikimin e sigurisë
        if ($order->pickupToken && $providedToken) {
            $hashed = hash('sha256', $providedToken);

            // Nxjerrim token-in e ruajtur brenda URL-së së qr_payload për krahasim më të besueshëm
            $storedUrlToken = '';
            $storedUrl = $order->pickupToken->qr_payload ?? '';
            if (str_contains($storedUrl, '?token=')) {
                parse_str(parse_url($storedUrl, PHP_URL_QUERY) ?? '', $queryParams);
                $storedUrlToken = $queryParams['token'] ?? '';
            }

            $tokenMatches = ($hashed === $order->pickupToken->token_hash)
                || ($providedToken === $storedUrlToken)
                || ($providedToken === $order->pickupToken->token_hash)
                || ($providedToken === $order->pickupToken->short_code)
                || ($providedToken === $order->order_number);

            if (!$tokenMatches) {
                return response()->json([
                    'success' => false,
                    'verified' => false,
                    'message' => 'Token-i i sigurisë nuk përputhet me këtë porosi.',
                ], 403);
            }

            // Nëse token-i ka skaduar por porosia është aktive, e rinovojmë automatikisht
            if ($order->pickupToken->expires_at && $order->pickupToken->expires_at->isPast()) {
                if (in_array($order->status, ['completed', 'cancelled'])) {
                    return response()->json([
                        'success' => false,
                        'verified' => false,
                        'message' => 'Kodi i verifikimit ka skaduar. Porosia është përfunduar ose anuluar.',
                    ], 410);
                }
                // Rinovo token-in për porositë aktive
                $order->pickupToken->update(['expires_at' => now()->addDays(30)]);
            }
        }

        // Mbrojtja e privatësisë: Maska e emrit dhe fshehja e të dhënave personale
        $fullName = $order->customer_name ?: 'Klient Tastio';
        $nameParts = array_filter(explode(' ', trim($fullName)));
        if (count($nameParts) > 1) {
            $lastName = end($nameParts);
            $maskedName = reset($nameParts) . ' ' . mb_substr($lastName, 0, 1) . '.';
        } else {
            $maskedName = reset($nameParts) ?: 'Klient';
        }

        $deliveryAddressFormatted = 'Prishtinë';
        if ($order->order_type === 'delivery' && $order->delivery_address) {
            if (is_array($order->delivery_address)) {
                $street = $order->delivery_address['street'] ?? '';
                $city = $order->delivery_address['city'] ?? 'Prishtinë';
                $deliveryAddressFormatted = trim("{$street}, {$city}", ', ');
            } else {
                $parsed = json_decode($order->delivery_address, true);
                if (is_array($parsed)) {
                    $street = $parsed['street'] ?? '';
                    $city = $parsed['city'] ?? 'Prishtinë';
                    $deliveryAddressFormatted = trim("{$street}, {$city}", ', ');
                } else {
                    $deliveryAddressFormatted = (string) $order->delivery_address;
                }
            }
        }

        return response()->json([
            'success' => true,
            'verified' => true,
            'data' => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'order_type' => $order->order_type,
                'restaurant_name' => $order->branch?->restaurant?->name ?? 'Restorant Partner Tastio',
                'branch_name' => $order->branch?->name,
                'branch_address' => $order->branch?->address,
                'delivery_address' => $deliveryAddressFormatted,
                'customer_display_name' => $maskedName,
                'items' => $order->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'name' => $item->product_name_snapshot,
                        'quantity' => $item->quantity,
                        'unit_price' => (float) $item->unit_price_snapshot,
                        'line_total' => (float) $item->line_total,
                    ];
                }),
                'subtotal' => (float) $order->subtotal,
                'delivery_fee' => (float) $order->delivery_fee,
                'total_price' => (float) $order->total_price,
                'payment_method' => $order->payment_method,
                'payment_status' => $order->payment_status,
                'verification' => [
                    'short_code' => $order->pickupToken?->short_code ?? strtoupper(substr($order->order_number, -6)),
                    'is_redeemed' => (bool) ($order->pickupToken?->is_redeemed ?? false),
                    'redeemed_at' => $order->pickupToken?->redeemed_at,
                    'created_at' => $order->created_at?->toIso8601String(),
                ]
            ]
        ]);
    }

    /**
     * Anulimi i porosisë nga klienti (lejohet vetëm për porositë në status 'pending' ose 'confirmed').
     */
    public function cancelOrder($orderNumber, Request $request)
    {
        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $order = Order::where('order_number', $orderNumber)->firstOrFail();
        $user = $request->user();

        // Verifiko autorizimin e klientit
        if ($user->role === 'customer' && $order->customer_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Nuk keni autorizim për të anuluar këtë porosi.',
            ], 403);
        }

        // Klienti mund të anulojë vetëm para se të fillojë përgatitja në kuzhinë
        if ($user->role === 'customer' && !in_array($order->status, ['pending', 'confirmed'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Porosia nuk mund të anulohet pasi kuzhina ka filluar përgatitjen e saj.',
                'current_status' => $order->status,
            ], 422);
        }

        if (in_array($order->status, ['completed', 'cancelled'], true)) {
            return response()->json([
                'success' => false,
                'message' => "Porosia është tashmë në statusin '{$order->status}' dhe nuk mund të anulohet.",
            ], 422);
        }

        $reason = $validated['reason'] ?? 'Anuluar nga klienti.';

        DB::transaction(function () use ($order, $user, $reason) {
            $oldStatus = $order->status;
            $order->status = 'cancelled';
            if ($order->payment_status === 'paid') {
                $order->payment_status = 'refunded';
                if ($order->payment) {
                    $order->payment->update(['status' => 'refunded']);
                }
            }
            $order->save();

            OrderStatusHistory::create([
                'order_id' => $order->id,
                'from_status' => $oldStatus,
                'to_status' => 'cancelled',
                'changed_by_user_id' => $user->id,
                'reason_or_notes' => $reason,
            ]);
        });

        $order->load(['branch.restaurant', 'items.options', 'statusHistory.changedBy', 'payment']);

        return response()->json([
            'success' => true,
            'message' => 'Porosia u anulua me sukses.',
            'data' => $order,
        ]);
    }

    /**
     * Përditësimi i statusit të porosisë nga përdoruesit e autorizuar me kontroll rigoroze të tranzicioneve.
     */
    public function updateStatus($idOrOrderNumber, Request $request)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:pending,confirmed,in_preparation,ready_for_pickup,completed,cancelled',
            'reason' => 'nullable|string|max:500',
        ]);

        $order = is_numeric($idOrOrderNumber)
            ? Order::findOrFail($idOrOrderNumber)
            : Order::where('order_number', $idOrOrderNumber)->firstOrFail();

        $user = $request->user();
        $targetStatus = $validated['status'];
        $currentStatus = $order->status;

        if ($currentStatus === $targetStatus) {
            return response()->json([
                'success' => true,
                'message' => "Porosia është tashmë në statusin '{$targetStatus}'.",
                'data' => $order,
            ]);
        }

        // Kontrolli i autorizimit sipas rolit
        $allowedByRole = match ($user->role) {
            'super_admin' => true,
            'owner', 'branch_manager' => true,
            'kitchen_staff' => in_array($targetStatus, ['in_preparation', 'ready_for_pickup'], true),
            'cashier' => in_array($targetStatus, ['completed', 'cancelled'], true),
            'customer' => $targetStatus === 'cancelled' && in_array($currentStatus, ['pending', 'confirmed'], true) && $order->customer_id === $user->id,
            default => false,
        };

        if (!$allowedByRole) {
            return response()->json([
                'success' => false,
                'message' => "Roli '{$user->role}' nuk ka leje të kalojë porosinë në statusin '{$targetStatus}'.",
            ], 403);
        }

        // Kontrolli i matricës së tranzicioneve të lejuara (State Machine)
        if ($user->role !== 'super_admin') {
            $allowedTransitions = [
                'pending' => ['confirmed', 'cancelled'],
                'confirmed' => ['in_preparation', 'cancelled'],
                'in_preparation' => ['ready_for_pickup', 'cancelled'],
                'ready_for_pickup' => ['completed', 'cancelled'],
                'completed' => [], // terminal
                'cancelled' => [], // terminal
            ];

            $validNextStatuses = $allowedTransitions[$currentStatus] ?? [];

            if (!in_array($targetStatus, $validNextStatuses, true)) {
                return response()->json([
                    'success' => false,
                    'message' => "Tranzicioni nga '{$currentStatus}' në '{$targetStatus}' nuk lejohet.",
                    'allowed_next_statuses' => $validNextStatuses,
                ], 422);
            }
        }

        $reason = $validated['reason'] ?? match ($targetStatus) {
            'in_preparation' => 'Kuzhina filloi përgatitjen e porosisë.',
            'ready_for_pickup' => 'Porosia është gati për marrje / korrier.',
            'completed' => 'Porosia u dorëzua dhe u përmbyll me sukses.',
            'cancelled' => 'Porosia u anulua.',
            default => "Statusi u ndryshua nga {$currentStatus} në {$targetStatus}.",
        };

        DB::transaction(function () use ($order, $currentStatus, $targetStatus, $user, $reason) {
            $order->status = $targetStatus;

            // Përditëso pagesën kur porosia përfundohet
            if ($targetStatus === 'completed') {
                if ($order->payment_status !== 'paid') {
                    $order->payment_status = 'paid';
                }
                if ($order->payment) {
                    $order->payment->update([
                        'status' => 'completed',
                        'paid_at' => now(),
                        'processed_by_user_id' => $user->id,
                    ]);
                }
            } elseif ($targetStatus === 'cancelled') {
                if ($order->payment_status === 'paid') {
                    $order->payment_status = 'refunded';
                    if ($order->payment) {
                        $order->payment->update(['status' => 'refunded']);
                    }
                } else {
                    if ($order->payment) {
                        $order->payment->update(['status' => 'failed']);
                    }
                }
            }

            $order->save();

            OrderStatusHistory::create([
                'order_id' => $order->id,
                'from_status' => $currentStatus,
                'to_status' => $targetStatus,
                'changed_by_user_id' => $user->id,
                'reason_or_notes' => $reason,
            ]);
        });

        $order->load([
            'branch.restaurant',
            'items.options',
            'customer',
            'statusHistory.changedBy',
            'payment',
            'pickupToken'
        ]);

        return response()->json([
            'success' => true,
            'message' => "Statusi i porosisë u përditësua me sukses në '{$targetStatus}'.",
            'data' => $order,
        ]);
    }

    /**
     * Lista e të gjitha porosive për administratorët me kërkim, filtrim të shumëfishtë dhe përmbledhje statistikore.
     */
    public function indexAdmin(Request $request)
    {
        $query = Order::with([
            'customer',
            'branch.restaurant',
            'items.options',
            'payment',
            'pickupToken',
            'statusHistory.changedBy',
        ]);

        // Kërkim me tekst të lirë (numër porosie, emër, email, telefon klienti, emër produkti)
        if ($request->filled('search')) {
            $term = trim($request->search);
            $query->where(function ($q) use ($term) {
                $q->where('order_number', 'like', "%{$term}%")
                  ->orWhere('customer_name', 'like', "%{$term}%")
                  ->orWhere('customer_email', 'like', "%{$term}%")
                  ->orWhere('customer_phone', 'like', "%{$term}%")
                  ->orWhereHas('items', function ($iq) use ($term) {
                      $iq->where('product_name_snapshot', 'like', "%{$term}%");
                  });
            });
        }

        // Filtrim sipas statusit (mbështet vlerë të vetme ose lista të ndara me presje)
        if ($request->filled('status') && $request->status !== 'all') {
            $statuses = explode(',', $request->status);
            $query->whereIn('status', array_map('trim', $statuses));
        }

        // Filtrim sipas llojit të porosisë
        if ($request->filled('order_type') && $request->order_type !== 'all') {
            $query->where('order_type', $request->order_type);
        }

        // Filtrim sipas degës
        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        // Filtrim sipas restorantit
        if ($request->filled('restaurant_id')) {
            $query->whereHas('branch', function ($bq) use ($request) {
                $bq->where('restaurant_id', $request->restaurant_id);
            });
        }

        // Filtrim sipas statusit të pagesës
        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        // Filtrim sipas metodës së pagesës
        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        // Filtrim sipas intervalit kohor (data nga / deri)
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Numërimet e sakta për secilin status për të gjitha porositë në sistem
        $allStatuses = ['pending', 'confirmed', 'in_preparation', 'ready_for_pickup', 'completed', 'cancelled'];
        $statusCountsRaw = Order::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $statusCounts = [];
        foreach ($allStatuses as $st) {
            $statusCounts[$st] = (int) ($statusCountsRaw[$st] ?? 0);
        }

        $totalCount = (clone $query)->count();
        $totalRevenue = (float) (clone $query)->where('payment_status', 'paid')->sum('total_price');

        // Renditja (Sorting)
        $allowedSortCols = ['created_at', 'total_price', 'status', 'order_number'];
        $sortBy = in_array($request->query('sort_by'), $allowedSortCols, true) ? $request->query('sort_by') : 'created_at';
        $sortDir = strtolower($request->query('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $query->orderBy($sortBy, $sortDir);

        $perPage = min(max((int) $request->query('per_page', 15), 1), 100);
        $paginated = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
            'summary' => [
                'total_orders' => $totalCount,
                'total_revenue' => round($totalRevenue, 2),
                'status_counts' => $statusCounts,
            ],
        ]);
    }

    /**
     * Merr të gjitha detajet e thelluara të një porosi për panelin administrativ.
     */
    public function showAdmin($id, Request $request)
    {
        $order = is_numeric($id)
            ? Order::with([
                'customer',
                'branch.restaurant',
                'items.options',
                'items.station',
                'payment',
                'pickupToken',
                'statusHistory.changedBy',
                'readyTimeHistory'
            ])->findOrFail($id)
            : Order::with([
                'customer',
                'branch.restaurant',
                'items.options',
                'items.station',
                'payment',
                'pickupToken',
                'statusHistory.changedBy',
                'readyTimeHistory'
            ])->where('order_number', $id)->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $order,
        ]);
    }

    /**
     * Përditësim i shpejtë i biletës së KDS nga stafi i kuzhinës.
     */
    public function updateKdsStatus($id, Request $request)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:in_preparation,ready_for_pickup,completed',
            'reason' => 'nullable|string|max:500',
        ]);

        return $this->updateStatus($id, $request);
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
