<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Courier;
use App\Models\Delivery;
use App\Services\DeliveryAssignmentService;
use App\Services\DeliveryLifecycleService;
use Carbon\Carbon;
use Illuminate\Http\Request;

class CourierController extends Controller
{
    protected DeliveryAssignmentService $assignmentService;
    protected DeliveryLifecycleService $lifecycleService;

    public function __construct(
        DeliveryAssignmentService $assignmentService,
        DeliveryLifecycleService $lifecycleService
    ) {
        $this->assignmentService = $assignmentService;
        $this->lifecycleService = $lifecycleService;
    }

    /**
     * Merr ose krijon profilin e korrierit për përdoruesin e kyçur.
     */
    protected function resolveCourier(Request $request): Courier
    {
        $user = $request->user();
        $courier = Courier::with(['user', 'branch'])->where('user_id', $user->id)->first();

        if (!$courier) {
            $courier = Courier::create([
                'user_id' => $user->id,
                'vehicle_type' => 'scooter',
                'availability_status' => 'offline',
                'is_active' => true,
            ]);
            $courier->load(['user', 'branch']);
        }

        return $courier;
    }

    /**
     * Paneli kryesor i korrierit: profili, kërkesat e reja, dërgesa aktive, statistikat dhe historiku.
     */
    public function dashboard(Request $request)
    {
        $this->assignmentService->processExpiredAssignments();
        $courier = $this->resolveCourier($request);

        $pendingRequests = Delivery::with(['order.items.options', 'branch', 'deliveryZone'])
            ->where('courier_id', $courier->id)
            ->where('status', 'assigned')
            ->orderByRaw("FIELD(priority, 'urgent', 'high', 'normal')")
            ->orderBy('assigned_at', 'asc')
            ->get();

        $activeDeliveries = Delivery::with(['order.items.options', 'branch', 'deliveryZone', 'statusHistory'])
            ->where('courier_id', $courier->id)
            ->whereIn('status', [
                'accepted',
                'heading_to_restaurant',
                'arrived_at_restaurant',
                'picked_up',
                'heading_to_customer',
                'arrived_at_customer',
            ])
            ->orderByRaw("FIELD(priority, 'urgent', 'high', 'normal')")
            ->orderBy('accepted_at', 'asc')
            ->get()
            ->map(function (Delivery $d) {
                $d->eta_minutes = $this->lifecycleService->calculateEtaMinutes($d);
                return $d;
            });

        $today = Carbon::today();
        $todayCompleted = Delivery::where('courier_id', $courier->id)
            ->where('status', 'delivered')
            ->whereDate('delivered_at', $today)
            ->count();

        $todayEarnings = (float) Delivery::where('courier_id', $courier->id)
            ->where('status', 'delivered')
            ->whereDate('delivered_at', $today)
            ->sum('delivery_fee');

        $recentHistory = Delivery::with(['order', 'branch', 'deliveryZone'])
            ->where('courier_id', $courier->id)
            ->whereIn('status', Delivery::TERMINAL_STATUSES)
            ->orderBy('updated_at', 'desc')
            ->limit(15)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'courier' => $courier,
                'pending_requests' => $pendingRequests,
                'active_deliveries' => $activeDeliveries,
                'recent_history' => $recentHistory,
                'stats' => [
                    'today_completed' => $todayCompleted,
                    'today_earnings' => round($todayEarnings, 2),
                    'total_deliveries' => $courier->total_deliveries,
                    'successful_deliveries' => $courier->successful_deliveries,
                    'failed_deliveries' => $courier->failed_deliveries,
                    'rating_avg' => $courier->rating_avg,
                ],
            ],
        ]);
    }

    /**
     * Ndryshon disponueshmërinë e korrierit (Available / Offline).
     */
    public function updateAvailability(Request $request)
    {
        $validated = $request->validate([
            'availability_status' => 'required|string|in:available,offline',
        ]);

        $courier = $this->resolveCourier($request);

        if (!$courier->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Llogaria juaj e korrierit është e çaktivizuar nga administratori.',
            ], 403);
        }

        if ($validated['availability_status'] === 'offline') {
            $hasActive = $courier->activeDeliveries()
                ->where('status', '!=', 'assigned')
                ->exists();
            if ($hasActive) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nuk mund të kaloni Offline sa keni një dërgesë aktive në proces.',
                ], 422);
            }
        }

        $courier->update([
            'availability_status' => $validated['availability_status'],
        ]);

        return response()->json([
            'success' => true,
            'message' => $validated['availability_status'] === 'available'
                ? 'Tani jeni Online dhe gati për dërgesa.'
                : 'Tani jeni Offline.',
            'data' => $courier->fresh(['user', 'branch']),
        ]);
    }

    /**
     * Përditëson vendndodhjen reale GPS nga shfletuesi i korrierit.
     */
    public function updateLocation(Request $request)
    {
        $validated = $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'accuracy_meters' => 'nullable|numeric|min:0',
        ]);

        $courier = $this->resolveCourier($request);

        $locationData = $this->lifecycleService->updateCourierLocation(
            $courier,
            (float) $validated['latitude'],
            (float) $validated['longitude'],
            isset($validated['accuracy_meters']) ? (float) $validated['accuracy_meters'] : null
        );

        return response()->json([
            'success' => true,
            'data' => $locationData,
        ]);
    }

    /**
     * Korrieri pranon një kërkesë dërgese të caktuar.
     */
    public function acceptDelivery(int $id, Request $request)
    {
        $courier = $this->resolveCourier($request);
        $delivery = Delivery::findOrFail($id);

        $updated = $this->assignmentService->acceptAssignment($delivery, $courier);

        return response()->json([
            'success' => true,
            'message' => 'Dërgesa u pranua me sukses!',
            'data' => $updated,
        ]);
    }

    /**
     * Korrieri refuzon një kërkesë dërgese.
     */
    public function rejectDelivery(int $id, Request $request)
    {
        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $courier = $this->resolveCourier($request);
        $delivery = Delivery::findOrFail($id);

        $updated = $this->assignmentService->rejectAssignment(
            $delivery,
            $courier,
            $validated['reason'] ?? null,
            true
        );

        return response()->json([
            'success' => true,
            'message' => 'Dërgesa u refuzua dhe u kthye në dispeçim.',
            'data' => $updated,
        ]);
    }

    /**
     * Përditëson statusin e dërgesës gjatë ciklit të plotë (me dëshmi opsionale fotoje ose arsye dështimi).
     */
    public function updateDeliveryStatus(int $id, Request $request)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:heading_to_restaurant,arrived_at_restaurant,picked_up,heading_to_customer,arrived_at_customer,delivered,failed',
            'delivery_notes' => 'nullable|string|max:1000',
            'proof_recipient_name' => 'nullable|string|max:150',
            'failure_reason' => 'nullable|string|max:500',
            'incident_type' => 'nullable|string|in:customer_unavailable,wrong_address,vehicle_issue,order_damaged,other',
            'notes' => 'nullable|string|max:500',
            'proof_photo' => 'nullable|image|max:5120',
        ]);

        $delivery = Delivery::findOrFail($id);

        $proofPath = null;
        if ($request->hasFile('proof_photo')) {
            $proofPath = $request->file('proof_photo')->store('delivery-proofs', 'public');
        }

        $updated = $this->lifecycleService->transitionStatus($delivery, $validated['status'], $request->user(), [
            'delivery_notes' => $validated['delivery_notes'] ?? null,
            'proof_recipient_name' => $validated['proof_recipient_name'] ?? null,
            'proof_photo_path' => $proofPath,
            'failure_reason' => $validated['failure_reason'] ?? null,
            'incident_type' => $validated['incident_type'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Statusi i dërgesës u përditësua me sukses.',
            'data' => $updated,
        ]);
    }

    /**
     * Historiku i plotë i dërgesave të korrierit.
     */
    public function history(Request $request)
    {
        $courier = $this->resolveCourier($request);
        $perPage = min(50, max(5, (int) $request->query('per_page', 15)));

        $deliveries = Delivery::with(['order', 'branch', 'deliveryZone'])
            ->where('courier_id', $courier->id)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $deliveries->items(),
            'meta' => [
                'current_page' => $deliveries->currentPage(),
                'last_page' => $deliveries->lastPage(),
                'total' => $deliveries->total(),
            ],
        ]);
    }

    /**
     * Sinkronizim i shpejtë në kohë reale për panelin e korrierit.
     */
    public function sync(Request $request)
    {
        $courier = $this->resolveCourier($request);

        $assignedCount = Delivery::where('courier_id', $courier->id)
            ->where('status', 'assigned')
            ->count();

        $activeCount = $courier->activeDeliveries()->count();
        $latest = Delivery::where('courier_id', $courier->id)
            ->latest('updated_at')
            ->first(['id', 'updated_at', 'status']);

        $checksum = md5($assignedCount . '_' . $activeCount . '_' . ($latest?->id ?? 0) . '_' . ($latest?->status ?? '') . '_' . ($latest?->updated_at ?? ''));

        return response()->json([
            'success' => true,
            'data' => [
                'assigned_count' => $assignedCount,
                'active_count' => $activeCount,
                'checksum' => $checksum,
                'server_time' => Carbon::now()->toIso8601String(),
            ],
        ]);
    }
}
