<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\FinancialSetting;
use App\Models\Order;
use App\Models\Refund;
use App\Models\Restaurant;
use App\Models\RestaurantCommission;
use App\Models\RestaurantPayout;
use App\Models\StaffMembership;
use App\Services\FinancialService;
use Illuminate\Http\Request;

class FinanceController extends Controller
{
    public function __construct(protected FinancialService $financialService) {}

    /**
     * Super Admin Financial Dashboard.
     */
    public function adminDashboard(Request $request)
    {
        $data = $this->financialService->getSuperAdminDashboard($request->only(['period', 'date_from', 'date_to']));
        $restaurants = Restaurant::orderBy('name')->get(['id', 'name', 'commission_rate', 'status']);

        return response()->json([
            'success' => true,
            'data' => $data,
            'restaurants' => $restaurants,
        ]);
    }

    /**
     * Historia e centralizuar e transaksioneve (e izoluar sipas rolit/restorantit).
     */
    public function transactions(Request $request)
    {
        $user = $request->user();
        $scopedRestaurantId = null;

        if (in_array($user->role, ['owner', 'branch_manager'], true)) {
            $scopedRestaurantId = $this->resolveUserRestaurantId($user);
            if (!$scopedRestaurantId) {
                return response()->json(['success' => false, 'message' => 'Nuk u gjet restoranti i autorizuar.'], 403);
            }
        }

        $paginated = $this->financialService->getTransactions(
            $request->only(['period', 'date_from', 'date_to', 'type', 'status', 'payment_method', 'restaurant_id', 'search', 'per_page']),
            $scopedRestaurantId
        );

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
     * Restaurant Owner / Branch Manager Financial Dashboard.
     */
    public function restaurantDashboard(Request $request)
    {
        $user = $request->user();
        $restaurantId = null;

        if (in_array($user->role, ['super_admin', 'admin'], true) && $request->filled('restaurant_id')) {
            $restaurantId = (int) $request->query('restaurant_id');
        } else {
            $restaurantId = $this->resolveUserRestaurantId($user);
        }

        if (!$restaurantId) {
            return response()->json(['success' => false, 'message' => 'Nuk u gjet restoranti për këtë përdorues.'], 403);
        }

        $restaurant = Restaurant::findOrFail($restaurantId);
        $data = $this->financialService->getRestaurantDashboard(
            $restaurantId,
            $request->only(['period', 'date_from', 'date_to'])
        );

        return response()->json([
            'success' => true,
            'restaurant' => $restaurant,
            'data' => $data,
        ]);
    }

    /**
     * Lista e komisioneve & konfigurimi i tarifave.
     */
    public function commissionsIndex(Request $request)
    {
        $user = $request->user();
        $query = RestaurantCommission::with(['order', 'restaurant', 'branch']);

        if (in_array($user->role, ['owner', 'branch_manager'], true)) {
            $rid = $this->resolveUserRestaurantId($user);
            if (!$rid) {
                return response()->json(['success' => false, 'message' => 'I paautorizuar.'], 403);
            }
            $query->where('restaurant_id', $rid);
        } elseif ($request->filled('restaurant_id')) {
            $query->where('restaurant_id', $request->query('restaurant_id'));
        }

        $commissions = $query->orderByDesc('created_at')->paginate(20);
        $restaurants = in_array($user->role, ['super_admin', 'admin'], true)
            ? Restaurant::orderBy('name')->get(['id', 'name', 'commission_rate'])
            : [];

        return response()->json([
            'success' => true,
            'default_commission_rate' => (float) $this->financialService->getDefaultCommissionRate(),
            'restaurants' => $restaurants,
            'data' => $commissions->items(),
            'meta' => [
                'current_page' => $commissions->currentPage(),
                'last_page' => $commissions->lastPage(),
                'total' => $commissions->total(),
            ],
        ]);
    }

    public function updateCommissionSettings(Request $request)
    {
        $validated = $request->validate([
            'default_commission_rate' => 'nullable|numeric|min:0|max:50',
            'restaurant_id' => 'nullable|exists:restaurants,id',
            'restaurant_commission_rate' => 'nullable|numeric|min:0|max:50',
        ]);

        if (isset($validated['default_commission_rate'])) {
            FinancialSetting::setValue(
                'default_commission_rate',
                number_format((float) $validated['default_commission_rate'], 2, '.', ''),
                $request->user()->id
            );
        }

        if (!empty($validated['restaurant_id'])) {
            $restaurant = Restaurant::findOrFail($validated['restaurant_id']);
            $restaurant->update([
                'commission_rate' => $validated['restaurant_commission_rate'] !== null
                    ? number_format((float) $validated['restaurant_commission_rate'], 2, '.', '')
                    : null,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Konfigurimi i komisioneve u përditësua me sukses.',
            'default_commission_rate' => (float) $this->financialService->getDefaultCommissionRate(),
        ]);
    }

    /**
     * Rimbursimet (Full & Partial Simulated Refunds).
     */
    public function refundsIndex(Request $request)
    {
        $user = $request->user();
        $query = Refund::with(['order', 'payment', 'restaurant', 'requestedBy', 'approvedBy']);

        if (in_array($user->role, ['owner', 'branch_manager'], true)) {
            $rid = $this->resolveUserRestaurantId($user);
            $query->where('restaurant_id', $rid ?: 0);
        }

        $refunds = $query->orderByDesc('created_at')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $refunds->items(),
            'meta' => [
                'current_page' => $refunds->currentPage(),
                'last_page' => $refunds->lastPage(),
                'total' => $refunds->total(),
            ],
        ]);
    }

