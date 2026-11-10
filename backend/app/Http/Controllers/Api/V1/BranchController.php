<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\OpeningHour;
use App\Models\Restaurant;
use App\Models\Station;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    /**
     * Display a listing of branches for a restaurant.
     */
    public function index(Request $request, Restaurant $restaurant): JsonResponse
    {
        $this->authorizeRestaurantAccess($request->user(), $restaurant);

        $branches = $restaurant->branches()->with(['stations', 'openingHours'])->get();

        // Append real-time open status
        $branches->each(function ($branch) {
            $branch->is_open_now = $branch->isOpenNow();
        });

        return response()->json(['data' => $branches]);
    }

    /**
     * Store a newly created branch under a restaurant.
     */
    public function store(Request $request, Restaurant $restaurant): JsonResponse
    {
        $this->authorizeRestaurantAccess($request->user(), $restaurant);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'phone' => ['required', 'string', 'max:50'],
            'is_active' => ['nullable', 'boolean'],
            'default_prep_time_minutes' => ['nullable', 'integer', 'min:5', 'max:120'],
            'slot_interval_minutes' => ['nullable', 'integer', 'in:10,15,20,30'],
            'max_orders_per_slot' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $branch = $restaurant->branches()->create([
            'name' => $validated['name'],
            'address' => $validated['address'],
            'city' => $validated['city'] ?? 'Pristina',
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'phone' => $validated['phone'],
            'is_active' => $validated['is_active'] ?? true,
            'default_prep_time_minutes' => $validated['default_prep_time_minutes'] ?? 25,
            'slot_interval_minutes' => $validated['slot_interval_minutes'] ?? 15,
            'max_orders_per_slot' => $validated['max_orders_per_slot'] ?? 6,
        ]);

        // Auto-seed default 7-day schedule (08:00 - 22:00)
        for ($day = 0; $day <= 6; $day++) {
            OpeningHour::create([
                'branch_id' => $branch->id,
                'day_of_week' => $day,
                'open_time' => '08:00:00',
                'close_time' => '22:00:00',
                'is_closed' => false,
            ]);
        }

        // Auto-create standard kitchen stations
        Station::create(['branch_id' => $branch->id, 'name' => 'Main Kitchen', 'code' => 'KITCHEN', 'is_active' => true]);
        Station::create(['branch_id' => $branch->id, 'name' => 'Packaging & Pickup', 'code' => 'PACKAGING', 'is_active' => true]);

        $branch->load(['stations', 'openingHours']);
        $branch->is_open_now = $branch->isOpenNow();

        return response()->json([
            'message' => 'Branch created successfully with default schedule and stations.',
            'data' => $branch,
        ], 201);
    }

    /**
     * Display the specified branch.
     */
    public function show(Branch $branch, Request $request): JsonResponse
    {
        $this->authorizeRestaurantAccess($request->user(), $branch->restaurant);

        $branch->load(['restaurant', 'stations', 'openingHours', 'staffMemberships.user']);
        $branch->is_open_now = $branch->isOpenNow();

        return response()->json(['data' => $branch]);
    }

    /**
     * Update the specified branch.
     */
    public function update(Request $request, Branch $branch): JsonResponse
    {
        $this->authorizeRestaurantAccess($request->user(), $branch->restaurant);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'address' => ['sometimes', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'phone' => ['sometimes', 'string', 'max:50'],
            'is_active' => ['sometimes', 'boolean'],
            'default_prep_time_minutes' => ['nullable', 'integer', 'min:5', 'max:120'],
            'slot_interval_minutes' => ['nullable', 'integer', 'in:10,15,20,30'],
            'max_orders_per_slot' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $branch->update($validated);
        $branch->load(['stations', 'openingHours']);
        $branch->is_open_now = $branch->isOpenNow();

        return response()->json([
            'message' => 'Branch updated successfully.',
            'data' => $branch,
        ]);
    }

    /**
     * Remove the specified branch.
     */
    public function destroy(Branch $branch, Request $request): JsonResponse
    {
        $this->authorizeRestaurantAccess($request->user(), $branch->restaurant);

        $branch->delete();

        return response()->json([
            'message' => 'Branch deleted successfully.',
        ]);
    }

    /**
     * Bulk update operating hours for a branch.
     */
    public function updateHours(Request $request, Branch $branch): JsonResponse
    {
        $this->authorizeRestaurantAccess($request->user(), $branch->restaurant);

        $validated = $request->validate([
            'hours' => ['required', 'array', 'size:7'],
            'hours.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'hours.*.open_time' => ['required', 'string'],
            'hours.*.close_time' => ['required', 'string'],
            'hours.*.is_closed' => ['required', 'boolean'],
        ]);

        foreach ($validated['hours'] as $hourData) {
            OpeningHour::updateOrCreate(
                ['branch_id' => $branch->id, 'day_of_week' => $hourData['day_of_week']],
                [
                    'open_time' => $hourData['open_time'],
                    'close_time' => $hourData['close_time'],
                    'is_closed' => $hourData['is_closed'],
                ]
            );
        }

        $branch->load('openingHours');
        $branch->is_open_now = $branch->isOpenNow();

        return response()->json([
            'message' => 'Weekly operating hours updated successfully.',
            'data' => $branch->openingHours,
            'is_open_now' => $branch->is_open_now,
        ]);
    }

    /**
     * Authorize that the user owns the restaurant or is super_admin or branch_manager.
     */
    protected function authorizeRestaurantAccess($user, Restaurant $restaurant): void
    {
        if ($user->role === 'super_admin') {
            return;
        }

        if ($user->role === 'owner' && $restaurant->owner_user_id === $user->id) {
            return;
        }

        if ($user->role === 'branch_manager') {
            $isManager = $user->staffMemberships()
                ->where('role', 'branch_manager')
                ->whereHas('branch', function ($q) use ($restaurant) {
                    $q->where('restaurant_id', $restaurant->id);
                })->exists();

            if ($isManager) {
                return;
            }
        }

        abort(403, 'Unauthorized to manage branches for this restaurant.');
    }
}

