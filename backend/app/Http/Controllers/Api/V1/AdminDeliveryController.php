<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Courier;
use App\Models\Delivery;
use App\Models\DeliveryZone;
use App\Models\User;
use App\Services\DeliveryAssignmentService;
use App\Services\DeliveryLifecycleService;
use App\Services\DeliveryZoneService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminDeliveryController extends Controller
{
    protected DeliveryAssignmentService $assignmentService;
    protected DeliveryLifecycleService $lifecycleService;
    protected DeliveryZoneService $zoneService;

    public function __construct(
        DeliveryAssignmentService $assignmentService,
        DeliveryLifecycleService $lifecycleService,
        DeliveryZoneService $zoneService
    ) {
        $this->assignmentService = $assignmentService;
        $this->lifecycleService = $lifecycleService;
        $this->zoneService = $zoneService;
    }

    // =========================================================================
    // MENAXHIMI I KORRIERËVE
    // =========================================================================

    public function couriersIndex(Request $request)
    {
        $query = Courier::with(['user', 'branch'])
            ->withCount('activeDeliveries');

        if ($request->filled('availability_status') && $request->availability_status !== 'all') {
            $query->where('availability_status', $request->availability_status);
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        $couriers = $query->orderByRaw("FIELD(availability_status, 'available', 'busy', 'offline')")
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $couriers,
        ]);
    }

    public function courierStore(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
            'phone' => 'required|string|max:50',
            'branch_id' => 'nullable|exists:branches,id',
            'vehicle_type' => 'required|string|in:bicycle,scooter,car,on_foot',
            'license_plate' => 'nullable|string|max:50',
            'max_concurrent_deliveries' => 'nullable|integer|min:1|max:5',
            'notes' => 'nullable|string|max:1000',
        ]);

        $courier = DB::transaction(function () use ($validated) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'phone' => $validated['phone'],
                'role' => 'courier',
                'is_active' => true,
                'email_verified_at' => Carbon::now(),
            ]);

            return Courier::create([
                'user_id' => $user->id,
                'branch_id' => $validated['branch_id'] ?? null,
                'vehicle_type' => $validated['vehicle_type'],
                'license_plate' => $validated['license_plate'] ?? null,
                'availability_status' => 'offline',
                'is_active' => true,
                'max_concurrent_deliveries' => $validated['max_concurrent_deliveries'] ?? 2,
                'notes' => $validated['notes'] ?? null,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Korrieri u regjistrua me sukses.',
            'data' => $courier->load(['user', 'branch'])->loadCount('activeDeliveries'),
        ], 201);
    }

    public function courierUpdate(int $id, Request $request)
    {
        $courier = Courier::with('user')->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:50',
            'branch_id' => 'nullable|exists:branches,id',
            'vehicle_type' => 'sometimes|string|in:bicycle,scooter,car,on_foot',
            'license_plate' => 'nullable|string|max:50',
            'availability_status' => 'sometimes|string|in:available,busy,offline',
            'is_active' => 'sometimes|boolean',
            'max_concurrent_deliveries' => 'sometimes|integer|min:1|max:5',
            'notes' => 'nullable|string|max:1000',
        ]);

        DB::transaction(function () use ($courier, $validated) {
            if ($courier->user) {
                $userUpdates = [];
                if (isset($validated['name'])) $userUpdates['name'] = $validated['name'];
                if (isset($validated['phone'])) $userUpdates['phone'] = $validated['phone'];
                if (isset($validated['is_active'])) $userUpdates['is_active'] = $validated['is_active'];
                if (!empty($userUpdates)) {
                    $courier->user->update($userUpdates);
                }
            }

            $courierUpdates = collect($validated)->only([
                'branch_id',
                'vehicle_type',
                'license_plate',
                'availability_status',
                'is_active',
                'max_concurrent_deliveries',
                'notes',
            ])->toArray();

            if (isset($validated['is_active']) && !$validated['is_active']) {
                $courierUpdates['availability_status'] = 'offline';
            }

            $courier->update($courierUpdates);
        });

        return response()->json([
            'success' => true,
            'message' => 'Të dhënat e korrierit u përditësuan.',
            'data' => $courier->fresh(['user', 'branch'])->loadCount('activeDeliveries'),
        ]);
    }

    // =========================================================================
    // DISPEÇIMI DHE MONITORIMI I DËRGESAVE
    // =========================================================================

    public function deliveriesIndex(Request $request)
    {
        $this->assignmentService->processExpiredAssignments();

        $query = Delivery::with([
            'order.items',
            'branch',
            'courier.user',
            'deliveryZone',
            'statusHistory.changedBy',
        ]);

        if ($request->filled('status') && $request->status !== 'all') {
            if ($request->status === 'active') {
                $query->whereIn('status', Delivery::ACTIVE_STATUSES);
            } else {
                $query->where('status', $request->status);
            }
        }

        if ($request->filled('courier_id')) {
            $query->where('courier_id', $request->courier_id);
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if (filter_var($request->query('unassigned_only', false), FILTER_VALIDATE_BOOLEAN)) {
            $query->where('status', 'pending_assignment');
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $s = '%' . trim($request->search) . '%';
            $query->where(function ($q) use ($s) {
                $q->where('dropoff_address', 'like', $s)
                  ->orWhereHas('order', fn($oq) => $oq->where('order_number', 'like', $s)
                      ->orWhere('customer_name', 'like', $s)
                      ->orWhere('customer_phone', 'like', $s));
            });
        }

        $perPage = min(50, max(5, (int) $request->query('per_page', 20)));
        $deliveries = $query->orderByRaw("FIELD(priority, 'urgent', 'high', 'normal')")
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        // Statistikat përmbledhëse
        $today = Carbon::today();
        $summary = [
            'pending_assignment' => Delivery::where('status', 'pending_assignment')->count(),
            'active_in_transit' => Delivery::whereIn('status', [
                'assigned', 'accepted', 'heading_to_restaurant', 'arrived_at_restaurant', 'picked_up', 'heading_to_customer', 'arrived_at_customer'
            ])->count(),
            'delivered_today' => Delivery::where('status', 'delivered')->whereDate('delivered_at', $today)->count(),
            'failed_today' => Delivery::where('status', 'failed')->whereDate('failed_at', $today)->count(),
            'available_couriers' => Courier::where('is_active', true)->where('availability_status', 'available')->count(),
            'busy_couriers' => Courier::where('is_active', true)->where('availability_status', 'busy')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $deliveries->items(),
            'meta' => [
                'current_page' => $deliveries->currentPage(),
                'last_page' => $deliveries->lastPage(),
                'total' => $deliveries->total(),
            ],
            'summary' => $summary,
        ]);
    }

    public function deliveriesSync()
    {
        $activeCount = Delivery::whereIn('status', Delivery::ACTIVE_STATUSES)->count();
        $pendingCount = Delivery::where('status', 'pending_assignment')->count();
        $latest = Delivery::latest('updated_at')->first(['id', 'status', 'updated_at']);
        $courierLatest = Courier::latest('last_location_at')->first(['id', 'last_location_at']);

        $checksum = md5(
            $activeCount . '_' . $pendingCount . '_' . ($latest?->id ?? 0) . '_' . ($latest?->status ?? '') . '_' . ($latest?->updated_at ?? '') . '_' . ($courierLatest?->last_location_at ?? '')
        );

        return response()->json([
            'success' => true,
            'data' => [
                'active_count' => $activeCount,
                'pending_assignment' => $pendingCount,
                'checksum' => $checksum,
            ],
        ]);
    }

    public function deliveryShow(int $id)
    {
        $delivery = Delivery::with([
            'order.items.options',
            'branch',
            'courier.user',
            'deliveryZone',
            'statusHistory.changedBy',
            'locations',
        ])->findOrFail($id);

        $delivery->eta_minutes = $this->lifecycleService->calculateEtaMinutes($delivery);

        return response()->json([
            'success' => true,
            'data' => $delivery,
        ]);
    }

    public function assignManual(int $id, Request $request)
    {
        $validated = $request->validate([
            'courier_id' => 'required|integer|exists:couriers,id',
            'force_reassign' => 'nullable|boolean',
        ]);

        $delivery = Delivery::findOrFail($id);

        $updated = $this->assignmentService->manualAssign(
            $delivery,
            (int) $validated['courier_id'],
            $request->user()->id,
            (bool) ($validated['force_reassign'] ?? false)
        );

        return response()->json([
            'success' => true,
            'message' => 'Korrieri u caktua me sukses.',
            'data' => $updated,
        ]);
    }

    public function assignAuto(int $id, Request $request)
    {
        $delivery = Delivery::findOrFail($id);

        $assigned = $this->assignmentService->autoAssign($delivery, $request->user()->id);

        if (!$assigned) {
            return response()->json([
                'success' => false,
                'message' => 'Nuk u gjet asnjë korrier i lirë aktualisht për caktim automatik.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Korrieri u caktua automatikisht me sukses.',
            'data' => $assigned,
        ]);
    }

    public function updateStatus(int $id, Request $request)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:pending_assignment,accepted,heading_to_restaurant,arrived_at_restaurant,picked_up,heading_to_customer,arrived_at_customer,delivered,failed,cancelled',
            'failure_reason' => 'nullable|string|max:500',
            'incident_type' => 'nullable|string|max:80',
            'delivery_notes' => 'nullable|string|max:1000',
            'notes' => 'nullable|string|max:500',
        ]);

        $delivery = Delivery::findOrFail($id);

        $updated = $this->lifecycleService->transitionStatus(
            $delivery,
            $validated['status'],
            $request->user(),
            $validated
        );

        return response()->json([
            'success' => true,
            'message' => 'Statusi i dërgesës u përditësua.',
            'data' => $updated,
        ]);
    }

    // =========================================================================
    // ZONAT E DËRGESËS
    // =========================================================================

    public function publicBranchZones(int $branchId)
    {
        Branch::findOrFail($branchId);
        $zones = $this->zoneService->getZonesForBranch($branchId, true);

        return response()->json([
            'success' => true,
            'data' => $zones,
        ]);
    }

    public function zonesIndex(Request $request)
    {
        $query = DeliveryZone::with('branch')->orderBy('branch_id')->orderBy('sort_order')->orderBy('name');

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        return response()->json([
            'success' => true,
            'data' => $query->get(),
        ]);
    }

    public function zoneStore(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|integer|exists:branches,id',
            'name' => 'required|string|max:120',
            'city' => 'required|string|max:80',
            'description' => 'nullable|string|max:255',
            'delivery_fee' => 'required|numeric|min:0|max:100',
            'min_order_amount' => 'required|numeric|min:0|max:500',
            'estimated_delivery_minutes' => 'required|integer|min:5|max:180',
            'max_distance_km' => 'nullable|numeric|min:0.1|max:100',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);

        $zone = DeliveryZone::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Zona e dërgesës u shtua me sukses.',
            'data' => $zone->load('branch'),
        ], 201);
    }

    public function zoneUpdate(int $id, Request $request)
    {
        $zone = DeliveryZone::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:120',
            'city' => 'sometimes|string|max:80',
            'description' => 'nullable|string|max:255',
            'delivery_fee' => 'sometimes|numeric|min:0|max:100',
            'min_order_amount' => 'sometimes|numeric|min:0|max:500',
            'estimated_delivery_minutes' => 'sometimes|integer|min:5|max:180',
            'max_distance_km' => 'nullable|numeric|min:0.1|max:100',
            'is_active' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer',
        ]);

        $zone->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Zona e dërgesës u përditësua me sukses.',
            'data' => $zone->fresh('branch'),
        ]);
    }

    public function zoneDestroy(int $id)
    {
        $zone = DeliveryZone::findOrFail($id);
        $zone->delete();

        return response()->json([
            'success' => true,
            'message' => 'Zona e dërgesës u fshi me sukses.',
        ]);
    }
}
