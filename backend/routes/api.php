<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BranchController;
use App\Http\Controllers\Api\V1\BusinessCategoryController;
use App\Http\Controllers\Api\V1\RestaurantController;
use App\Models\Branch;
use App\Models\BusinessCategory;
use App\Models\Order;
use App\Models\Restaurant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rrugët API — Tastio (Versioni 1)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    // Kontrolli i Shëndetit & Statusi i Sistemit
    Route::get('/health', function () {
        return response()->json([
            'status' => 'ok',
            'app' => 'Tastio API',
            'version' => '1.0.0',
            'environment' => config('app.env'),
            'timestamp' => now()->toIso8601String()
        ]);
    });

    // Rrugët Publike të Dyqanit
    Route::prefix('public')->group(function () {
        Route::get('/categories', function () {
            $categories = BusinessCategory::where('is_active', true)->get();
            return response()->json(['data' => $categories]);
        });

        Route::get('/restaurants', function (Request $request) {
            $query = Restaurant::with(['branches' => function ($q) {
                $q->where('is_active', true);
            }, 'businessCategories'])->where('status', 'active');

            if ($request->has('category')) {
                $categorySlug = $request->query('category');
                $query->whereHas('businessCategories', function ($q) use ($categorySlug) {
                    $q->where('slug', $categorySlug);
                });
            }

            return response()->json(['data' => $query->get()]);
        });

        Route::get('/restaurants/{slug}', function ($slug) {
            $restaurant = Restaurant::with([
                'branches.stations',
                'branches.openingHours',
                'menuCategories.products.optionGroups.choices' => function ($q) {
                    $q->where('is_available', true);
                },
                'businessCategories'
            ])->where('slug', $slug)->where('status', 'active')->firstOrFail();

            return response()->json(['data' => $restaurant]);
        });

        Route::get('/branches/{id}/menu', function ($id) {
            $branch = Branch::with([
                'restaurant.menuCategories.products.optionGroups.choices' => function ($q) {
                    $q->where('is_available', true);
                },
                'openingHours',
                'stations'
            ])->findOrFail($id);

            return response()->json(['data' => $branch]);
        });
    });

    // Rrugët e Autentifikimit
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);

        Route::middleware('auth:sanctum')->group(function () {
            Route::get('/me', [AuthController::class, 'me']);
            Route::post('/logout', [AuthController::class, 'logout']);
        });
    });

    // Rrugët e Mbrojtura të Klientit
    Route::middleware(['auth:sanctum', 'role:customer,owner,super_admin,branch_manager,kitchen_staff,cashier'])->group(function () {
        Route::get('/orders/my-orders', function (Request $request) {
            $orders = Order::with(['branch.restaurant', 'items.options', 'payment', 'pickupToken'])
                ->where('customer_id', $request->user()->id)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json(['data' => $orders]);
        });

        Route::get('/orders/{orderNumber}/tracking', function ($orderNumber, Request $request) {
            $order = Order::with(['branch.restaurant', 'items.options', 'statusHistory', 'readyTimeHistory', 'pickupToken', 'payment'])
                ->where('order_number', $orderNumber)
                ->firstOrFail();

            if ($request->user()->role === 'customer' && $order->customer_id !== $request->user()->id) {
                return response()->json(['mesazh' => 'Nuk keni autorizim për këtë porosi.', 'message' => 'Unauthorized.'], 403);
            }

            return response()->json(['data' => $order]);
        });
    });

    // Rrugët e Mbrojtura të Stafit të Kuzhinës (KDS)
    Route::middleware(['auth:sanctum', 'role:kitchen_staff,branch_manager,super_admin'])->prefix('kds')->group(function () {
        Route::get('/tickets', function (Request $request) {
            $branchId = $request->query('branch_id');

            $query = Order::with(['customer', 'items.options', 'items.station', 'readyTimeHistory'])
                ->whereIn('status', ['confirmed', 'in_preparation']);

            if ($branchId) {
                $query->where('branch_id', $branchId);
            }

            return response()->json(['data' => $query->orderBy('created_at', 'asc')->get()]);
        });
    });

    // Rrugët e Sportelit & Arkëtarit (Verifikimi i Kodit QR)
    Route::middleware(['auth:sanctum', 'role:cashier,branch_manager,super_admin'])->prefix('counter')->group(function () {
        Route::post('/verify-qr', function (Request $request) {
            $request->validate(['token' => 'required|string']);

            $token = \App\Models\PickupToken::with(['order.customer', 'order.items.options', 'order.payment', 'order.branch'])
                ->where('token_hash', hash('sha256', $request->input('token')))
                ->first();

            if (!$token) {
                return response()->json(['mesazh' => 'Kodi QR është i pavlefshëm.', 'message' => 'Invalid QR token.'], 404);
            }

            if ($token->is_redeemed) {
                return response()->json([
                    'mesazh' => 'Ky kod është shfrytëzuar tashmë më herët.',
                    'message' => 'This token has already been redeemed.',
                    'shfrytezuar_ne' => $token->redeemed_at
                ], 409);
            }

            return response()->json([
                'vlefshem' => true,
                'valid' => true,
                'order' => $token->order,
                'short_code' => $token->short_code,
            ]);
        });
    });

    // Rrugët Administrative
    Route::middleware(['auth:sanctum', 'role:super_admin'])->prefix('admin')->group(function () {
        Route::get('/metrics', function () {
            return response()->json([
                'total_users' => \App\Models\User::count(),
                'total_restaurants' => Restaurant::count(),
                'total_branches' => Branch::count(),
                'total_orders' => Order::count(),
                'total_revenue' => Order::where('payment_status', 'paid')->sum('total_price'),
            ]);
        });
    });
});
