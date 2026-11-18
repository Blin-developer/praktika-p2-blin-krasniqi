<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\OpeningHour;
use App\Models\Product;
use App\Models\SpecialOpeningHour;
use App\Services\RestaurantAvailabilityService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RestaurantOperationsController extends Controller
{
    public function __construct(
        protected RestaurantAvailabilityService $availabilityService
    ) {}

    /**
     * Kontrollon autorizimin e përdoruesit për menaxhimin e degës.
     */
    protected function authorizeBranchManagement(Branch $branch, Request $request): void
    {
        $user = $request->user();
        if (!$user) {
            abort(401, 'Ju lutem kyçuni për të kryer këtë veprim.');
        }

        if ($user->isSuperAdmin()) {
            return;
        }

        if ($user->isOwner()) {
            $restaurant = $branch->restaurant;
            if ($restaurant && $restaurant->owner_user_id === $user->id) {
                return;
            }
        }

        if ($user->isBranchManager()) {
            $membership = $user->staffMemberships()
                ->where('branch_id', $branch->id)
                ->where('is_active', true)
                ->first();

            if ($membership) {
                return;
            }

            // Nëse menaxheri është i caktuar te ndonjë degë e restorantit
            if ($branch->restaurant && $user->staffMemberships()->where('is_active', true)->exists()) {
                return;
            }
        }

        abort(403, 'Nuk keni autorizim për të menaxhuar oraret dhe operacionet e kësaj dege.');
    }

    /**
     * Merr statusin publik të disponueshmërisë për një degë (për klientët dhe storefront).
     */
    public function getBranchAvailability($branchId): JsonResponse
    {
        $branch = Branch::with(['restaurant'])->findOrFail($branchId);
        $availability = $this->availabilityService->getBranchAvailability($branch);

        return response()->json([
            'success' => true,
            'data' => array_merge($availability, [
                'branch_id' => $branch->id,
                'branch_name' => $branch->name,
                'restaurant_name' => $branch->restaurant?->name,
                'restaurant_slug' => $branch->restaurant?->slug,
            ])
        ]);
    }

    /**
     * Merr të dhënat e plota të operacioneve për panelin administrativ të degës.
     */
    public function getBranchOperations($branchId, Request $request): JsonResponse
    {
        $branch = Branch::with(['restaurant', 'openingHours', 'specialOpeningHours'])->findOrFail($branchId);
        $this->authorizeBranchManagement($branch, $request);

        $availability = $this->availabilityService->getBranchAvailability($branch);

        // Strukturojmë orarin javor për 7 ditët (0 = E Diel, 1 = E Hënë, ..., 6 = E Shtunë)
        $weeklyHours = [];
        $emratDiteve = [
            0 => 'E Diel',
            1 => 'E Hënë',
            2 => 'E Martë',
            3 => 'E Mërkurë',
            4 => 'E Enjte',
            5 => 'E Premte',
            6 => 'E Shtunë',
        ];

        for ($day = 0; $day <= 6; $day++) {
            $dayRecords = $branch->openingHours->where('day_of_week', $day)->sortBy('sort_order')->values();
            $intervals = [];

            foreach ($dayRecords as $rec) {
                $intervals[] = [
                    'id' => $rec->id,
                    'open_time' => substr($rec->open_time, 0, 5),
                    'close_time' => substr($rec->close_time, 0, 5),
                    'is_closed' => (bool) $rec->is_closed,
                    'label' => $rec->label,
                    'is_overnight' => (bool) $rec->is_overnight,
                ];
            }

            $isDayClosed = $dayRecords->isEmpty() || ($dayRecords->every(fn($r) => $r->is_closed));

            $weeklyHours[] = [
                'day_of_week' => $day,
                'day_name' => $emratDiteve[$day],
                'is_closed' => $isDayClosed,
                'intervals' => $intervals,
            ];
        }

        // Statistikat e produkteve dhe stokut
        $productsQuery = Product::whereHas('menuCategory', function ($q) use ($branch) {
            $q->where('restaurant_id', $branch->restaurant_id);
        });

        $totalProducts = (clone $productsQuery)->count();
        $outOfStockCount = (clone $productsQuery)->where('is_out_of_stock', true)->count();
        $unavailableCount = (clone $productsQuery)->where('is_available', false)->count();
        $trackedStockCount = (clone $productsQuery)->where('track_stock', true)->count();

        // Ditët speciale dhe pushimet (nga sot e tutje)
        $specialHours = $branch->specialOpeningHours()
            ->where('date', '>=', now()->format('Y-m-d'))
            ->orderBy('date')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'branch' => [
                    'id' => $branch->id,
                    'name' => $branch->name,
                    'address' => $branch->address,
                    'city' => $branch->city,
                    'phone' => $branch->phone,
                    'is_active' => (bool) $branch->is_active,
                    'is_temporarily_closed' => (bool) $branch->is_temporarily_closed,
                    'paused_until' => $branch->paused_until?->toIso8601String(),
                    'pause_reason' => $branch->pause_reason,
                    'busy_mode' => (bool) $branch->busy_mode,
                    'default_prep_time_minutes' => (int) $branch->default_prep_time_minutes,
                    'current_prep_time_minutes' => $branch->current_prep_time_minutes,
                    'effective_prep_time' => $branch->effectivePrepTime(),
                    'accepts_delivery' => (bool) $branch->accepts_delivery,
                    'accepts_pickup' => (bool) $branch->accepts_pickup,
                    'timezone' => $branch->timezone,
                    'restaurant' => [
                        'id' => $branch->restaurant?->id,
                        'name' => $branch->restaurant?->name,
                        'slug' => $branch->restaurant?->slug,
                    ],
                ],
                'availability' => $availability,
                'weekly_schedule' => $weeklyHours,
                'special_hours' => $specialHours,
                'stock_metrics' => [
                    'total_products' => $totalProducts,
                    'out_of_stock_count' => $outOfStockCount,
                    'unavailable_count' => $unavailableCount,
                    'tracked_stock_count' => $trackedStockCount,
                ]
            ]
        ]);
    }

    /**
     * Përditëson orarin javor të punës me mbështetje për intervale të shumëfishta dhe orare nate.
     */
    public function updateOpeningHours($branchId, Request $request): JsonResponse
    {
        $branch = Branch::findOrFail($branchId);
        $this->authorizeBranchManagement($branch, $request);

        $validated = $request->validate([
            'schedule' => 'required|array',
            'schedule.*.day_of_week' => 'required|integer|between:0,6',
            'schedule.*.is_closed' => 'required|boolean',
            'schedule.*.intervals' => 'nullable|array',
            'schedule.*.intervals.*.open_time' => 'required_with:schedule.*.intervals|string',
            'schedule.*.intervals.*.close_time' => 'required_with:schedule.*.intervals|string',
            'schedule.*.intervals.*.label' => 'nullable|string|max:100',
            'schedule.*.intervals.*.is_overnight' => 'nullable|boolean',
        ]);

        DB::transaction(function () use ($branch, $validated) {
            foreach ($validated['schedule'] as $dayData) {
                $dayOfWeek = (int) $dayData['day_of_week'];
                $isClosed = (bool) $dayData['is_closed'];

                // Fshijmë intervalet e mëparshme për këtë ditë
                OpeningHour::where('branch_id', $branch->id)
                    ->where('day_of_week', $dayOfWeek)
                    ->delete();

                if ($isClosed || empty($dayData['intervals'])) {
                    // Krijojmë një regjistër të mbyllur
                    OpeningHour::create([
                        'branch_id' => $branch->id,
                        'day_of_week' => $dayOfWeek,
                        'open_time' => '00:00:00',
                        'close_time' => '00:00:00',
                        'is_closed' => true,
                        'label' => 'Mbyllur',
                        'is_overnight' => false,
                        'sort_order' => 0,
                    ]);
                } else {
                    $order = 0;
                    foreach ($dayData['intervals'] as $interval) {
                        $open = $interval['open_time'];
                        $close = $interval['close_time'];
                        if (strlen($open) === 5) $open .= ':00';
                        if (strlen($close) === 5) $close .= ':00';

                        $isOvernight = !empty($interval['is_overnight']) || ($close < $open);

                        OpeningHour::create([
                            'branch_id' => $branch->id,
                            'day_of_week' => $dayOfWeek,
                            'open_time' => $open,
                            'close_time' => $close,
                            'is_closed' => false,
                            'label' => $interval['label'] ?? null,
                            'is_overnight' => $isOvernight,
                            'sort_order' => $order++,
                        ]);
                    }
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Orari javor u përditësua me sukses.',
            'availability' => $this->availabilityService->getBranchAvailability($branch),
        ]);
    }

    /**
     * Pauzon ose rihap pranimin e porosive për degën (Përkohësisht i Mbyllur).
     */
    public function updateTemporaryClosure($branchId, Request $request): JsonResponse
    {
        $branch = Branch::findOrFail($branchId);
        $this->authorizeBranchManagement($branch, $request);

        $validated = $request->validate([
            'action' => 'required|in:pause,reopen',
            'reason' => 'nullable|string|max:255',
            'duration_minutes' => 'nullable|integer|min:5|max:1440',
        ]);

        if ($validated['action'] === 'pause') {
            $duration = $validated['duration_minutes'] ?? null;
            $pausedUntil = $duration ? now()->addMinutes($duration) : null;
            $reason = $validated['reason'] ?: 'Pauzë e përkohshme operative nga menaxheri.';

            $branch->update([
                'is_temporarily_closed' => true,
                'paused_until' => $pausedUntil,
                'pause_reason' => $reason,
            ]);

            $message = 'Pranimi i porosive u pauzua me sukses.';
        } else {
            $branch->update([
                'is_temporarily_closed' => false,
                'paused_until' => null,
                'pause_reason' => null,
            ]);

            $message = 'Dega u rihap me sukses për pranimin e porosive.';
        }

        return response()->json([
            'success' => true,
            'message' => $message,
            'availability' => $this->availabilityService->getBranchAvailability($branch),
        ]);
    }

    /**
     * Konfigurimi i kohës së përgatitjes dhe modalitetit të pikut (busy mode).
     */
    public function updatePrepTime($branchId, Request $request): JsonResponse
    {
        $branch = Branch::findOrFail($branchId);
        $this->authorizeBranchManagement($branch, $request);

        $validated = $request->validate([
            'default_prep_time_minutes' => 'nullable|integer|min:5|max:180',
            'current_prep_time_minutes' => 'nullable|integer|min:5|max:180',
            'busy_mode' => 'nullable|boolean',
            'accepts_delivery' => 'nullable|boolean',
            'accepts_pickup' => 'nullable|boolean',
        ]);

        $updateData = [];

        if (array_key_exists('default_prep_time_minutes', $validated) && $validated['default_prep_time_minutes'] !== null) {
            $updateData['default_prep_time_minutes'] = $validated['default_prep_time_minutes'];
        }

        if (array_key_exists('current_prep_time_minutes', $validated)) {
            $updateData['current_prep_time_minutes'] = $validated['current_prep_time_minutes'];
        }

        if (array_key_exists('busy_mode', $validated)) {
            $updateData['busy_mode'] = (bool) $validated['busy_mode'];
            // Nëse aktivizohet busy mode dhe nuk është dhënë current_prep_time, shtojmë +15 min te baza
            if ($updateData['busy_mode'] && empty($updateData['current_prep_time_minutes'])) {
                $base = $branch->default_prep_time_minutes ?: 20;
                $updateData['current_prep_time_minutes'] = $base + 15;
            } elseif (!$updateData['busy_mode']) {
                $updateData['current_prep_time_minutes'] = null;
            }
        }

        if (array_key_exists('accepts_delivery', $validated)) {
            $updateData['accepts_delivery'] = (bool) $validated['accepts_delivery'];
        }

        if (array_key_exists('accepts_pickup', $validated)) {
            $updateData['accepts_pickup'] = (bool) $validated['accepts_pickup'];
        }

        $branch->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Cilësimet e përgatitjes dhe shërbimit u ruajtën me sukses.',
            'data' => [
                'default_prep_time_minutes' => $branch->default_prep_time_minutes,
                'current_prep_time_minutes' => $branch->current_prep_time_minutes,
                'busy_mode' => (bool) $branch->busy_mode,
                'effective_prep_time' => $branch->effectivePrepTime(),
                'accepts_delivery' => (bool) $branch->accepts_delivery,
                'accepts_pickup' => (bool) $branch->accepts_pickup,
            ]
        ]);
    }

    /**
     * Merr oraret speciale dhe pushimet e konfiguruara për degën.
     */
    public function getSpecialHours($branchId, Request $request): JsonResponse
    {
        $branch = Branch::findOrFail($branchId);
        $this->authorizeBranchManagement($branch, $request);

        $specialHours = SpecialOpeningHour::where('branch_id', $branch->id)
            ->orderBy('date', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $specialHours,
        ]);
    }

    /**
     * Krijon ose përditëson një orar special / festë për një datë të caktuar.
     */
    public function saveSpecialHour($branchId, Request $request): JsonResponse
    {
        $branch = Branch::findOrFail($branchId);
        $this->authorizeBranchManagement($branch, $request);

        $validated = $request->validate([
            'id' => 'nullable|integer|exists:special_opening_hours,id',
            'date' => 'required|date',
            'is_closed' => 'required|boolean',
            'open_time' => 'nullable|required_if:is_closed,false|string',
            'close_time' => 'nullable|required_if:is_closed,false|string',
            'reason_or_occasion' => 'nullable|string|max:255',
        ]);

        $openTime = $validated['open_time'] ?? null;
        $closeTime = $validated['close_time'] ?? null;
        if ($openTime && strlen($openTime) === 5) $openTime .= ':00';
        if ($closeTime && strlen($closeTime) === 5) $closeTime .= ':00';

        if (!empty($validated['id'])) {
            $specialHour = SpecialOpeningHour::where('branch_id', $branch->id)->findOrFail($validated['id']);
            $specialHour->update([
                'date' => $validated['date'],
                'open_time' => $openTime,
                'close_time' => $closeTime,
                'is_closed' => (bool) $validated['is_closed'],
                'reason_or_occasion' => $validated['reason_or_occasion'] ?? 'Orar Festash',
            ]);
        } else {
            // Kontrollojmë nëse ekziston tashmë për këtë datë
            $specialHour = SpecialOpeningHour::updateOrCreate(
                [
                    'branch_id' => $branch->id,
                    'date' => $validated['date'],
                ],
                [
                    'open_time' => $openTime,
                    'close_time' => $closeTime,
                    'is_closed' => (bool) $validated['is_closed'],
                    'reason_or_occasion' => $validated['reason_or_occasion'] ?? 'Orar Festash',
                ]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Orari special / festa u ruajt me sukses.',
            'data' => $specialHour,
            'availability' => $this->availabilityService->getBranchAvailability($branch),
        ]);
    }

    /**
     * Fshin një orar special të konfiguruar.
     */
    public function deleteSpecialHour($branchId, $specialHourId, Request $request): JsonResponse
    {
        $branch = Branch::findOrFail($branchId);
        $this->authorizeBranchManagement($branch, $request);

        $specialHour = SpecialOpeningHour::where('branch_id', $branch->id)->findOrFail($specialHourId);
        $specialHour->delete();

        return response()->json([
            'success' => true,
            'message' => 'Orari special u fshi me sukses.',
            'availability' => $this->availabilityService->getBranchAvailability($branch),
        ]);
    }

    /**
     * Merr listën e produkteve për menaxhimin e disponueshmërisë dhe stokut.
     */
    public function getBranchProducts($branchId, Request $request): JsonResponse
    {
        $branch = Branch::findOrFail($branchId);
        $this->authorizeBranchManagement($branch, $request);

        $query = Product::with(['menuCategory'])
            ->whereHas('menuCategory', function ($q) use ($branch) {
                $q->where('restaurant_id', $branch->restaurant_id);
            });

        if ($request->filled('search')) {
            $term = trim($request->search);
            $query->where('name', 'like', "%{$term}%");
        }

        if ($request->filled('category_id')) {
            $query->where('menu_category_id', $request->category_id);
        }

        if ($request->filled('filter')) {
            if ($request->filter === 'out_of_stock') {
                $query->where('is_out_of_stock', true);
            } elseif ($request->filter === 'unavailable') {
                $query->where('is_available', false);
            } elseif ($request->filter === 'tracked') {
                $query->where('track_stock', true);
            }
        }

        $products = $query->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $products,
        ]);
    }

    /**
     * Përditëson disponueshmërinë dhe stokun e një produkti.
     */
    public function updateProductAvailability($productId, Request $request): JsonResponse
    {
        $product = Product::with('menuCategory.restaurant')->findOrFail($productId);
        $user = $request->user();

        // Verifikohet autorizimi (super_admin, owner ose branch_manager)
        if (!$user->isSuperAdmin()) {
            if ($user->isOwner()) {
                if ($product->menuCategory?->restaurant?->owner_user_id !== $user->id) {
                    abort(403, 'Nuk keni autorizim për produktet e këtij restoranti.');
                }
            } elseif ($user->isBranchManager()) {
                $hasBranchAccess = $user->staffMemberships()
                    ->whereHas('branch', function ($q) use ($product) {
                        $q->where('restaurant_id', $product->menuCategory?->restaurant_id);
                    })
                    ->where('is_active', true)
                    ->exists();

                if (!$hasBranchAccess) {
                    abort(403, 'Nuk keni autorizim për këtë restorant.');
                }
            } else {
                abort(403, 'Nuk keni leje për të ndryshuar disponueshmërinë e produkteve.');
            }
        }

        $validated = $request->validate([
            'is_available' => 'nullable|boolean',
            'track_stock' => 'nullable|boolean',
            'stock_quantity' => 'nullable|integer|min:0',
            'is_out_of_stock' => 'nullable|boolean',
            'temporary_unavailable_reason' => 'nullable|string|max:255',
        ]);

        $updateData = [];

        if (array_key_exists('is_available', $validated)) {
            $updateData['is_available'] = (bool) $validated['is_available'];
        }

        if (array_key_exists('track_stock', $validated)) {
            $updateData['track_stock'] = (bool) $validated['track_stock'];
        }

        if (array_key_exists('stock_quantity', $validated)) {
            $updateData['stock_quantity'] = $validated['stock_quantity'];
            // Nëse sasia bëhet 0, automatikisht vendoset out of stock
            if ($validated['stock_quantity'] === 0) {
                $updateData['is_out_of_stock'] = true;
            } elseif ($validated['stock_quantity'] > 0 && empty($validated['is_out_of_stock'])) {
                $updateData['is_out_of_stock'] = false;
            }
        }

        if (array_key_exists('is_out_of_stock', $validated)) {
            $updateData['is_out_of_stock'] = (bool) $validated['is_out_of_stock'];
        }

        if (array_key_exists('temporary_unavailable_reason', $validated)) {
            $updateData['temporary_unavailable_reason'] = $validated['temporary_unavailable_reason'];
        }

        $product->update($updateData);

        return response()->json([
            'success' => true,
            'message' => "Disponueshmëria e artikullit '{$product->name}' u përditësua me sukses.",
            'data' => $product->fresh(),
        ]);
    }
}
