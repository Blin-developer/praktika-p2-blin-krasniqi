<?php

namespace App\Services;

use App\Models\Courier;
use App\Models\Delivery;
use App\Models\DeliveryStatusHistory;
use App\Models\Notification;
use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeliveryAssignmentService
{
    public const ASSIGNMENT_TIMEOUT_MINUTES = 3;

    /**
     * Krijon regjistrin e dërgesës sapo të krijohet një porosi e tipit 'delivery'.
     */
    public function createDeliveryForOrder(Order $order): ?Delivery
    {
        if ($order->order_type !== 'delivery') {
            return null;
        }

        $existing = Delivery::where('order_id', $order->id)->first();
        if ($existing) {
            return $existing;
        }

        $order->loadMissing(['branch', 'deliveryZone']);

        $dropoffAddress = $this->formatAddressForDisplay($order->delivery_address);
        $instructions = $this->extractInstructions($order->delivery_address, $order->customer_note);

        $etaMinutes = $order->estimated_wait_time_minutes
            ?: ($order->deliveryZone?->estimated_delivery_minutes ?? 30);

        $delivery = Delivery::create([
            'order_id' => $order->id,
            'branch_id' => $order->branch_id,
            'delivery_zone_id' => $order->delivery_zone_id,
            'status' => 'pending_assignment',
            'priority' => $order->priority ?? 'normal',
            'delivery_fee' => $order->delivery_fee ?? 1.50,
            'pickup_address' => $order->branch?->address,
            'pickup_latitude' => $order->branch?->latitude,
            'pickup_longitude' => $order->branch?->longitude,
            'dropoff_address' => $dropoffAddress,
            'dropoff_latitude' => $order->delivery_latitude,
            'dropoff_longitude' => $order->delivery_longitude,
            'delivery_instructions' => $instructions,
            'estimated_delivery_at' => Carbon::now()->addMinutes($etaMinutes),
        ]);

        DeliveryStatusHistory::create([
            'delivery_id' => $delivery->id,
            'from_status' => null,
            'to_status' => 'pending_assignment',
            'changed_by_user_id' => $order->customer_id,
            'actor_role' => 'system',
            'notes' => "Dërgesa u krijua për porosinë #{$order->order_number}.",
            'created_at' => Carbon::now(),
        ]);

        return $delivery;
    }

    /**
     * Caktim inteligjent automatik i korrierit duke u bazuar në disponueshmëri, ngarkesë dhe distancë.
     */
    public function autoAssign(Delivery $delivery, ?int $actorUserId = null): ?Delivery
    {
        return DB::transaction(function () use ($delivery, $actorUserId) {
            $lockedDelivery = Delivery::where('id', $delivery->id)->lockForUpdate()->firstOrFail();

            if (!in_array($lockedDelivery->status, ['pending_assignment', 'assigned'], true)) {
                return null;
            }

            if ($lockedDelivery->status === 'assigned' && $lockedDelivery->assignment_expires_at && $lockedDelivery->assignment_expires_at->isFuture()) {
                return $lockedDelivery;
            }

            $candidates = Courier::with('user')
                ->withCount('activeDeliveries')
                ->where('is_active', true)
                ->whereIn('availability_status', ['available', 'busy'])
                ->get()
                ->filter(function (Courier $c) {
                    return $c->user && $c->user->is_active && $c->active_deliveries_count < $c->max_concurrent_deliveries;
                });

            if ($candidates->isEmpty()) {
                app(NotificationService::class)->notifyDeliveryRequiresIntervention(
                    $lockedDelivery,
                    'Nuk ka korrierë të lirë aktualisht për caktim automatik.'
                );
                return null;
            }

            // Shmang korrierin që sapo e refuzoi nëse ka kandidatë të tjerë
            if ($lockedDelivery->last_rejected_by_courier_id && $candidates->count() > 1) {
                $filtered = $candidates->where('id', '!=', $lockedDelivery->last_rejected_by_courier_id);
                if ($filtered->isNotEmpty()) {
                    $candidates = $filtered;
                }
            }

            // Renditja sipas pikëve (sa më pak pikë, aq më i përshtatshëm)
            $bestCourier = $candidates->sortBy(function (Courier $c) use ($lockedDelivery) {
                $score = 0.0;
                // Korrierët plotësisht të lirë kanë përparësi të fortë ndaj atyre 'busy'
                if ($c->availability_status === 'busy') {
                    $score += 1000.0;
                }
                // Ngarkesa aktuale
                $score += ($c->active_deliveries_count * 100.0);

                // Përparësi nëse i përket të njëjtës degë ose nuk ka degë fikse
                if ($c->branch_id && $c->branch_id !== $lockedDelivery->branch_id) {
                    $score += 25.0;
                }

                // Distanca reale nëse të dyja palët kanë koordinata GPS
                $distanceKm = $this->haversineDistanceKm(
                    $c->current_latitude,
                    $c->current_longitude,
                    $lockedDelivery->pickup_latitude,
                    $lockedDelivery->pickup_longitude
                );
                if ($distanceKm !== null) {
                    $score += ($distanceKm * 5.0);
                }

                return $score;
            })->first();

            if (!$bestCourier) {
                return null;
            }

            // Kyç korrierin e zgjedhur për të parandaluar garën e kërkesave (race conditions)
            $lockedCourier = Courier::where('id', $bestCourier->id)->lockForUpdate()->firstOrFail();
            if ($lockedCourier->activeDeliveries()->count() >= $lockedCourier->max_concurrent_deliveries) {
                return null;
            }

            $isReassignment = (bool) $lockedDelivery->courier_id || $lockedDelivery->rejection_count > 0;
            $previousCourier = $lockedDelivery->courier_id ? Courier::find($lockedDelivery->courier_id) : null;

            $oldStatus = $lockedDelivery->status;
            $lockedDelivery->update([
                'courier_id' => $lockedCourier->id,
                'status' => 'assigned',
                'assigned_at' => Carbon::now(),
                'assignment_expires_at' => Carbon::now()->addMinutes(self::ASSIGNMENT_TIMEOUT_MINUTES),
            ]);

            DeliveryStatusHistory::create([
                'delivery_id' => $lockedDelivery->id,
                'from_status' => $oldStatus,
                'to_status' => 'assigned',
                'changed_by_user_id' => $actorUserId,
                'actor_role' => $actorUserId ? 'admin' : 'system',
                'notes' => "U caktua automatikisht korrieri {$lockedCourier->user->name}.",
                'created_at' => Carbon::now(),
            ]);

            $this->notifyCourier($lockedCourier, $lockedDelivery, $isReassignment, $previousCourier);

            return $lockedDelivery->fresh(['courier.user', 'order', 'branch', 'deliveryZone', 'statusHistory']);
        });
    }

    /**
     * Caktim ose ricaktim manual nga administratori/menaxheri.
     */
    public function manualAssign(Delivery $delivery, int $courierId, int $actorUserId, bool $forceReassign = false): Delivery
    {
        return DB::transaction(function () use ($delivery, $courierId, $actorUserId, $forceReassign) {
            $lockedDelivery = Delivery::where('id', $delivery->id)->lockForUpdate()->firstOrFail();

            if (in_array($lockedDelivery->status, Delivery::TERMINAL_STATUSES, true)) {
                throw ValidationException::withMessages([
                    'delivery' => ['Nuk mund të caktohet korrier për një dërgesë të përfunduar ose të anuluar.'],
                ]);
            }

            $lockedCourier = Courier::with('user')->where('id', $courierId)->lockForUpdate()->firstOrFail();

            if (!$lockedCourier->is_active || !$lockedCourier->user || !$lockedCourier->user->is_active) {
                throw ValidationException::withMessages([
                    'courier_id' => ['Ky korrier është i çaktivizuar dhe nuk mund të pranojë dërgesa.'],
                ]);
            }

            if ($lockedCourier->availability_status === 'offline') {
                throw ValidationException::withMessages([
                    'courier_id' => ['Korrieri është aktualisht Offline dhe nuk mund të caktohet.'],
                ]);
            }

            if ($lockedDelivery->courier_id === $lockedCourier->id && $lockedDelivery->status !== 'pending_assignment') {
                throw ValidationException::withMessages([
                    'courier_id' => ['Ky korrier është tashmë i caktuar në këtë dërgesë.'],
                ]);
            }

            if ($lockedDelivery->courier_id && $lockedDelivery->courier_id !== $lockedCourier->id && !$forceReassign) {
                throw ValidationException::withMessages([
                    'courier_id' => ['Kjo dërgesë ka tashmë një korrier të caktuar. Përdorni ricaktimin manual nëse dëshironi ta ndryshoni.'],
                ]);
            }

            $activeCount = $lockedCourier->activeDeliveries()->where('id', '!=', $lockedDelivery->id)->count();
            if ($activeCount >= $lockedCourier->max_concurrent_deliveries) {
                throw ValidationException::withMessages([
                    'courier_id' => ['Korrieri ka arritur limitin maksimal të dërgesave aktive njëkohësisht.'],
                ]);
            }

            $previousCourierId = $lockedDelivery->courier_id;
            $oldStatus = $lockedDelivery->status;

            $lockedDelivery->update([
                'courier_id' => $lockedCourier->id,
                'status' => 'assigned',
                'assigned_at' => Carbon::now(),
                'assignment_expires_at' => Carbon::now()->addMinutes(self::ASSIGNMENT_TIMEOUT_MINUTES),
            ]);

            if ($previousCourierId && $previousCourierId !== $lockedCourier->id) {
                $this->refreshCourierAvailability($previousCourierId);
            }

            DeliveryStatusHistory::create([
                'delivery_id' => $lockedDelivery->id,
                'from_status' => $oldStatus,
                'to_status' => 'assigned',
                'changed_by_user_id' => $actorUserId,
                'actor_role' => 'admin',
                'notes' => $previousCourierId
                    ? "Dërgesa u ricaktua manualisht te korrieri {$lockedCourier->user->name}."
                    : "U caktua manualisht korrieri {$lockedCourier->user->name}.",
                'created_at' => Carbon::now(),
            ]);

            $previousCourier = $previousCourierId ? Courier::find($previousCourierId) : null;
            $this->notifyCourier($lockedCourier, $lockedDelivery, (bool) $previousCourierId, $previousCourier);

            return $lockedDelivery->fresh(['courier.user', 'order', 'branch', 'deliveryZone', 'statusHistory']);
        });
    }

    /**
     * Korrieri pranon kërkesën e dërgesës.
     */
    public function acceptAssignment(Delivery $delivery, Courier $courier): Delivery
    {
        return DB::transaction(function () use ($delivery, $courier) {
            $lockedDelivery = Delivery::where('id', $delivery->id)->lockForUpdate()->firstOrFail();

            if ($lockedDelivery->courier_id !== $courier->id) {
                throw ValidationException::withMessages([
                    'delivery' => ['Nuk jeni i caktuar për këtë dërgesë.'],
                ]);
            }

            if ($lockedDelivery->status !== 'assigned') {
                throw ValidationException::withMessages([
                    'delivery' => ['Kjo kërkesë dërgese nuk është më në pritje të pranimit.'],
                ]);
            }

            $lockedCourier = Courier::where('id', $courier->id)->lockForUpdate()->firstOrFail();
            $lockedCourier->update(['availability_status' => 'busy']);

            $lockedDelivery->update([
                'status' => 'accepted',
                'accepted_at' => Carbon::now(),
                'assignment_expires_at' => null,
            ]);

            DeliveryStatusHistory::create([
                'delivery_id' => $lockedDelivery->id,
                'from_status' => 'assigned',
                'to_status' => 'accepted',
                'changed_by_user_id' => $courier->user_id,
                'actor_role' => 'courier',
                'notes' => 'Korrieri pranoi dërgesën.',
                'latitude' => $lockedCourier->current_latitude,
                'longitude' => $lockedCourier->current_longitude,
                'created_at' => Carbon::now(),
            ]);

            return $lockedDelivery->fresh(['courier.user', 'order.items', 'branch', 'deliveryZone', 'statusHistory']);
        });
    }

    /**
     * Korrieri refuzon kërkesën e dërgesës dhe sistemi e kthen në dispeçim.
     */
    public function rejectAssignment(Delivery $delivery, Courier $courier, ?string $reason = null, bool $attemptAutoReassign = true): Delivery
    {
        $updated = DB::transaction(function () use ($delivery, $courier, $reason) {
            $lockedDelivery = Delivery::where('id', $delivery->id)->lockForUpdate()->firstOrFail();

            if ($lockedDelivery->courier_id !== $courier->id) {
                throw ValidationException::withMessages([
                    'delivery' => ['Nuk jeni i caktuar për këtë dërgesë.'],
                ]);
            }

            if ($lockedDelivery->status !== 'assigned') {
                throw ValidationException::withMessages([
                    'delivery' => ['Mund të refuzoni vetëm dërgesat në statusin "assigned".'],
                ]);
            }

            $lockedDelivery->update([
                'courier_id' => null,
                'status' => 'pending_assignment',
                'assigned_at' => null,
                'assignment_expires_at' => null,
                'rejection_count' => $lockedDelivery->rejection_count + 1,
                'last_rejected_by_courier_id' => $courier->id,
            ]);

            $this->refreshCourierAvailability($courier->id);

            DeliveryStatusHistory::create([
                'delivery_id' => $lockedDelivery->id,
                'from_status' => 'assigned',
                'to_status' => 'pending_assignment',
                'changed_by_user_id' => $courier->user_id,
                'actor_role' => 'courier',
                'notes' => 'Korrieri refuzoi dërgesën' . ($reason ? ": {$reason}" : '.'),
                'created_at' => Carbon::now(),
            ]);

            return $lockedDelivery->fresh();
        });

        if ($attemptAutoReassign) {
            $reassigned = $this->autoAssign($updated);
            if ($reassigned) {
                return $reassigned;
            }
        }

        return $updated->fresh(['courier.user', 'order', 'branch', 'statusHistory']);
    }

    /**
     * Liron caktimet e skaduara (timeout) dhe tenton ricaktim automatik.
     */
    public function processExpiredAssignments(): int
    {
        $expired = Delivery::where('status', 'assigned')
            ->whereNotNull('assignment_expires_at')
            ->where('assignment_expires_at', '<', Carbon::now())
            ->get();

        $count = 0;
        foreach ($expired as $delivery) {
            $prevCourierId = $delivery->courier_id;
            DB::transaction(function () use ($delivery, $prevCourierId) {
                $locked = Delivery::where('id', $delivery->id)->lockForUpdate()->first();
                if (!$locked || $locked->status !== 'assigned') {
                    return;
                }

                $locked->update([
                    'courier_id' => null,
                    'status' => 'pending_assignment',
                    'assigned_at' => null,
                    'assignment_expires_at' => null,
                    'last_rejected_by_courier_id' => $prevCourierId,
                ]);

                if ($prevCourierId) {
                    $this->refreshCourierAvailability($prevCourierId);
                }

                DeliveryStatusHistory::create([
                    'delivery_id' => $locked->id,
                    'from_status' => 'assigned',
                    'to_status' => 'pending_assignment',
                    'changed_by_user_id' => null,
                    'actor_role' => 'system',
                    'notes' => 'Koha e pranimit skadoi (timeout). Dërgesa u kthye në dispeçim.',
                    'created_at' => Carbon::now(),
                ]);
            });

            $this->autoAssign($delivery->fresh());
            $count++;
        }

        return $count;
    }

    public function refreshCourierAvailability(int $courierId): void
    {
        $courier = Courier::find($courierId);
        if (!$courier || $courier->availability_status === 'offline') {
            return;
        }

        $hasActive = $courier->activeDeliveries()->exists();
        $courier->update([
            'availability_status' => $hasActive ? 'busy' : 'available',
        ]);
    }

    public function haversineDistanceKm(?float $lat1, ?float $lon1, ?float $lat2, ?float $lon2): ?float
    {
        if ($lat1 === null || $lon1 === null || $lat2 === null || $lon2 === null) {
            return null;
        }

        $earthRadius = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2)
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2))
            * sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return round($earthRadius * $c, 2);
    }

    private function notifyCourier(Courier $courier, Delivery $delivery, bool $isReassignment = false, ?Courier $previousCourier = null): void
    {
        app(NotificationService::class)->notifyCourierAssigned(
            $courier,
            $delivery,
            $isReassignment,
            $previousCourier
        );
    }

    private function formatAddressForDisplay(?string $raw): ?string
    {
        if (!$raw) {
            return null;
        }

        $decoded = json_decode($raw, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            $parts = array_filter([
                $decoded['street'] ?? null,
                $decoded['building'] ?? null,
                $decoded['floor'] ?? null,
                $decoded['city'] ?? null,
            ]);
            return implode(', ', $parts) ?: $raw;
        }

        return $raw;
    }

    private function extractInstructions(?string $rawAddress, ?string $customerNote): ?string
    {
        $notes = [];
        if ($rawAddress) {
            $decoded = json_decode($rawAddress, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded) && !empty($decoded['notes'])) {
                $notes[] = $decoded['notes'];
            }
        }
        if ($customerNote) {
            $notes[] = $customerNote;
        }

        return !empty($notes) ? implode(' | ', $notes) : null;
    }
}
