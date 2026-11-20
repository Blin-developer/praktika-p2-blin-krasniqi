<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\BranchCapacityOverride;
use App\Models\OpeningHour;
use App\Models\Order;
use App\Models\PickupSlot;
use App\Models\SpecialOpeningHour;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CapacityAndSlotService
{
    public function __construct(
        protected RestaurantAvailabilityService $availabilityService
    ) {}

    /**
     * Merr ditët e disponueshme për orare të planifikuara (nga sot deri në max_advance_days).
     */
    public function getAvailableDates(Branch $branch): array
    {
        $timezone = $branch->timezone ?: 'Europe/Belgrade';
        $today = Carbon::now($timezone)->startOfDay();
        $advanceDays = $branch->max_advance_days ?: 7;

        $dates = [];
        $emratDiteve = [
            0 => 'E Diel',
            1 => 'E Hënë',
            2 => 'E Martë',
            3 => 'E Mërkurë',
            4 => 'E Enjte',
            5 => 'E Premte',
            6 => 'E Shtunë',
        ];

        for ($i = 0; $i < $advanceDays; $i++) {
            $curDate = $today->copy()->addDays($i);
            $dateStr = $curDate->format('Y-m-d');

            // Kontrollojmë nëse dega ka orar në këtë datë
            $special = SpecialOpeningHour::where('branch_id', $branch->id)
                ->where('date', $dateStr)
                ->first();

            $override = BranchCapacityOverride::where('branch_id', $branch->id)
                ->where('date', $dateStr)
                ->first();

            $isClosed = false;
            $label = $emratDiteve[$curDate->dayOfWeek];
            if ($i === 0) {
                $label = 'Sot (' . $label . ')';
            } elseif ($i === 1) {
                $label = 'Nesër (' . $label . ')';
            }

            if ($special && $special->is_closed) {
                $isClosed = true;
            } elseif ($override && $override->is_closed) {
                $isClosed = true;
            } else {
                $hasRegularHours = OpeningHour::where('branch_id', $branch->id)
                    ->where('day_of_week', $curDate->dayOfWeek)
                    ->where('is_closed', false)
                    ->exists();

                if (!$special && !$hasRegularHours) {
                    $isClosed = true;
                }
            }

            $dates[] = [
                'date' => $dateStr,
                'day_of_week' => $curDate->dayOfWeek,
                'day_name' => $emratDiteve[$curDate->dayOfWeek],
                'display_label' => $label,
                'formatted' => $curDate->format('d/m/Y'),
                'is_today' => $i === 0,
                'is_closed' => $isClosed,
                'holiday_reason' => $special?->reason_or_occasion ?: $override?->reason,
            ];
        }

        return $dates;
    }

    /**
     * Merr kapacitetin efektiv të konfiguruar për një degë në një datë të caktuar.
     */
    public function getEffectiveCapacityConfig(Branch $branch, Carbon $dateCarbon): array
    {
        $dateStr = $dateCarbon->format('Y-m-d');
        $dayOfWeek = $dateCarbon->dayOfWeek;

        // 1. Prioriteti 1: Mbishkrim specifik për datën
        $dateOverride = BranchCapacityOverride::where('branch_id', $branch->id)
            ->where('date', $dateStr)
            ->first();

        if ($dateOverride) {
            return [
                'max_orders_per_slot' => $dateOverride->max_orders_per_slot ?: ($branch->max_orders_per_slot ?: 10),
                'max_delivery_per_slot' => $dateOverride->max_delivery_per_slot ?: $branch->max_delivery_per_slot,
                'max_pickup_per_slot' => $dateOverride->max_pickup_per_slot ?: $branch->max_pickup_per_slot,
                'max_kitchen_workload_minutes' => $dateOverride->max_kitchen_workload_minutes ?: ($branch->max_kitchen_workload_minutes ?: 90),
                'is_closed' => (bool) $dateOverride->is_closed,
                'reason' => $dateOverride->reason,
                'source' => 'date_override',
            ];
        }

        // 2. Prioriteti 2: Mbishkrim për ditën e javës
        $dayOverride = BranchCapacityOverride::where('branch_id', $branch->id)
            ->whereNull('date')
            ->where('day_of_week', $dayOfWeek)
            ->first();

        if ($dayOverride) {
            return [
                'max_orders_per_slot' => $dayOverride->max_orders_per_slot ?: ($branch->max_orders_per_slot ?: 10),
                'max_delivery_per_slot' => $dayOverride->max_delivery_per_slot ?: $branch->max_delivery_per_slot,
                'max_pickup_per_slot' => $dayOverride->max_pickup_per_slot ?: $branch->max_pickup_per_slot,
                'max_kitchen_workload_minutes' => $dayOverride->max_kitchen_workload_minutes ?: ($branch->max_kitchen_workload_minutes ?: 90),
                'is_closed' => (bool) $dayOverride->is_closed,
                'reason' => $dayOverride->reason,
                'source' => 'day_override',
            ];
        }

        // 3. Fallback: Konfigurimi bazë i degës
        return [
            'max_orders_per_slot' => $branch->max_orders_per_slot ?: 10,
            'max_delivery_per_slot' => $branch->max_delivery_per_slot,
            'max_pickup_per_slot' => $branch->max_pickup_per_slot,
            'max_kitchen_workload_minutes' => $branch->max_kitchen_workload_minutes ?: 90,
            'is_closed' => false,
            'reason' => null,
            'source' => 'branch_default',
        ];
    }

    /**
     * Gjeneron dhe kthen të gjitha slotet e orarit për një datë të caktuar me kapacitetin real dhe ngarkesën.
     */
    public function getTimeSlots(Branch $branch, string $date, string $orderType = 'all', array $items = []): array
    {
        $timezone = $branch->timezone ?: 'Europe/Belgrade';
        $now = Carbon::now($timezone);
        $dateCarbon = Carbon::parse($date, $timezone)->startOfDay();
        $isToday = $dateCarbon->isSameDay($now);

        // Verifiko nëse data është brenda kufijve të lejuar
        if ($dateCarbon->copy()->endOfDay()->isBefore($now)) {
            return [
                'success' => false,
                'message' => 'Nuk mund të zgjidhni një datë në të kaluarën.',
                'date' => $date,
                'slots' => [],
            ];
        }

        $maxAdvance = $branch->max_advance_days ?: 7;
        if ($dateCarbon->diffInDays($now->copy()->startOfDay()) > $maxAdvance) {
            return [
                'success' => false,
                'message' => "Mund të planifikoni porosi deri në {$maxAdvance} ditë përpara.",
                'date' => $date,
                'slots' => [],
            ];
        }

        // Kapaciteti i konfiguruar për këtë ditë
        $capacityConfig = $this->getEffectiveCapacityConfig($branch, $dateCarbon);

        if ($capacityConfig['is_closed']) {
            return [
                'success' => true,
                'message' => $capacityConfig['reason'] ?: 'Restoranti është i mbyllur në këtë datë.',
                'date' => $date,
                'is_closed' => true,
                'slots' => [],
            ];
        }

        // Marrja e orareve të punës për këtë datë
        $specialHour = SpecialOpeningHour::where('branch_id', $branch->id)
            ->where('date', $date)
            ->first();

        $intervals = [];

        if ($specialHour) {
            if ($specialHour->is_closed) {
                return [
                    'success' => true,
                    'message' => "Mbyllur sot: {$specialHour->reason_or_occasion}.",
                    'date' => $date,
                    'is_closed' => true,
                    'slots' => [],
                ];
            }
            if ($specialHour->open_time && $specialHour->close_time) {
                $intervals[] = [
                    'open' => substr($specialHour->open_time, 0, 5),
                    'close' => substr($specialHour->close_time, 0, 5),
                    'is_overnight' => $specialHour->close_time < $specialHour->open_time,
                ];
            }
        } else {
            $hours = OpeningHour::where('branch_id', $branch->id)
                ->where('day_of_week', $dateCarbon->dayOfWeek)
                ->where('is_closed', false)
                ->orderBy('sort_order')
                ->orderBy('open_time')
                ->get();

            foreach ($hours as $h) {
                $intervals[] = [
                    'open' => substr($h->open_time, 0, 5),
                    'close' => substr($h->close_time, 0, 5),
                    'is_overnight' => $h->is_overnight || ($h->close_time < $h->open_time),
                ];
            }
        }

        if (empty($intervals)) {
            return [
                'success' => true,
                'message' => 'Restoranti nuk ka orar pune të regjistruar për këtë ditë.',
                'date' => $date,
                'is_closed' => true,
                'slots' => [],
            ];
        }

        $intervalMinutes = $branch->slot_interval_minutes ?: 30;
        if (!in_array($intervalMinutes, [15, 30, 60], true)) {
            $intervalMinutes = 30;
        }

        $leadTimeMinutes = $branch->order_lead_time_minutes ?: 20;
        $cutoffTime = $isToday ? $now->copy()->addMinutes($leadTimeMinutes) : null;

        // Llogaritja e kohës së përgatitjes për artikujt e dhënë
        $itemPrepTime = !empty($items) ? $this->availabilityService->calculateOrderPrepTime($branch, $items) : $branch->effectivePrepTime();

        // Gjenerimi i të gjitha dritareve kohore brenda intervaleve
        $slots = [];

        foreach ($intervals as $interval) {
            $openParts = explode(':', $interval['open']);
            $closeParts = explode(':', $interval['close']);

            $startSlot = $dateCarbon->copy()->setTime((int) $openParts[0], (int) $openParts[1], 0);

            if ($interval['is_overnight']) {
                $endInterval = $dateCarbon->copy()->addDay()->setTime((int) $closeParts[0], (int) $closeParts[1], 0);
            } else {
                $endInterval = $dateCarbon->copy()->setTime((int) $closeParts[0], (int) $closeParts[1], 0);
            }

            while ($startSlot->copy()->addMinutes($intervalMinutes)->lessThanOrEqualTo($endInterval)) {
                $endSlot = $startSlot->copy()->addMinutes($intervalMinutes);

                $startTimeStr = $startSlot->format('H:i:s');
                $endTimeStr = $endSlot->format('H:i:s');
                $startDisplay = $startSlot->format('H:i');
                $endDisplay = $endSlot->format('H:i');

                // Kontrollojmë nëse ky slot ndodhet tashmë në databazë ose duhet sinkronizuar
                $slotRecord = PickupSlot::firstOrCreate(
                    [
                        'branch_id' => $branch->id,
                        'slot_date' => $date,
                        'start_time' => $startTimeStr,
                    ],
                    [
                        'end_time' => $endTimeStr,
                        'max_capacity' => $capacityConfig['max_orders_per_slot'],
                        'max_delivery_capacity' => $capacityConfig['max_delivery_per_slot'],
                        'max_pickup_capacity' => $capacityConfig['max_pickup_per_slot'],
                        'current_booked_count' => 0,
                        'booked_delivery_count' => 0,
                        'booked_pickup_count' => 0,
                        'total_prep_time_minutes' => 0,
                        'is_active' => true,
                    ]
                );

                // Sinkronizojmë kapacitetet maksimale nëse ka mbishkrime të reja
                if ($slotRecord->max_capacity !== $capacityConfig['max_orders_per_slot']) {
                    $slotRecord->update([
                        'max_capacity' => $capacityConfig['max_orders_per_slot'],
                        'max_delivery_capacity' => $capacityConfig['max_delivery_per_slot'],
                        'max_pickup_capacity' => $capacityConfig['max_pickup_per_slot'],
                    ]);
                }

                // Kontrollojmë disponueshmërinë kohore (nuk lejohen slote të kaluara sot)
                $isExpired = false;
                if ($isToday && $cutoffTime) {
                    $slotDateTime = $startSlot->copy();
                    if ($slotDateTime->isBefore($cutoffTime)) {
                        $isExpired = true;
                    }
                }

                $maxCap = (int) $slotRecord->max_capacity;
                $currentBooked = (int) $slotRecord->current_booked_count;
                $remainingCap = max(0, $maxCap - $currentBooked);

                $deliveryCap = $slotRecord->max_delivery_capacity !== null ? (int) $slotRecord->max_delivery_capacity : $maxCap;
                $bookedDelivery = (int) $slotRecord->booked_delivery_count;
                $deliveryRemaining = max(0, min($remainingCap, $deliveryCap - $bookedDelivery));

                $pickupCap = $slotRecord->max_pickup_capacity !== null ? (int) $slotRecord->max_pickup_capacity : $maxCap;
                $bookedPickup = (int) $slotRecord->booked_pickup_count;
                $pickupRemaining = max(0, min($remainingCap, $pickupCap - $bookedPickup));

                $maxWorkload = $capacityConfig['max_kitchen_workload_minutes'] ?: 90;
                $currentWorkload = (int) $slotRecord->total_prep_time_minutes;
                $workloadRemaining = max(0, $maxWorkload - $currentWorkload);
                $isWorkloadOverloaded = ($currentWorkload + $itemPrepTime) > $maxWorkload;

                // Statusi dhe disponueshmëria e slotit
                $isAvailable = true;
                $unavailabilityReason = null;

                if (!$slotRecord->is_active) {
                    $isAvailable = false;
                    $unavailabilityReason = 'Slot i çaktivizuar nga restoranti.';
                } elseif ($isExpired) {
                    $isAvailable = false;
                    $unavailabilityReason = 'Koha e këtij sloti ka kaluar.';
                } elseif ($remainingCap <= 0) {
                    $isAvailable = false;
                    $unavailabilityReason = 'Kapaciteti i slotit është plotësuar plotësisht.';
                } elseif ($orderType === 'delivery' && $deliveryRemaining <= 0) {
                    $isAvailable = false;
                    $unavailabilityReason = 'Kapaciteti i dërgesave me korrier për këtë orar është plotësuar.';
                } elseif ($orderType === 'pickup' && $pickupRemaining <= 0) {
                    $isAvailable = false;
                    $unavailabilityReason = 'Kapaciteti i marrjes në sportel për këtë orar është plotësuar.';
                } elseif ($isWorkloadOverloaded) {
                    $isAvailable = false;
                    $unavailabilityReason = 'Kuzhina ka arritur kapacitetin maksimal të përgatitjes për këtë orar.';
                }

                $slots[] = [
                    'id' => $slotRecord->id,
                    'start_time' => $startDisplay,
                    'end_time' => $endDisplay,
                    'time_label' => "{$startDisplay} - {$endDisplay}",
                    'raw_start' => $startTimeStr,
                    'raw_end' => $endTimeStr,
                    'max_capacity' => $maxCap,
                    'current_booked' => $currentBooked,
                    'remaining_capacity' => $remainingCap,
                    'delivery_remaining' => $deliveryRemaining,
                    'pickup_remaining' => $pickupRemaining,
                    'workload_minutes' => $currentWorkload,
                    'max_workload_minutes' => $maxWorkload,
                    'workload_percentage' => $maxWorkload > 0 ? min(100, round(($currentWorkload / $maxWorkload) * 100)) : 0,
                    'is_expired' => $isExpired,
                    'is_available' => $isAvailable,
                    'unavailability_reason' => $unavailabilityReason,
                    'order_type_supported' => [
                        'delivery' => $branch->accepts_delivery && $deliveryRemaining > 0 && !$isExpired && !$isWorkloadOverloaded,
                        'pickup' => $branch->accepts_pickup && $pickupRemaining > 0 && !$isExpired && !$isWorkloadOverloaded,
                    ],
                ];

                $startSlot->addMinutes($intervalMinutes);
            }
        }

        // Llogaritja e disponueshmërisë ASAP
        $asap = $this->calculateDynamicWaitTime($branch, $orderType, $items);

        return [
            'success' => true,
            'date' => $date,
            'date_formatted' => $dateCarbon->format('d/m/Y'),
            'interval_minutes' => $intervalMinutes,
            'capacity_config' => $capacityConfig,
            'asap' => $asap,
            'slots' => $slots,
        ];
    }

    /**
     * Llogarit kohën dinamike të pritjes duke marrë parasysh:
     * - Kohën bazë të përgatitjes nga Faza 3
     * - Numrin e porosive aktive në proces në degë
     * - Rush mode (busy_mode)
     * - Llojin e shërbimit (delivery me korrier vs pickup)
     */
    public function calculateDynamicWaitTime(Branch $branch, string $orderType = 'delivery', array $items = []): array
    {
        // 1. Koha bazë nga produktet dhe dega
        $basePrepTime = !empty($items)
            ? $this->availabilityService->calculateOrderPrepTime($branch, $items)
            : $branch->effectivePrepTime();

        // 2. Numri i porosive aktive momentale në degë (pending, confirmed, in_preparation)
        $activeOrdersCount = Order::where('branch_id', $branch->id)
            ->whereIn('status', ['pending', 'confirmed', 'in_preparation'])
            ->count();

        // Çdo 3 porosi aktive në radhë shtojnë +5 minuta vonesë në kuzhinë
        $workloadBufferMinutes = (int) (floor($activeOrdersCount / 3) * 5);

        // 3. Rush Mode (busy_mode) shton +15 minuta
        $rushModeMinutes = $branch->busy_mode ? 15 : 0;

        // 4. Tarifa / koha e transportit të korrierit (Delivery buffer)
        $deliveryBufferMinutes = ($orderType === 'delivery') ? 15 : 0;

        $totalEstimatedMinutes = $basePrepTime + $workloadBufferMinutes + $rushModeMinutes + $deliveryBufferMinutes;

        // Krijojmë një gamë të qartë dhe miqësore për klientin (p.sh. "30–40 min")
        $minTime = max(15, $totalEstimatedMinutes - 5);
        $maxTime = $totalEstimatedMinutes + 5;
        $rangeDisplay = "{$minTime}–{$maxTime} min";

        $timezone = $branch->timezone ?: 'Europe/Belgrade';
        $readyAt = Carbon::now($timezone)->addMinutes($totalEstimatedMinutes);

        return [
            'base_prep_minutes' => $basePrepTime,
            'active_orders_count' => $activeOrdersCount,
            'workload_buffer_minutes' => $workloadBufferMinutes,
            'rush_mode_active' => (bool) $branch->busy_mode,
            'rush_mode_minutes' => $rushModeMinutes,
            'delivery_buffer_minutes' => $deliveryBufferMinutes,
            'total_estimated_minutes' => $totalEstimatedMinutes,
            'display_range' => $rangeDisplay,
            'ready_around' => $readyAt->format('H:i'),
            'can_order_asap' => $branch->isOpenNow() && !$branch->is_temporarily_closed,
        ];
    }

    /**
     * Rezervon një slot orari me Row-Level Locking (lockForUpdate) për të parandaluar garën e porosive (Overbooking).
     *
     * @throws ValidationException
     */
    public function reserveSlotForOrder(
        Branch $branch,
        string $slotDate,
        string $startTime,
        string $orderType,
        int $prepTimeMinutes
    ): PickupSlot {
        $slot = PickupSlot::where('branch_id', $branch->id)
            ->where('slot_date', $slotDate)
            ->where('start_time', $startTime)
            ->lockForUpdate()
            ->first();

        if (!$slot) {
            // Nëse nuk ekziston ende rekordi, e krijojmë brenda transaksionit
            $config = $this->getEffectiveCapacityConfig($branch, Carbon::parse($slotDate));
            $intervalMin = $branch->slot_interval_minutes ?: 30;
            $startCarbon = Carbon::createFromFormat('Y-m-d H:i:s', "{$slotDate} {$startTime}");
            $endTime = $startCarbon->copy()->addMinutes($intervalMin)->format('H:i:s');

            $slot = PickupSlot::create([
                'branch_id' => $branch->id,
                'slot_date' => $slotDate,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'max_capacity' => $config['max_orders_per_slot'],
                'max_delivery_capacity' => $config['max_delivery_per_slot'],
                'max_pickup_capacity' => $config['max_pickup_per_slot'],
                'current_booked_count' => 0,
                'booked_delivery_count' => 0,
                'booked_pickup_count' => 0,
                'total_prep_time_minutes' => 0,
                'is_active' => true,
            ]);

            // Rifreskojmë me kyçje
            $slot = PickupSlot::where('id', $slot->id)->lockForUpdate()->first();
        } else {
            // Nëse sloti ekziston por nuk ka kapacitetet e dorëzimit të sinkronizuara, i përditësojmë
            $config = $this->getEffectiveCapacityConfig($branch, Carbon::parse($slotDate));
            $needsUpdate = false;
            if ($slot->max_delivery_capacity === null && $config['max_delivery_per_slot'] !== null) {
                $slot->max_delivery_capacity = $config['max_delivery_per_slot'];
                $needsUpdate = true;
            }
            if ($slot->max_pickup_capacity === null && $config['max_pickup_per_slot'] !== null) {
                $slot->max_pickup_capacity = $config['max_pickup_per_slot'];
                $needsUpdate = true;
            }
            if ($needsUpdate) {
                $slot->save();
            }
        }

        // 1. Validimi i përgjithshëm i kapacitetit
        if (!$slot->is_active) {
            throw ValidationException::withMessages([
                'time_slot' => ['Ky slot orari është çaktivizuar nga restoranti.'],
            ]);
        }

        if ($slot->current_booked_count >= $slot->max_capacity) {
            throw ValidationException::withMessages([
                'time_slot' => ['Kapaciteti për këtë orar sapo u plotësua nga një porosi tjetër. Ju lutem zgjidhni një orar tjetër.'],
            ]);
        }

        // 2. Validimi sipas llojit të shërbimit (delivery vs pickup)
        if ($orderType === 'delivery') {
            if ($slot->max_delivery_capacity !== null && $slot->booked_delivery_count >= $slot->max_delivery_capacity) {
                throw ValidationException::withMessages([
                    'time_slot' => ['Kapaciteti i dërgesave me korrier për këtë orar është plotësuar. Provoni marrje në sportel ose një orar tjetër.'],
                ]);
            }
        } elseif ($orderType === 'pickup') {
            if ($slot->max_pickup_capacity !== null && $slot->booked_pickup_count >= $slot->max_pickup_capacity) {
                throw ValidationException::withMessages([
                    'time_slot' => ['Kapaciteti i marrjes në sportel për këtë orar është plotësuar. Ju lutem zgjidhni një orar tjetër.'],
                ]);
            }
        }

        // 3. Validimi i ngarkesës së kuzhinës
        $config = $this->getEffectiveCapacityConfig($branch, Carbon::parse($slotDate));
        $maxWorkload = $config['max_kitchen_workload_minutes'] ?: 90;
        if (($slot->total_prep_time_minutes + $prepTimeMinutes) > $maxWorkload && $slot->current_booked_count > 0) {
            throw ValidationException::withMessages([
                'time_slot' => ['Kuzhina ka ngarkesë të lartë në këtë orar dhe nuk mund të pranojë porosi shtesë. Ju lutem zgjidhni orarin e ardhshëm.'],
            ]);
        }

        // 4. Rritja e numëruesve të zënë (Capacity reduction)
        $slot->current_booked_count += 1;
        if ($orderType === 'delivery') {
            $slot->booked_delivery_count += 1;
        } else {
            $slot->booked_pickup_count += 1;
        }
        $slot->total_prep_time_minutes += $prepTimeMinutes;
        $slot->save();

        return $slot;
    }

    /**
     * Rikthen kapacitetin e slotit kur një porosi anulohet.
     */
    public function releaseSlotForOrder(Order $order): void
    {
        if (!$order->time_slot_id) {
            return;
        }

        $slot = PickupSlot::where('id', $order->time_slot_id)->lockForUpdate()->first();
        if (!$slot) {
            return;
        }

        $slot->current_booked_count = max(0, $slot->current_booked_count - 1);
        if ($order->order_type === 'delivery') {
            $slot->booked_delivery_count = max(0, $slot->booked_delivery_count - 1);
        } else {
            $slot->booked_pickup_count = max(0, $slot->booked_pickup_count - 1);
        }

        $prepTime = (int) ($order->estimated_prep_time_minutes ?: 20);
        $slot->total_prep_time_minutes = max(0, $slot->total_prep_time_minutes - $prepTime);
        $slot->save();
    }

    /**
     * Merr të dhënat e plota të kapacitetit dhe ngarkesës ditore për panelin e menaxhimit të restorantit.
     */
    public function getDailyCapacityOverview(Branch $branch, string $date): array
    {
        $timezone = $branch->timezone ?: 'Europe/Belgrade';
        $dateCarbon = Carbon::parse($date, $timezone);

        $slotsData = $this->getTimeSlots($branch, $date);
        $slots = $slotsData['slots'] ?? [];

        // Porositë e planifikuara për këtë datë
        $scheduledOrders = Order::with(['customer', 'items'])
            ->where('branch_id', $branch->id)
            ->where('is_scheduled', true)
            ->whereDate('scheduled_for', $date)
            ->orderBy('scheduled_for', 'asc')
            ->get();

        $totalCapacity = 0;
        $totalBooked = 0;
        $totalWorkload = 0;
        $peakSlot = null;
        $peakBooked = -1;

        foreach ($slots as $s) {
            $totalCapacity += $s['max_capacity'];
            $totalBooked += $s['current_booked'];
            $totalWorkload += $s['workload_minutes'];

            if ($s['current_booked'] > $peakBooked) {
                $peakBooked = $s['current_booked'];
                $peakSlot = $s['time_label'];
            }
        }

        // Mbishkrimet aktive për degën
        $overrides = BranchCapacityOverride::where('branch_id', $branch->id)
            ->orderBy('date', 'asc')
            ->get();

        return [
            'success' => true,
            'branch_id' => $branch->id,
            'branch_name' => $branch->name,
            'date' => $date,
            'settings' => [
                'slot_interval_minutes' => $branch->slot_interval_minutes ?: 30,
                'max_orders_per_slot' => $branch->max_orders_per_slot ?: 10,
                'max_delivery_per_slot' => $branch->max_delivery_per_slot,
                'max_pickup_per_slot' => $branch->max_pickup_per_slot,
                'max_kitchen_workload_minutes' => $branch->max_kitchen_workload_minutes ?: 90,
                'order_lead_time_minutes' => $branch->order_lead_time_minutes ?: 20,
                'max_advance_days' => $branch->max_advance_days ?: 7,
            ],
            'summary' => [
                'total_slots' => count($slots),
                'total_capacity' => $totalCapacity,
                'total_booked' => $totalBooked,
                'total_remaining' => max(0, $totalCapacity - $totalBooked),
                'utilization_percentage' => $totalCapacity > 0 ? round(($totalBooked / $totalCapacity) * 100) : 0,
                'peak_slot' => $peakBooked > 0 ? $peakSlot : 'N/A',
                'scheduled_orders_count' => $scheduledOrders->count(),
                'total_kitchen_workload_minutes' => $totalWorkload,
            ],
            'slots' => $slots,
            'scheduled_orders' => $scheduledOrders,
            'overrides' => $overrides,
        ];
    }
}