    public function storeRefund(Request $request)
    {
        $validated = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'amount' => 'required|numeric|min:0.01',
            'type' => 'nullable|string|in:full,partial',
            'reason' => 'required|string|min:3|max:500',
        ]);

        $user = $request->user();
        $order = Order::with('branch')->findOrFail($validated['order_id']);

        // Kontroll pronësie nëse është menaxher/pronar restoranti
        if (in_array($user->role, ['owner', 'branch_manager'], true)) {
            $rid = $this->resolveUserRestaurantId($user);
            if ($order->branch?->restaurant_id !== $rid) {
                return response()->json(['success' => false, 'message' => 'Nuk keni autorizim për këtë porosi.'], 403);
            }
        }

        $autoComplete = in_array($user->role, ['super_admin', 'admin'], true);
        $refund = $this->financialService->createRefund(
            $order,
            (float) $validated['amount'],
            $validated['reason'],
            $user,
            $validated['type'] ?? 'full',
            $autoComplete
        );

        return response()->json([
            'success' => true,
            'message' => $autoComplete
                ? 'Rimbursimi i simuluar u aprovua dhe u regjistrua.'
                : 'Kërkesa për rimbursim u dërgua për miratim.',
            'data' => $refund,
        ], 201);
    }

    public function refundDecision(int $id, Request $request)
    {
        $validated = $request->validate([
            'decision' => 'required|string|in:approve,reject',
            'admin_notes' => 'nullable|string|max:500',
        ]);

        $refund = Refund::findOrFail($id);
        $updated = $this->financialService->processRefundDecision(
            $refund,
            $validated['decision'],
            $request->user(),
            $validated['admin_notes'] ?? null
        );

        return response()->json([
            'success' => true,
            'message' => $validated['decision'] === 'approve'
                ? 'Rimbursimi i simuluar u miratua.'
                : 'Kërkesa për rimbursim u refuzua.',
            'data' => $updated,
        ]);
    }

    /**
     * Pagesat e Restoranteve (Simulated Payouts).
     */
    public function payoutsIndex(Request $request)
    {
        $user = $request->user();
        $query = RestaurantPayout::with(['restaurant', 'createdBy', 'completedBy']);

        if (in_array($user->role, ['owner', 'branch_manager'], true)) {
            $rid = $this->resolveUserRestaurantId($user);
            $query->where('restaurant_id', $rid ?: 0);
        } elseif ($request->filled('restaurant_id')) {
            $query->where('restaurant_id', $request->query('restaurant_id'));
        }

        $payouts = $query->orderByDesc('created_at')->paginate(20);
        $balances = [];

        if (in_array($user->role, ['super_admin', 'admin'], true)) {
            $balances = Restaurant::orderBy('name')->get()->map(function ($r) {
                return array_merge(['name' => $r->name], $this->financialService->getRestaurantBalance($r->id));
            });
        }

        return response()->json([
            'success' => true,
            'data' => $payouts->items(),
            'balances' => $balances,
            'meta' => [
                'current_page' => $payouts->currentPage(),
                'last_page' => $payouts->lastPage(),
                'total' => $payouts->total(),
            ],
        ]);
    }

    public function storePayout(Request $request)
    {
        $validated = $request->validate([
            'restaurant_id' => 'required|exists:restaurants,id',
            'amount' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string|max:500',
        ]);

        $payout = $this->financialService->createPayout(
            (int) $validated['restaurant_id'],
            (float) $validated['amount'],
            $request->user(),
            $validated['notes'] ?? null
        );

        return response()->json([
            'success' => true,
            'message' => 'Pagesa e simuluar për restorantin u krijua (në pritje).',
            'data' => $payout,
        ], 201);
    }

    public function completePayout(int $id, Request $request)
    {
        $payout = RestaurantPayout::findOrFail($id);
        $completed = $this->financialService->completePayout($payout, $request->user());

        return response()->json([
            'success' => true,
            'message' => 'Pagesa e simuluar u shënua si e përfunduar.',
            'data' => $completed,
        ]);
    }

    public function cancelPayout(int $id, Request $request)
    {
        $payout = RestaurantPayout::findOrFail($id);
        $cancelled = $this->financialService->cancelPayout($payout, $request->user());

        return response()->json([
            'success' => true,
            'message' => 'Pagesa e simuluar u anulua.',
            'data' => $cancelled,
        ]);
    }

    public function storeAdjustment(Request $request)
    {
        $validated = $request->validate([
            'restaurant_id' => 'nullable|exists:restaurants,id',
            'courier_id' => 'nullable|exists:couriers,id',
            'order_id' => 'nullable|exists:orders,id',
            'amount' => 'required|numeric|not_in:0',
            'reason' => 'required|string|min:3|max:500',
        ]);

        $adjustment = $this->financialService->createAdjustment($validated, $request->user());

        return response()->json([
            'success' => true,
            'message' => 'Rregullimi financiar u regjistrua.',
            'data' => $adjustment,
        ], 201);
    }

    /**
     * Fitimet e Korrierit (Vetëm për korrierin e autentikuar).
     */
    public function courierEarnings(Request $request)
    {
        $user = $request->user();
        if (!$user->courier) {
            return response()->json(['success' => false, 'message' => 'Profili i korrierit nuk u gjet.'], 404);
        }

        $data = $this->financialService->getCourierEarningsDashboard($user->courier->id);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    private function resolveUserRestaurantId($user): ?int
    {
        if ($user->role === 'owner') {
            return Restaurant::where('owner_user_id', $user->id)->value('id');
        }

        $branchId = StaffMembership::where('user_id', $user->id)
            ->where('is_active', true)
            ->value('branch_id');

        if ($branchId) {
            return Branch::where('id', $branchId)->value('restaurant_id');
        }

        return null;
    }
}
