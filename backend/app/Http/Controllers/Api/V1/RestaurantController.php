<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RestaurantController extends Controller
{
    /**
     * Display a listing of restaurants based on user role.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Restaurant::with(['owner', 'businessCategories', 'branches']);

        if ($user->role === 'owner') {
            $query->where('owner_user_id', $user->id);
        }

        $restaurants = $query->orderBy('name')->get();

        return response()->json(['data' => $restaurants]);
    }

    /**
     * Store a newly created restaurant.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'logo_url' => ['nullable', 'string', 'max:500'],
            'banner_url' => ['nullable', 'string', 'max:500'],
            'status' => ['nullable', 'in:pending,active,suspended'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['exists:business_categories,id'],
            'owner_user_id' => ['nullable', 'exists:users,id'],
        ]);

        $ownerId = ($user->role === 'super_admin' && !empty($validated['owner_user_id']))
            ? $validated['owner_user_id']
            : $user->id;

        $slugBase = Str::slug($validated['name']);
        $slug = $slugBase;
        $counter = 1;
        while (Restaurant::where('slug', $slug)->exists()) {
            $slug = "{$slugBase}-{$counter}";
            $counter++;
        }

        $restaurant = Restaurant::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'logo_url' => $validated['logo_url'] ?? null,
            'banner_url' => $validated['banner_url'] ?? null,
            'status' => $validated['status'] ?? 'active',
            'owner_user_id' => $ownerId,
        ]);

        if (!empty($validated['category_ids'])) {
            $restaurant->businessCategories()->sync($validated['category_ids']);
        }

        $restaurant->load(['owner', 'businessCategories', 'branches']);

        return response()->json([
            'message' => 'Restaurant onboarded successfully.',
            'data' => $restaurant,
        ], 201);
    }

    /**
     * Display the specified restaurant.
     */
    public function show(Restaurant $restaurant, Request $request): JsonResponse
    {
        $this->authorizeAccess($request->user(), $restaurant);

        $restaurant->load(['owner', 'businessCategories', 'branches.stations', 'branches.openingHours']);

        return response()->json(['data' => $restaurant]);
    }

    /**
     * Update the specified restaurant.
     */
    public function update(Request $request, Restaurant $restaurant): JsonResponse
    {
        $this->authorizeAccess($request->user(), $restaurant);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'logo_url' => ['nullable', 'string', 'max:500'],
            'banner_url' => ['nullable', 'string', 'max:500'],
            'status' => ['nullable', 'in:pending,active,suspended'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['exists:business_categories,id'],
        ]);

        if (isset($validated['name']) && $validated['name'] !== $restaurant->name) {
            $slugBase = Str::slug($validated['name']);
            $slug = $slugBase;
            $counter = 1;
            while (Restaurant::where('slug', $slug)->where('id', '!=', $restaurant->id)->exists()) {
                $slug = "{$slugBase}-{$counter}";
                $counter++;
            }
            $validated['slug'] = $slug;
        }

        $restaurant->update($validated);

        if (isset($validated['category_ids'])) {
            $restaurant->businessCategories()->sync($validated['category_ids']);
        }

        $restaurant->load(['owner', 'businessCategories', 'branches']);

        return response()->json([
            'message' => 'Restaurant updated successfully.',
            'data' => $restaurant,
        ]);
    }

    /**
     * Remove the specified restaurant.
     */
    public function destroy(Restaurant $restaurant, Request $request): JsonResponse
    {
        $this->authorizeAccess($request->user(), $restaurant);

        $restaurant->delete();

        return response()->json([
            'message' => 'Restaurant deleted successfully.',
        ]);
    }

    /**
     * Authorize that the authenticated user owns this restaurant or is super_admin.
     */
    protected function authorizeAccess($user, Restaurant $restaurant): void
    {
        if ($user->role !== 'super_admin' && $restaurant->owner_user_id !== $user->id) {
            abort(403, 'Unauthorized. You do not own this restaurant.');
        }
    }
}

