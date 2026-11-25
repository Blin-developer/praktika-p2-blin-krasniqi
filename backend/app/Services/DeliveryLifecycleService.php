<?php

namespace App\Services;

use App\Models\Courier;
use App\Models\CourierLocation;
use App\Models\Delivery;
use App\Models\DeliveryStatusHistory;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeliveryLifecycleService
{
    public const ALLOWED_TRANSITIONS = [
        'pending_assignment' => ['assigned', 'cancelled'],
        'assigned' => ['accepted', 'pending_assignment', 'cancelled'],
        'accepted' => ['heading_to_restaurant', 'picked_up', 'failed', 'cancelled'],
        'heading_to_restaurant' => ['arrived_at_restaurant', 'picked_up', 'failed', 'cancelled'],
        'arrived_at_restaurant' => ['picked_up', 'failed', 'cancelled'],
        'picked_up' => ['heading_to_customer', 'arrived_at_customer', 'delivered', 'failed', 'cancelled'],
        'heading_to_customer' => ['arrived_at_customer', 'delivered', 'failed', 'cancelled'],
        'arrived_at_customer' => ['delivered', 'failed', 'cancelled'],
        'delivered' => [],
        'failed' => ['pending_assignment', 'cancelled'],
        'cancelled' => [],
    ];

    protected DeliveryAssignmentService $assignmentService;

    public function __construct(DeliveryAssignmentService $assignmentService)
    {
        $this->assignmentService = $assignmentService;
    }

    /**
     * Kryen tranzicion të validuar të statusit të dërgesës dhe sinkronizon porosinë.
     */
    public function transitionStatus(Delivery $delivery, string $toStatus, User $actor, array $data = []): Delivery
    {
        return DB::transaction(function () use ($delivery, $toStatus, $actor, $data) {
            $lockedDelivery = Delivery::with(['order.payment', 'courier'])->where('id', $delivery->id)->lockForUpdate()->firstOrFail();
            $fromStatus = $lockedDelivery->status;

            if ($fromStatus === $toStatus) {
                return $lockedDelivery->fresh(['order', 'courier.user', 'branch', 'deliveryZone', 'statusHistory']);
            }

            // Kontrolli i autorizimit sipas rolit
            if ($actor->role === 'courier') {
                $courier = $actor->courier;
                if (!$courier || $lockedDelivery->courier_id !== $courier->id) {
                    throw ValidationException::withMessages([
                        'delivery' => ['Nuk keni autorizim për të përditësuar këtë dërgesë.'],
                    ]);
                }

                $courierAllowedTargets = [
                    'heading_to_restaurant',
                    'arrived_at_restaurant',
                    'picked_up',
                    'heading_to_customer',
                    'arrived_at_customer',
                    'delivered',
                    'failed',
                ];

                if (!in_array($toStatus, $courierAllowedTargets, true)) {
                    throw ValidationException::withMessages([
                        'status' => ["Korrieri nuk mund të kryejë kalimin në statusin '{$toStatus}'."],
                    ]);
                }
            } elseif (!in_array($actor->role, ['super_admin', 'admin', 'owner', 'branch_manager'], true)) {
                throw ValidationException::withMessages([
                    'role' => ['Nuk keni leje për të menaxhuar statusin e dërgesës.'],
                ]);
            }

            // Kontrolli i makinës së gjendjeve (State Machine)
            $allowedNext = self::ALLOWED_TRANSITIONS[$fromStatus] ?? [];
            if (!in_array($toStatus, $allowedNext, true)) {
                throw ValidationException::withMessages([
                    'status' => ["Tranzicioni nga '{$fromStatus}' në '{$toStatus}' nuk lejohet."],
                ]);
            }

            // Validime specifike për dorëzimin e përfunduar ose të dështuar
            if ($toStatus === 'failed' && empty($data['failure_reason'])) {
                throw ValidationException::withMessages([
                    'failure_reason' => ['Arsyeja e dështimit të dërgesës është e detyrueshme.'],
                ]);
            }

            $now = Carbon::now();
            $updates = ['status' => $toStatus];

            switch ($toStatus) {
                case 'arrived_at_restaurant':
                    $updates['arrived_at_restaurant_at'] = $now;
                    break;
                case 'picked_up':
                    $updates['picked_up_at'] = $now;
                    break;
                case 'arrived_at_customer':
                    $updates['arrived_at_customer_at'] = $now;
                    break;
                case 'delivered':
                    $updates['delivered_at'] = $now;
                    $updates['delivery_notes'] = $data['delivery_notes'] ?? $lockedDelivery->delivery_notes;
                    $updates['proof_recipient_name'] = $data['proof_recipient_name'] ?? $lockedDelivery->proof_recipient_name;
                    if (!empty($data['proof_photo_path'])) {
                        $updates['proof_photo_path'] = $data['proof_photo_path'];
                    }
                    break;
                case 'failed':
                    $updates['failed_at'] = $now;
                    $updates['failure_reason'] = $data['failure_reason'];
                    $updates['incident_type'] = $data['incident_type'] ?? 'other';
                    $updates['delivery_notes'] = $data['delivery_notes'] ?? $lockedDelivery->delivery_notes;
                    break;
                case 'cancelled':
                    $updates['cancelled_at'] = $now;
                    $updates['failure_reason'] = $data['failure_reason'] ?? 'Dërgesa u anulua.';
                    break;
                case 'pending_assignment':
                    // Rikthim në dispeçim nga 'failed'
                    $updates['courier_id'] = null;
                    $updates['failed_at'] = null;
                    break;
            }

            $lockedDelivery->update($updates);

            // Regjistrimi në historikun e dërgesës
            $courierLat = $lockedDelivery->courier?->current_latitude;
            $courierLng = $lockedDelivery->courier?->current_longitude;

            DeliveryStatusHistory::create([
                'delivery_id' => $lockedDelivery->id,
                'from_status' => $fromStatus,
                'to_status' => $toStatus,
                'changed_by_user_id' => $actor->id,
                'actor_role' => $actor->role,
                'notes' => $data['notes']
                    ?? $data['failure_reason']
                    ?? $data['delivery_notes']
                    ?? "Statusi i dërgesës kaloi në '{$toStatus}'.",
                'latitude' => $courierLat,
                'longitude' => $courierLng,
                'created_at' => $now,
            ]);

            // Sinkronizimi me porosinë dhe statistikat e korrierit
            $this->syncOrderAndCourierOnTransition($lockedDelivery, $toStatus, $actor, $now);

            return $lockedDelivery->fresh(['order', 'courier.user', 'branch', 'deliveryZone', 'statusHistory']);
        });
    }

    /**
     * Përditëson koordinatat reale GPS të korrierit dhe i ruan në histori nëse ka dërgesë aktive.
     */
    public function updateCourierLocation(Courier $courier, float $latitude, float $longitude, ?float $accuracy = null): array
    {
        $now = Carbon::now();

        $courier->update([
            'current_latitude' => $latitude,
            'current_longitude' => $longitude,
            'last_location_at' => $now,
        ]);

        $activeDelivery = $courier->activeDeliveries()
            ->whereIn('status', [
                'accepted',
                'heading_to_restaurant',
                'arrived_at_restaurant',
                'picked_up',
                'heading_to_customer',
                'arrived_at_customer',
            ])
            ->first();

        if ($activeDelivery) {
            CourierLocation::create([
                'courier_id' => $courier->id,
                'delivery_id' => $activeDelivery->id,
                'latitude' => $latitude,
                'longitude' => $longitude,
                'accuracy_meters' => $accuracy,
                'recorded_at' => $now,
            ]);
        }

        return [
            'latitude' => $latitude,
            'longitude' => $longitude,
            'last_location_at' => $now->toIso8601String(),
            'active_delivery_id' => $activeDelivery?->id,
        ];
    }

    /**
     * Llogarit kohën e parashikuar të mbërritjes (ETA) në minuta duke u bazuar vetëm në koordinata reale.
     */
    public function calculateEtaMinutes(Delivery $delivery): ?int
    {
        if (in_array($delivery->status, Delivery::TERMINAL_STATUSES, true)) {
            return 0;
        }

        $courier = $delivery->courier;
        if (!$courier || $courier->current_latitude === null || $courier->current_longitude === null) {
            return null;
        }

        // Para marrjes së porosisë: distanca korrier -> restorant -> klient
        $prePickup = in_array($delivery->status, ['assigned', 'accepted', 'heading_to_restaurant', 'arrived_at_restaurant'], true);

        if ($prePickup) {
            $toBranchKm = $this->assignmentService->haversineDistanceKm(
                $courier->current_latitude,
                $courier->current_longitude,
                $delivery->pickup_latitude,
                $delivery->pickup_longitude
            );
            $branchToCustomerKm = $this->assignmentService->haversineDistanceKm(
                $delivery->pickup_latitude,
                $delivery->pickup_longitude,
                $delivery->dropoff_latitude,
                $delivery->dropoff_longitude
            );

            if ($toBranchKm === null && $branchToCustomerKm === null) {
                return null;
            }

            $totalKm = ($toBranchKm ?? 0) + ($branchToCustomerKm ?? 2.0);
            // ~25 km/h shpejtësi urbane + 5 min pritje në restorant
            return (int) max(5, round(($totalKm / 25.0) * 60) + 5);
        }

        // Pas marrjes së porosisë: distanca korrier -> klient
        $toCustomerKm = $this->assignmentService->haversineDistanceKm(
            $courier->current_latitude,
            $courier->current_longitude,
            $delivery->dropoff_latitude,
            $delivery->dropoff_longitude
        );

        if ($toCustomerKm === null) {
            return null;
        }

        return (int) max(2, round(($toCustomerKm / 25.0) * 60) + 2);
    }

    /**
     * Anulon dërgesën kur porosia anulohet nga klienti ose admini.
     */
    public function cancelDeliveryForOrder(Order $order, ?int $actorUserId = null, string $reason = 'Porosia u anulua.'): void
    {
        $delivery = Delivery::where('order_id', $order->id)->first();
        if (!$delivery || in_array($delivery->status, Delivery::TERMINAL_STATUSES, true)) {
            return;
        }

        $oldStatus = $delivery->status;
        $courierId = $delivery->courier_id;

        $delivery->update([
            'status' => 'cancelled',
            'cancelled_at' => Carbon::now(),
            'failure_reason' => $reason,
        ]);

        if ($courierId) {
            $this->assignmentService->refreshCourierAvailability($courierId);
        }

        DeliveryStatusHistory::create([
            'delivery_id' => $delivery->id,
            'from_status' => $oldStatus,
            'to_status' => 'cancelled',
            'changed_by_user_id' => $actorUserId,
            'actor_role' => 'system',
            'notes' => $reason,
            'created_at' => Carbon::now(),
        ]);
    }

    private function syncOrderAndCourierOnTransition(Delivery $delivery, string $toStatus, User $actor, Carbon $now): void
    {
        $order = $delivery->order;

        if ($toStatus === 'picked_up' && $order) {
            if (in_array($order->status, ['confirmed', 'in_preparation'], true)) {
                $oldOrderStatus = $order->status;
                $order->update([
                    'status' => 'ready_for_pickup',
                    'bumped_at' => $order->bumped_at ?? $now,
                ]);
                OrderStatusHistory::create([
                    'order_id' => $order->id,
                    'from_status' => $oldOrderStatus,
                    'to_status' => 'ready_for_pickup',
                    'changed_by_user_id' => $actor->id,
                    'reason_or_notes' => 'Porosia u mor nga korrieri dhe është në rrugë.',
                ]);
            }
        }

        if ($toStatus === 'delivered') {
            if ($order && !in_array($order->status, ['completed', 'cancelled'], true)) {
                $oldOrderStatus = $order->status;
                $order->status = 'completed';
                if ($order->payment_method === 'cash_on_delivery' && $order->payment_status !== 'paid') {
                    $order->payment_status = 'paid';
                    if ($order->payment) {
                        $order->payment->update(['status' => 'paid', 'paid_at' => $now]);
                    }
                }
                $order->save();

                OrderStatusHistory::create([
                    'order_id' => $order->id,
                    'from_status' => $oldOrderStatus,
                    'to_status' => 'completed',
                    'changed_by_user_id' => $actor->id,
                    'reason_or_notes' => 'Porosia u dorëzua me sukses te klienti nga korrieri.',
                ]);
            }

            if ($delivery->courier_id) {
                $courier = Courier::find($delivery->courier_id);
                if ($courier) {
                    $courier->increment('total_deliveries');
                    $courier->increment('successful_deliveries');
                    $this->assignmentService->refreshCourierAvailability($courier->id);
                }
            }
        }

        if ($toStatus === 'failed') {
            if ($delivery->courier_id) {
                $courier = Courier::find($delivery->courier_id);
                if ($courier) {
                    $courier->increment('total_deliveries');
                    $courier->increment('failed_deliveries');
                    $this->assignmentService->refreshCourierAvailability($courier->id);
                }
            }
        }

        if ($toStatus === 'cancelled' && $delivery->courier_id) {
            $this->assignmentService->refreshCourierAvailability($delivery->courier_id);
        }
    }
}
