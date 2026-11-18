<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\OpeningHour;
use App\Models\Product;
use App\Models\SpecialOpeningHour;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class RestaurantAvailabilityService
{
    /**
     * Përcakton statusin dhe disponueshmërinë e plotë të degës në një moment të caktuar kohor.
     */
    public function getBranchAvailability(Branch $branch, ?Carbon $dateTime = null): array
    {
        $timezone = $branch->timezone ?: 'Europe/Belgrade';
        $now = $dateTime ? $dateTime->copy()->setTimezone($timezone) : Carbon::now($timezone);

        // 1. Sinkronizohet pauzimi i përkohshëm nëse afati ka kaluar
        $branch->syncTemporaryClosureState();

        if (!$branch->is_active) {
            return [
                'is_open' => false,
                'status' => 'closed',
                'status_label' => 'Mbyllur',
                'can_accept_orders' => false,
                'rejection_reason' => 'Kjo degë e restorantit nuk është aktive për momentin.',
                'is_temporarily_closed' => false,
                'paused_until' => null,
                'pause_reason' => null,
                'today_schedule' => [],
                'next_opening' => null,
                'is_special_day' => false,
                'special_day_reason' => null,
                'estimated_prep_time_minutes' => $branch->effectivePrepTime(),
                'busy_mode' => (bool) $branch->busy_mode,
                'accepts_delivery' => (bool) $branch->accepts_delivery,
                'accepts_pickup' => (bool) $branch->accepts_pickup,
            ];
        }

        // 2. Kontrollohet pauzimi i përkohshëm nga menaxheri/stafi
        if ($branch->is_temporarily_closed) {
            $reason = $branch->pause_reason ?: 'Pauzë e përkohshme e pranimit të porosive.';
            $nextOpeningLabel = null;
            if ($branch->paused_until) {
                $timeFormatted = $branch->paused_until->copy()->setTimezone($timezone)->format('H:i');
                $nextOpeningLabel = "Pritet të rihapet rreth orës {$timeFormatted}";
            }

            return [
                'is_open' => false,
                'status' => 'temporarily_closed',
                'status_label' => 'Përkohësisht i Mbyllur',
                'can_accept_orders' => false,
                'rejection_reason' => $reason,
                'is_temporarily_closed' => true,
                'paused_until' => $branch->paused_until?->toIso8601String(),
                'pause_reason' => $reason,
                'today_schedule' => $this->getTodayScheduleIntervals($branch, $now),
                'next_opening' => $branch->paused_until ? [
                    'time' => $branch->paused_until->copy()->setTimezone($timezone)->format('H:i'),
                    'label' => $nextOpeningLabel,
                ] : null,
                'is_special_day' => false,
                'special_day_reason' => null,
                'estimated_prep_time_minutes' => $branch->effectivePrepTime(),
                'busy_mode' => (bool) $branch->busy_mode,
                'accepts_delivery' => (bool) $branch->accepts_delivery,
                'accepts_pickup' => (bool) $branch->accepts_pickup,
            ];
        }

        // 3. Kontrollohen oraret speciale / festat / ditët e pushimit
        $todayDate = $now->format('Y-m-d');
        $specialHour = SpecialOpeningHour::where('branch_id', $branch->id)
            ->where('date', $todayDate)
            ->first();

        $isSpecialDay = false;
        $specialDayReason = null;

        if ($specialHour) {
            $isSpecialDay = true;
            $specialDayReason = $specialHour->reason_or_occasion ?: 'Orar i Veçantë Festash';

            if ($specialHour->is_closed) {
                $nextOpening = $this->findNextOpening($branch, $now);
                return [
                    'is_open' => false,
                    'status' => 'closed',
                    'status_label' => 'Mbyllur për Festë',
                    'can_accept_orders' => false,
                    'rejection_reason' => "Mbyllur sot: {$specialDayReason}.",
                    'is_temporarily_closed' => false,
                    'paused_until' => null,
                    'pause_reason' => null,
                    'today_schedule' => [],
                    'next_opening' => $nextOpening,
                    'is_special_day' => true,
                    'special_day_reason' => $specialDayReason,
                    'estimated_prep_time_minutes' => $branch->effectivePrepTime(),
                    'busy_mode' => (bool) $branch->busy_mode,
                    'accepts_delivery' => (bool) $branch->accepts_delivery,
                    'accepts_pickup' => (bool) $branch->accepts_pickup,
                ];
            }

            // Nëse orari special ka orë specifike pune për këtë datë
            if ($specialHour->open_time && $specialHour->close_time) {
                $isOpenSpecial = $this->isTimeInInterval($now, $specialHour->open_time, $specialHour->close_time);
                $specialSchedule = [
                    [
                        'open' => substr($specialHour->open_time, 0, 5),
                        'close' => substr($specialHour->close_time, 0, 5),
                        'label' => $specialDayReason,
                        'is_overnight' => $specialHour->close_time < $specialHour->open_time,
                    ]
                ];

                if ($isOpenSpecial) {
                    return [
                        'is_open' => true,
                        'status' => 'open',
                        'status_label' => 'Hapur',
                        'can_accept_orders' => true,
                        'rejection_reason' => null,
                        'is_temporarily_closed' => false,
                        'paused_until' => null,
                        'pause_reason' => null,
                        'today_schedule' => $specialSchedule,
                        'next_opening' => null,
                        'is_special_day' => true,
                        'special_day_reason' => $specialDayReason,
                        'estimated_prep_time_minutes' => $branch->effectivePrepTime(),
                        'busy_mode' => (bool) $branch->busy_mode,
                        'accepts_delivery' => (bool) $branch->accepts_delivery,
                        'accepts_pickup' => (bool) $branch->accepts_pickup,
                    ];
                }

                // Kontrollo nëse hapet së shpejti
                $openTimeCarbon = Carbon::createFromFormat('Y-m-d H:i:s', "{$todayDate} {$specialHour->open_time}", $timezone);
                $isOpeningSoon = $openTimeCarbon->isFuture() && $now->diffInMinutes($openTimeCarbon) <= 60;

                return [
                    'is_open' => false,
                    'status' => $isOpeningSoon ? 'scheduled_opening' : 'closed',
                    'status_label' => $isOpeningSoon ? 'Hapet së shpejti' : 'Mbyllur',
                    'can_accept_orders' => false,
                    'rejection_reason' => "Restoranti është i mbyllur sipas orarit festiv ({$specialDayReason}).",
                    'is_temporarily_closed' => false,
                    'paused_until' => null,
                    'pause_reason' => null,
                    'today_schedule' => $specialSchedule,
                    'next_opening' => [
                        'date' => $todayDate,
                        'time' => substr($specialHour->open_time, 0, 5),
                        'label' => "Hapet sot në " . substr($specialHour->open_time, 0, 5),
                    ],
                    'is_special_day' => true,
                    'special_day_reason' => $specialDayReason,
                    'estimated_prep_time_minutes' => $branch->effectivePrepTime(),
                    'busy_mode' => (bool) $branch->busy_mode,
                    'accepts_delivery' => (bool) $branch->accepts_delivery,
                    'accepts_pickup' => (bool) $branch->accepts_pickup,
                ];
            }
        }

        // 4. Kontrollohet orari normal javor (me mbështetje për intervale të shumta dhe orare pas mesnatës)
        $todaySchedule = $this->getTodayScheduleIntervals($branch, $now);
        $isOpenNow = false;
        $matchingInterval = null;

        // Kontrollojmë intervalet e sotme
        foreach ($todaySchedule as $interval) {
            if ($this->isTimeInInterval($now, $interval['open'], $interval['close'])) {
                $isOpenNow = true;
                $matchingInterval = $interval;
                break;
            }
        }

        // Nëse nuk u gjet i hapur sot, kontrollojmë nëse dita e djeshme kishte orar nate (past midnight)
        if (!$isOpenNow) {
            $yesterday = $now->copy()->subDay();
            $yesterdayDayOfWeek = $yesterday->dayOfWeek; // 0=Sunday..6=Saturday
            $yesterdayOvernight = OpeningHour::where('branch_id', $branch->id)
                ->where('day_of_week', $yesterdayDayOfWeek)
                ->where('is_closed', false)
                ->where(function ($q) {
                    $q->where('is_overnight', true)
                      ->orWhereColumn('close_time', '<', 'open_time');
                })
                ->first();

            if ($yesterdayOvernight) {
                $currentTime = $now->format('H:i:s');
                if ($currentTime <= $yesterdayOvernight->close_time) {
                    $isOpenNow = true;
                    $matchingInterval = [
                        'open' => substr($yesterdayOvernight->open_time, 0, 5),
                        'close' => substr($yesterdayOvernight->close_time, 0, 5),
                        'label' => $yesterdayOvernight->label ?: 'Orar Nata',
                        'is_overnight' => true,
                    ];
                }
            }
        }

        if ($isOpenNow) {
            return [
                'is_open' => true,
                'status' => 'open',
                'status_label' => 'Hapur',
                'can_accept_orders' => true,
                'rejection_reason' => null,
                'is_temporarily_closed' => false,
                'paused_until' => null,
                'pause_reason' => null,
                'today_schedule' => $todaySchedule,
                'active_interval' => $matchingInterval,
                'next_opening' => null,
                'is_special_day' => false,
                'special_day_reason' => null,
                'estimated_prep_time_minutes' => $branch->effectivePrepTime(),
                'busy_mode' => (bool) $branch->busy_mode,
                'accepts_delivery' => (bool) $branch->accepts_delivery,
                'accepts_pickup' => (bool) $branch->accepts_pickup,
            ];
        }

        // Nëse është mbyllur: Gjejmë orën e radhës të hapjes dhe kontrollojmë nëse hapet së shpejti
        $nextOpening = $this->findNextOpening($branch, $now);
        $isOpeningSoon = false;

        if ($nextOpening && isset($nextOpening['datetime'])) {
            $diffMinutes = $now->diffInMinutes($nextOpening['datetime'], false);
            if ($diffMinutes > 0 && $diffMinutes <= 60) {
                $isOpeningSoon = true;
            }
        }

        return [
            'is_open' => false,
            'status' => $isOpeningSoon ? 'scheduled_opening' : 'closed',
            'status_label' => $isOpeningSoon ? 'Hapet së shpejti' : 'Mbyllur',
            'can_accept_orders' => false,
            'rejection_reason' => $nextOpening ? "Restoranti është i mbyllur. {$nextOpening['label']}." : 'Restoranti është i mbyllur aktualisht.',
            'is_temporarily_closed' => false,
            'paused_until' => null,
            'pause_reason' => null,
            'today_schedule' => $todaySchedule,
            'next_opening' => $nextOpening ? [
                'date' => $nextOpening['date'],
                'time' => $nextOpening['time'],
                'label' => $nextOpening['label'],
            ] : null,
            'is_special_day' => false,
            'special_day_reason' => null,
            'estimated_prep_time_minutes' => $branch->effectivePrepTime(),
            'busy_mode' => (bool) $branch->busy_mode,
            'accepts_delivery' => (bool) $branch->accepts_delivery,
            'accepts_pickup' => (bool) $branch->accepts_pickup,
        ];
    }

    /**
     * Merr intervalet e orarit për ditën e dhënë.
     */
    public function getTodayScheduleIntervals(Branch $branch, Carbon $now): array
    {
        $dayOfWeek = $now->dayOfWeek; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

        $hours = OpeningHour::where('branch_id', $branch->id)
            ->where('day_of_week', $dayOfWeek)
            ->where('is_closed', false)
            ->orderBy('sort_order')
            ->orderBy('open_time')
            ->get();

        $intervals = [];
        foreach ($hours as $h) {
            $isOvernight = $h->is_overnight || ($h->close_time < $h->open_time);
            $intervals[] = [
                'id' => $h->id,
                'open' => substr($h->open_time, 0, 5),
                'close' => substr($h->close_time, 0, 5),
                'label' => $h->label,
                'is_overnight' => $isOvernight,
            ];
        }

        return $intervals;
    }

    /**
     * Verifikon nëse koha e dhënë ndodhet brenda një intervali të caktuar (përfshirë oraret pas mesnate).
     */
    public function isTimeInInterval(Carbon $now, string $openTime, string $closeTime): bool
    {
        $openStr = strlen($openTime) === 5 ? "{$openTime}:00" : $openTime;
        $closeStr = strlen($closeTime) === 5 ? "{$closeTime}:00" : $closeTime;
        $currentStr = $now->format('H:i:s');

        // Orar normal brenda së njëjtës ditë (p.sh. 08:00 - 22:30)
        if ($closeStr > $openStr) {
            return $currentStr >= $openStr && $currentStr <= $closeStr;
        }

        // Orar nate pas mesnatës (p.sh. 20:00 - 02:00)
        // Në këtë rast hapet sot dhe përfundon të nesërmen në 02:00
        return $currentStr >= $openStr || $currentStr <= $closeStr;
    }

    /**
     * Gjen orën dhe datën e radhës kur restoranti hapet.
     */
    public function findNextOpening(Branch $branch, Carbon $now): ?array
    {
        $timezone = $branch->timezone ?: 'Europe/Belgrade';

        // Kërkojmë për 7 ditët e ardhshme
        for ($i = 0; $i < 7; $i++) {
            $checkDate = $now->copy()->addDays($i);
            $dateStr = $checkDate->format('Y-m-d');
            $dayOfWeek = $checkDate->dayOfWeek;

            // Kontrollojmë fillimisht ditët speciale
            $special = SpecialOpeningHour::where('branch_id', $branch->id)
                ->where('date', $dateStr)
                ->first();

            if ($special) {
                if ($special->is_closed) {
                    continue; // Kjo ditë është plotësisht e mbyllur
                }
                if ($special->open_time) {
                    $openCarbon = Carbon::createFromFormat('Y-m-d H:i:s', "{$dateStr} {$special->open_time}", $timezone);
                    if ($openCarbon->isAfter($now)) {
                        return [
                            'date' => $dateStr,
                            'time' => substr($special->open_time, 0, 5),
                            'datetime' => $openCarbon,
                            'label' => $this->formatNextOpeningLabel($now, $openCarbon, $special->reason_or_occasion),
                        ];
                    }
                }
            } else {
                // Kontrollojmë orarin javor
                $hours = OpeningHour::where('branch_id', $branch->id)
                    ->where('day_of_week', $dayOfWeek)
                    ->where('is_closed', false)
                    ->orderBy('open_time')
                    ->get();

                foreach ($hours as $h) {
                    $openCarbon = Carbon::createFromFormat('Y-m-d H:i:s', "{$dateStr} {$h->open_time}", $timezone);
                    if ($openCarbon->isAfter($now)) {
                        return [
                            'date' => $dateStr,
                            'time' => substr($h->open_time, 0, 5),
                            'datetime' => $openCarbon,
                            'label' => $this->formatNextOpeningLabel($now, $openCarbon, $h->label),
                        ];
                    }
                }
            }
        }

        return null;
    }

    /**
     * Formatim i lexueshëm në gjuhën shqipe për hapjen e radhës.
     */
    private function formatNextOpeningLabel(Carbon $now, Carbon $openDateTime, ?string $extraLabel = null): string
    {
        $timeStr = $openDateTime->format('H:i');
        $ditëtShqip = [
            0 => 'të dielën',
            1 => 'të hënën',
            2 => 'të martën',
            3 => 'të mërkurën',
            4 => 'të enjten',
            5 => 'të premten',
            6 => 'të shtunën',
        ];

        if ($now->isSameDay($openDateTime)) {
            $prefix = "Hapet sot në {$timeStr}";
        } elseif ($now->copy()->addDay()->isSameDay($openDateTime)) {
            $prefix = "Hapet nesër në {$timeStr}";
        } else {
            $emriDites = $ditëtShqip[$openDateTime->dayOfWeek] ?? 'së shpejti';
            $prefix = "Hapet {$emriDites} në {$timeStr}";
        }

        if ($extraLabel) {
            return "{$prefix} ({$extraLabel})";
        }

        return $prefix;
    }

    /**
     * Llogarit kohën e përgjithshme të përgatitjes për një porosi bazuar në degën dhe produktet në shportë.
     */
    public function calculateOrderPrepTime(Branch $branch, array $orderItems): int
    {
        $basePrepTime = $branch->effectivePrepTime();
        $maxItemPrepTime = 0;
        $totalItemsCount = 0;

        foreach ($orderItems as $item) {
            $qty = (int) ($item['quantity'] ?? 1);
            $totalItemsCount += $qty;

            if (isset($item['product_id'])) {
                $product = Product::find($item['product_id']);
                if ($product && $product->estimated_prep_minutes > $maxItemPrepTime) {
                    $maxItemPrepTime = (int) $product->estimated_prep_minutes;
                }
            } elseif (isset($item['product']) && is_object($item['product'])) {
                $prepMin = (int) ($item['product']->estimated_prep_minutes ?? 15);
                if ($prepMin > $maxItemPrepTime) {
                    $maxItemPrepTime = $prepMin;
                }
            }
        }

        // Koha finale përcaktohet nga maksimumi midis kohës bazë të degës dhe produktit më kompleks
        $calculated = max($basePrepTime, $maxItemPrepTime);

        // Nëse porosia ka shumë artikuj (mbi 4 artikuj), shtohet një bufer i vogël (p.sh. +5 min për ngarkesë)
        if ($totalItemsCount >= 5) {
            $calculated += 5;
        }

        return $calculated;
    }

    /**
     * Validon plotësisht në backend nëse një porosi mund të vendoset për këtë degë dhe këto artikuj.
     * Në rast se dega është e mbyllur, e pauzuar ose ndonjë produkt është i padisponueshëm, hidhet ValidationException.
     *
     * @throws ValidationException
     */
    public function validateOrderAvailability(Branch $branch, string $orderType, array $items): void
    {
        // 1. Verifikohet disponueshmëria e degës
        $availability = $this->getBranchAvailability($branch);

        if (!$availability['can_accept_orders']) {
            $mesazhi = $availability['rejection_reason'] ?: 'Restoranti nuk mund të pranojë porosi për momentin.';
            throw ValidationException::withMessages([
                'branch_id' => [$mesazhi],
            ]);
        }

        // 2. Verifikohet lloji i porosisë (delivery ose pickup)
        if ($orderType === 'delivery' && !$branch->accepts_delivery) {
            throw ValidationException::withMessages([
                'order_type' => ['Kjo degë nuk pranon dërgesa me korrier për momentin.'],
            ]);
        }

        if ($orderType === 'pickup' && !$branch->accepts_pickup) {
            throw ValidationException::withMessages([
                'order_type' => ['Kjo degë nuk pranon marrje në sportel (pickup) për momentin.'],
            ]);
        }

        // 3. Verifikohet disponueshmëria dhe stoku i secilit produkt
        foreach ($items as $item) {
            $productId = $item['product_id'] ?? null;
            $quantity = (int) ($item['quantity'] ?? 1);

            $product = Product::find($productId);
            if (!$product) {
                throw ValidationException::withMessages([
                    'items' => ["Artikulli me ID {$productId} nuk u gjet në sistem."],
                ]);
            }

            if (!$product->is_available || $product->is_out_of_stock) {
                $arsyeja = $product->temporary_unavailable_reason ?: 'është shitur ose nuk është aktiv';
                throw ValidationException::withMessages([
                    'items' => ["Artikulli '{$product->name}' nuk është i disponueshëm për porosi ({$arsyeja})."],
                ]);
            }

            if ($product->track_stock && $product->stock_quantity !== null) {
                if ($product->stock_quantity < $quantity) {
                    throw ValidationException::withMessages([
                        'items' => ["Sasia e kërkuar për '{$product->name}' tejkalon stokun e mbetur ({$product->stock_quantity} në gjendje)."],
                    ]);
                }
            }
        }
    }
}
