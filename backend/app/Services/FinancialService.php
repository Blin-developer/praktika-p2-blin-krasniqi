<?php

namespace App\Services;

use App\Models\Courier;
use App\Models\CourierEarning;
use App\Models\Delivery;
use App\Models\FinancialAdjustment;
use App\Models\FinancialSetting;
use App\Models\FinancialTransaction;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Restaurant;
use App\Models\RestaurantCommission;
use App\Models\RestaurantPayout;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class FinancialService
{
    public function toCents(float|int|string $amount): int
    {
        return (int) round(((float) $amount) * 100);
    }

    public function fromCents(int $cents): string
    {
        return number_format($cents / 100, 2, '.', '');
    }

    public function getDefaultCommissionRate(): string
    {
        return FinancialSetting::getValue('default_commission_rate', '15.00');
    }

    public function getDefaultCourierBaseFee(): string
    {
        return FinancialSetting::getValue('default_courier_base_fee', '1.50');
    }

    /**
     * Regjistron komisionin e restorantit nga nëntotali i porosisë (pa tarifën e dërgesës).
     * Parandalon dublikimet me lockForUpdate dhe order_id unik.
     */
    public function recordOrderCommission(Order $order): ?RestaurantCommission
    {
        if ($order->status === 'cancelled' || $order->payment_status === 'refunded') {
            return null;
        }

        return DB::transaction(function () use ($order) {
            $lockedOrder = Order::with('branch.restaurant')->where('id', $order->id)->lockForUpdate()->firstOrFail();
            $existing = RestaurantCommission::where('order_id', $lockedOrder->id)->first();
            if ($existing) {
                return $existing;
            }

            $restaurant = $lockedOrder->branch?->restaurant;
            if (!$restaurant) {
                return null;
            }

            $rate = $restaurant->commission_rate !== null
                ? (float) $restaurant->commission_rate
                : (float) $this->getDefaultCommissionRate();

            $subtotalCents = $this->toCents($lockedOrder->subtotal);
            $rateBasisPoints = (int) round($rate * 100); // p.sh. 15.00% -> 1500 bps
            $commissionCents = (int) round(($subtotalCents * $rateBasisPoints) / 10000);
            $netCents = max(0, $subtotalCents - $commissionCents);

            $commission = RestaurantCommission::create([
                'order_id' => $lockedOrder->id,
                'restaurant_id' => $restaurant->id,
                'branch_id' => $lockedOrder->branch_id,
                'gross_subtotal' => $this->fromCents($subtotalCents),
                'commission_rate' => number_format($rate, 2, '.', ''),
                'commission_amount' => $this->fromCents($commissionCents),
                'restaurant_net_earnings' => $this->fromCents($netCents),
                'status' => 'earned',
                'notes' => "Komision {$rate}% për porosinë #{$lockedOrder->order_number}.",
                'earned_at' => now(),
            ]);

            $this->recordTransaction([
                'order_id' => $lockedOrder->id,
                'restaurant_id' => $restaurant->id,
                'branch_id' => $lockedOrder->branch_id,
                'customer_id' => $lockedOrder->customer_id,
                'type' => 'restaurant_commission',
                'payment_method' => $lockedOrder->payment_method,
                'status' => 'successful',
                'amount' => $commission->commission_amount,
                'description' => "Komision TASTIO ({$commission->commission_rate}%) për porosinë #{$lockedOrder->order_number}",
                'event_key' => "commission:order:{$lockedOrder->id}",
                'completed_at' => now(),
                'metadata' => [
                    'gross_subtotal' => (float) $commission->gross_subtotal,
                    'restaurant_net_earnings' => (float) $commission->restaurant_net_earnings,
                ],
            ]);

            return $commission;
        });
    }

    /**
     * Kthen mbrapsht komisionin kur porosia anulohet ose rimbursohet plotësisht.
     */
    public function reverseOrderCommission(Order $order, string $reason = 'Porosia u anulua ose u rimbursua.'): void
    {
        DB::transaction(function () use ($order, $reason) {
            $commission = RestaurantCommission::where('order_id', $order->id)->lockForUpdate()->first();
            if (!$commission || $commission->status === 'reversed') {
                return;
            }

            $commission->update([
                'status' => 'reversed',
                'reversed_at' => now(),
                'notes' => $reason,
            ]);
        });
    }

    /**
     * Regjistron fitimin e korrierit për dërgesë të përfunduar me sukses (pa dublikim).
     */
    public function recordCourierEarning(Delivery $delivery): ?CourierEarning
    {
        if (!$delivery->courier_id || $delivery->status !== 'delivered') {
            return null;
        }

        return DB::transaction(function () use ($delivery) {
            $lockedDelivery = Delivery::with(['courier', 'order.branch'])->where('id', $delivery->id)->lockForUpdate()->firstOrFail();
            $existing = CourierEarning::where('delivery_id', $lockedDelivery->id)->first();
            if ($existing) {
                return $existing;
            }

            $courier = $lockedDelivery->courier;
            if (!$courier) {
                return null;
            }

            $baseFee = $courier->base_delivery_fee !== null
                ? (float) $courier->base_delivery_fee
                : (float) $this->getDefaultCourierBaseFee();

            $baseCents = $this->toCents($baseFee);
            $bonusCents = $lockedDelivery->priority === 'urgent' ? 50 : 0; // +€0.50 bonus për dërgesë urgjente
            $totalCents = $baseCents + $bonusCents;

            $earning = CourierEarning::create([
                'delivery_id' => $lockedDelivery->id,
                'order_id' => $lockedDelivery->order_id,
                'courier_id' => $courier->id,
                'base_fee' => $this->fromCents($baseCents),
                'bonus_amount' => $this->fromCents($bonusCents),
                'total_amount' => $this->fromCents($totalCents),
                'currency' => 'EUR',
                'status' => 'available',
                'notes' => "Kompensim për dërgesën #{$lockedDelivery->order?->order_number}",
            ]);

            $this->recordTransaction([
                'order_id' => $lockedDelivery->order_id,
                'restaurant_id' => $lockedDelivery->order?->branch?->restaurant_id,
                'branch_id' => $lockedDelivery->branch_id,
                'courier_id' => $courier->id,
                'type' => 'courier_earning',
                'status' => 'successful',
                'amount' => $earning->total_amount,
                'description' => "Fitim korrieri për dërgesën #{$lockedDelivery->order?->order_number}",
                'event_key' => "courier_earning:delivery:{$lockedDelivery->id}",
                'completed_at' => now(),
                'metadata' => [
                    'base_fee' => (float) $earning->base_fee,
                    'bonus_amount' => (float) $earning->bonus_amount,
                ],
            ]);

            return $earning;
        });
    }

    /**
     * Krijon dhe (opsionalisht) miraton një rimbursim të simuluar me kontroll rigoroz të kufirit.
     */
    public function createRefund(
        Order $order,
        float $amount,
        string $reason,
        User $actor,
        string $type = 'full',
        bool $autoComplete = true
    ): Refund {
        return DB::transaction(function () use ($order, $amount, $reason, $actor, $type, $autoComplete) {
            $lockedOrder = Order::with(['branch', 'payment'])->where('id', $order->id)->lockForUpdate()->firstOrFail();
            $payment = Payment::where('order_id', $lockedOrder->id)->lockForUpdate()->first();

            if (!$payment || !in_array($payment->status, ['completed', 'paid', 'partially_refunded'], true)) {
                throw ValidationException::withMessages([
                    'payment' => ['Kjo porosi nuk ka një pagesë të suksesshme që mund të rimbursohet.'],
                ]);
            }

            $paidCents = $this->toCents($payment->amount);
            $alreadyRefundedCents = $this->toCents($payment->refunded_amount);
            $requestedCents = $this->toCents($amount);

            if ($requestedCents <= 0) {
                throw ValidationException::withMessages([
                    'amount' => ['Shuma e rimbursimit duhet të jetë më e madhe se 0.'],
                ]);
            }

            $remainingCents = $paidCents - $alreadyRefundedCents;
            if ($remainingCents <= 0) {
                throw ValidationException::withMessages([
                    'amount' => ['Kjo pagesë është rimbursuar plotësisht më parë.'],
                ]);
            }

            if ($requestedCents > $remainingCents) {
                $remainingFormatted = $this->fromCents($remainingCents);
                throw ValidationException::withMessages([
                    'amount' => ["Shuma e rimbursimit nuk mund të tejkalojë shumën e mbetur prej €{$remainingFormatted}."],
                ]);
            }

            $resolvedType = $requestedCents === $remainingCents && $alreadyRefundedCents === 0 ? 'full' : ($type === 'full' && $requestedCents < $paidCents ? 'partial' : $type);
            $status = $autoComplete ? 'completed' : 'pending';
            $reference = 'REF-' . strtoupper(Str::random(10));

            $refund = Refund::create([
                'reference' => $reference,
                'order_id' => $lockedOrder->id,
                'payment_id' => $payment->id,
                'restaurant_id' => $lockedOrder->branch->restaurant_id,
                'amount' => $this->fromCents($requestedCents),
                'currency' => 'EUR',
                'type' => $resolvedType,
                'status' => $status,
                'reason' => $reason,
                'is_simulated' => true,
                'requested_by_user_id' => $actor->id,
                'approved_by_user_id' => $autoComplete ? $actor->id : null,
                'processed_at' => $autoComplete ? now() : null,
            ]);

            if ($autoComplete) {
                $this->applyCompletedRefundEffects($refund, $payment, $lockedOrder, $requestedCents, $actor);
            }

            app(NotificationService::class)->notifyRefundProcessed($refund);

            return $refund->fresh(['order', 'payment', 'restaurant']);
        });
    }

    public function processRefundDecision(Refund $refund, string $decision, User $admin, ?string $adminNotes = null): Refund
    {
        return DB::transaction(function () use ($refund, $decision, $admin, $adminNotes) {
            $lockedRefund = Refund::where('id', $refund->id)->lockForUpdate()->firstOrFail();
            if ($lockedRefund->status !== 'pending') {
                throw ValidationException::withMessages([
                    'refund' => ['Vetëm kërkesat në pritje mund të miratohen ose refuzohen.'],
                ]);
            }

            if ($decision === 'reject') {
                $lockedRefund->update([
                    'status' => 'rejected',
                    'admin_notes' => $adminNotes,
                    'approved_by_user_id' => $admin->id,
                    'processed_at' => now(),
                ]);
                app(NotificationService::class)->notifyRefundProcessed($lockedRefund);
                return $lockedRefund->fresh(['order', 'payment', 'restaurant']);
            }

            $payment = Payment::where('id', $lockedRefund->payment_id)->lockForUpdate()->firstOrFail();
            $order = Order::where('id', $lockedRefund->order_id)->lockForUpdate()->firstOrFail();

            $paidCents = $this->toCents($payment->amount);
            $alreadyRefundedCents = $this->toCents($payment->refunded_amount);
            $requestedCents = $this->toCents($lockedRefund->amount);

            if ($requestedCents > ($paidCents - $alreadyRefundedCents)) {
                throw ValidationException::withMessages([
                    'amount' => ['Shuma e rimbursimit tejkalon balancën e mbetur të pagesës.'],
                ]);
            }

            $lockedRefund->update([
                'status' => 'completed',
                'admin_notes' => $adminNotes,
                'approved_by_user_id' => $admin->id,
                'processed_at' => now(),
            ]);

            $this->applyCompletedRefundEffects($lockedRefund, $payment, $order, $requestedCents, $admin);
            app(NotificationService::class)->notifyRefundProcessed($lockedRefund);

            return $lockedRefund->fresh(['order', 'payment', 'restaurant']);
        });
    }

    private function applyCompletedRefundEffects(Refund $refund, Payment $payment, Order $order, int $refundedCents, User $actor): void
    {
        $newRefundedTotalCents = $this->toCents($payment->refunded_amount) + $refundedCents;
        $paidCents = $this->toCents($payment->amount);
        $isFull = $newRefundedTotalCents >= $paidCents;

        $payment->update([
            'refunded_amount' => $this->fromCents($newRefundedTotalCents),
            'status' => $isFull ? 'refunded' : 'partially_refunded',
        ]);

        $order->update([
            'payment_status' => $isFull ? 'refunded' : 'partially_refunded',
        ]);

        if ($isFull) {
            $this->reverseOrderCommission($order, "Komisioni u anulua pas rimbursimit të plotë ({$refund->reference}).");
        }

        $this->recordTransaction([
            'order_id' => $order->id,
            'payment_id' => $payment->id,
            'restaurant_id' => $refund->restaurant_id,
            'branch_id' => $order->branch_id,
            'customer_id' => $order->customer_id,
            'refund_id' => $refund->id,
            'type' => 'refund',
            'payment_method' => $payment->method,
            'status' => 'successful',
            'amount' => $refund->amount,
            'description' => "Rimbursim i simuluar ({$refund->type}) për porosinë #{$order->order_number}: {$refund->reason}",
            'event_key' => "refund:{$refund->id}:completed",
            'completed_at' => now(),
            'created_by_user_id' => $actor->id,
            'metadata' => ['is_simulated' => true, 'refund_reference' => $refund->reference],
        ]);
    }

    /**
     * Llogarit bilancin real financiar të një restoranti në cent.
     */
    public function getRestaurantBalance(int $restaurantId): array
    {
        $earnedCommissions = RestaurantCommission::where('restaurant_id', $restaurantId)
            ->where('status', 'earned')
            ->get();

        $grossSalesCents = $earnedCommissions->sum(fn ($c) => $this->toCents($c->gross_subtotal));
        $commissionCents = $earnedCommissions->sum(fn ($c) => $this->toCents($c->commission_amount));
        $netEarningsCents = $earnedCommissions->sum(fn ($c) => $this->toCents($c->restaurant_net_earnings));

        $partialRefundsCents = Refund::where('restaurant_id', $restaurantId)
            ->where('status', 'completed')
            ->where('type', 'partial')
            ->get()
            ->sum(fn ($r) => $this->toCents($r->amount));

        $adjustmentsCents = FinancialAdjustment::where('restaurant_id', $restaurantId)
            ->get()
            ->sum(fn ($a) => $this->toCents($a->amount));

        $completedPayoutsCents = RestaurantPayout::where('restaurant_id', $restaurantId)
            ->where('status', 'completed')
            ->get()
            ->sum(fn ($p) => $this->toCents($p->amount));

        $pendingPayoutsCents = RestaurantPayout::where('restaurant_id', $restaurantId)
            ->where('status', 'pending')
            ->get()
            ->sum(fn ($p) => $this->toCents($p->amount));

        $availableCents = max(0, $netEarningsCents - $partialRefundsCents + $adjustmentsCents - $completedPayoutsCents - $pendingPayoutsCents);

        return [
            'restaurant_id' => $restaurantId,
            'gross_sales' => (float) $this->fromCents($grossSalesCents),
            'total_commissions' => (float) $this->fromCents($commissionCents),
            'net_earnings' => (float) $this->fromCents($netEarningsCents),
            'partial_refunds_deducted' => (float) $this->fromCents($partialRefundsCents),
            'adjustments_net' => (float) $this->fromCents($adjustmentsCents),
            'completed_payouts' => (float) $this->fromCents($completedPayoutsCents),
            'pending_payouts' => (float) $this->fromCents($pendingPayoutsCents),
            'available_balance' => (float) $this->fromCents($availableCents),
        ];
    }

    /**
     * Krijon një pagesë të simuluar për restorantin duke parandaluar tejkalimin e bilancit.
     */
    public function createPayout(int $restaurantId, float $amount, User $admin, ?string $notes = null): RestaurantPayout
    {
        return DB::transaction(function () use ($restaurantId, $amount, $admin, $notes) {
            $restaurant = Restaurant::where('id', $restaurantId)->lockForUpdate()->firstOrFail();
            $requestedCents = $this->toCents($amount);

            if ($requestedCents <= 0) {
                throw ValidationException::withMessages([
                    'amount' => ['Shuma e pagesës duhet të jetë më e madhe se 0.'],
                ]);
            }

            $balance = $this->getRestaurantBalance($restaurant->id);
            $availableCents = $this->toCents($balance['available_balance']);

            if ($requestedCents > $availableCents) {
                $availStr = $this->fromCents($availableCents);
                throw ValidationException::withMessages([
                    'amount' => ["Bilanci i disponueshëm (€{$availStr}) nuk mjafton për këtë pagesë."],
                ]);
            }

            $payout = RestaurantPayout::create([
                'reference' => 'PAY-' . strtoupper(Str::random(10)),
                'restaurant_id' => $restaurant->id,
                'amount' => $this->fromCents($requestedCents),
                'currency' => 'EUR',
                'status' => 'pending',
                'is_simulated' => true,
                'notes' => $notes ?: 'Pagesë e simuluar për restorantin.',
                'created_by_user_id' => $admin->id,
            ]);

            $this->recordTransaction([
                'restaurant_id' => $restaurant->id,
                'payout_id' => $payout->id,
                'type' => 'restaurant_payout',
                'status' => 'pending',
                'amount' => $payout->amount,
                'description' => "Pagesë e simuluar në pritje për {$restaurant->name} ({$payout->reference})",
                'event_key' => "payout:{$payout->id}:created",
                'created_by_user_id' => $admin->id,
                'metadata' => ['is_simulated' => true],
            ]);

            app(NotificationService::class)->notifyPayoutEvent($payout);

            return $payout->fresh(['restaurant']);
        });
    }

    public function completePayout(RestaurantPayout $payout, User $admin): RestaurantPayout
    {
        return DB::transaction(function () use ($payout, $admin) {
            $locked = RestaurantPayout::with('restaurant')->where('id', $payout->id)->lockForUpdate()->firstOrFail();
            if ($locked->status !== 'pending') {
                throw ValidationException::withMessages([
                    'payout' => ['Vetëm pagesat në pritje mund të përfundohen.'],
                ]);
            }

            $locked->update([
                'status' => 'completed',
                'completed_by_user_id' => $admin->id,
                'completed_at' => now(),
            ]);

            FinancialTransaction::where('payout_id', $locked->id)->update([
                'status' => 'successful',
                'completed_at' => now(),
                'description' => "Pagesë e simuluar e përfunduar për {$locked->restaurant?->name} ({$locked->reference})",
            ]);

            app(NotificationService::class)->notifyPayoutEvent($locked);

            return $locked->fresh(['restaurant']);
        });
    }

    public function cancelPayout(RestaurantPayout $payout, User $admin): RestaurantPayout
    {
        return DB::transaction(function () use ($payout, $admin) {
            $locked = RestaurantPayout::with('restaurant')->where('id', $payout->id)->lockForUpdate()->firstOrFail();
            if ($locked->status !== 'pending') {
                throw ValidationException::withMessages([
                    'payout' => ['Vetëm pagesat në pritje mund të anulohen.'],
                ]);
            }

            $locked->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
            ]);

            FinancialTransaction::where('payout_id', $locked->id)->update([
                'status' => 'cancelled',
                'description' => "Pagesë e simuluar e anuluar ({$locked->reference})",
            ]);

            app(NotificationService::class)->notifyPayoutEvent($locked);

            return $locked->fresh(['restaurant']);
        });
    }

    public function createAdjustment(array $data, User $admin): FinancialAdjustment
    {
        return DB::transaction(function () use ($data, $admin) {
            $cents = $this->toCents($data['amount']);
            if ($cents === 0) {
                throw ValidationException::withMessages(['amount' => ['Shuma nuk mund të jetë 0.']]);
            }

            $adj = FinancialAdjustment::create([
                'reference' => 'ADJ-' . strtoupper(Str::random(10)),
                'restaurant_id' => $data['restaurant_id'] ?? null,
                'courier_id' => $data['courier_id'] ?? null,
                'order_id' => $data['order_id'] ?? null,
                'amount' => $this->fromCents($cents),
                'currency' => 'EUR',
                'reason' => $data['reason'],
                'created_by_user_id' => $admin->id,
            ]);

            $this->recordTransaction([
                'order_id' => $adj->order_id,
                'restaurant_id' => $adj->restaurant_id,
                'courier_id' => $adj->courier_id,
                'type' => 'financial_adjustment',
                'status' => 'successful',
                'amount' => $adj->amount,
                'description' => "Rregullim financiar ({$adj->reference}): {$adj->reason}",
                'event_key' => "adjustment:{$adj->id}",
                'completed_at' => now(),
                'created_by_user_id' => $admin->id,
            ]);

            app(NotificationService::class)->notifyFinancialAdjustment($adj);

            return $adj;
        });
    }

    public function recordTransaction(array $attrs): FinancialTransaction
    {
        if (!empty($attrs['event_key'])) {
            $existing = FinancialTransaction::where('event_key', $attrs['event_key'])->first();
            if ($existing) {
                return $existing;
            }
        }

        return FinancialTransaction::create(array_merge([
            'reference' => 'TXN-' . strtoupper(Str::random(10)),
            'currency' => 'EUR',
            'status' => 'pending',
        ], $attrs));
    }

    public function resolveDateRange(array $filters): array
    {
        $period = $filters['period'] ?? null;
        $now = Carbon::now();

        return match ($period) {
            'today' => [$now->copy()->startOfDay(), $now->copy()->endOfDay()],
            '7d' => [$now->copy()->subDays(6)->startOfDay(), $now->copy()->endOfDay()],
            '30d' => [$now->copy()->subDays(29)->startOfDay(), $now->copy()->endOfDay()],
            'month' => [$now->copy()->startOfMonth(), $now->copy()->endOfDay()],
            default => [
                !empty($filters['date_from']) ? Carbon::parse($filters['date_from'])->startOfDay() : null,
                !empty($filters['date_to']) ? Carbon::parse($filters['date_to'])->endOfDay() : null,
            ],
        };
    }

    public function getTransactions(array $filters, ?int $scopedRestaurantId = null, ?int $scopedCourierId = null)
    {
        $query = FinancialTransaction::with(['order', 'restaurant', 'branch', 'customer', 'courier.user']);

        if ($scopedRestaurantId) {
            $query->where('restaurant_id', $scopedRestaurantId);
        } elseif (!empty($filters['restaurant_id'])) {
            $query->where('restaurant_id', $filters['restaurant_id']);
        }

        if ($scopedCourierId) {
            $query->where('courier_id', $scopedCourierId);
        }

        if (!empty($filters['type']) && $filters['type'] !== 'all') {
            $query->where('type', $filters['type']);
        }

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['payment_method']) && $filters['payment_method'] !== 'all') {
            $query->where('payment_method', $filters['payment_method']);
        }

        [$from, $to] = $this->resolveDateRange($filters);
        if ($from) {
            $query->where('created_at', '>=', $from);
        }
        if ($to) {
            $query->where('created_at', '<=', $to);
        }

        if (!empty($filters['search'])) {
            $s = '%' . trim($filters['search']) . '%';
            $query->where(function ($q) use ($s) {
                $q->where('reference', 'like', $s)
                    ->orWhere('description', 'like', $s)
                    ->orWhereHas('order', fn ($oq) => $oq->where('order_number', 'like', $s));
            });
        }

        $perPage = min(50, max(5, (int) ($filters['per_page'] ?? 15)));
        return $query->orderBy('created_at', 'desc')->orderBy('id', 'desc')->paginate($perPage);
    }

    public function getSuperAdminDashboard(array $filters = []): array
    {
        [$from, $to] = $this->resolveDateRange($filters);

        $ordersQuery = Order::query()->where('status', '!=', 'cancelled');
        $paymentsQuery = Payment::query();
        $commQuery = RestaurantCommission::query()->where('status', 'earned');
        $courierQuery = CourierEarning::query()->where('status', '!=', 'cancelled');
        $refundsQuery = Refund::query()->where('status', 'completed');
        $payoutsQuery = RestaurantPayout::query();

        if ($from) {
            $ordersQuery->where('created_at', '>=', $from);
            $paymentsQuery->where('created_at', '>=', $from);
            $commQuery->where('created_at', '>=', $from);
            $courierQuery->where('created_at', '>=', $from);
            $refundsQuery->where('created_at', '>=', $from);
            $payoutsQuery->where('created_at', '>=', $from);
        }
        if ($to) {
            $ordersQuery->where('created_at', '<=', $to);
            $paymentsQuery->where('created_at', '<=', $to);
            $commQuery->where('created_at', '<=', $to);
            $courierQuery->where('created_at', '<=', $to);
            $refundsQuery->where('created_at', '<=', $to);
            $payoutsQuery->where('created_at', '<=', $to);
        }

        $totalPlatformSales = (float) (clone $ordersQuery)->whereIn('payment_status', ['paid', 'partially_refunded'])->sum('total_price');
        $totalPlatformCommissions = (float) (clone $commQuery)->sum('commission_amount');
        $totalRestaurantEarnings = (float) (clone $commQuery)->sum('restaurant_net_earnings');
        $totalCourierEarnings = (float) (clone $courierQuery)->sum('total_amount');

        $totalSuccessfulPayments = (float) (clone $paymentsQuery)->whereIn('status', ['completed', 'paid', 'partially_refunded'])->sum('amount');
        $totalCodCollections = (float) (clone $paymentsQuery)->where('method', 'cash_on_delivery')->where('cod_collected', true)->sum('amount');
        $pendingPaymentsAmount = (float) (clone $paymentsQuery)->where('status', 'pending')->sum('amount');
        $failedPaymentsCount = (clone $paymentsQuery)->where('status', 'failed')->count();
        $totalRefunds = (float) (clone $refundsQuery)->sum('amount');

        $pendingPayouts = (float) (clone $payoutsQuery)->where('status', 'pending')->sum('amount');
        $completedPayouts = (float) (clone $payoutsQuery)->where('status', 'completed')->sum('amount');

        // Shpërndarja sipas metodës së pagesës
        $paymentBreakdown = (clone $paymentsQuery)
            ->whereIn('status', ['completed', 'paid', 'partially_refunded'])
            ->selectRaw('method, COUNT(*) as count, COALESCE(SUM(amount), 0) as total')
            ->groupBy('method')
            ->get();

        // Top restorantet sipas të hyrave
        $topRestaurants = RestaurantCommission::with('restaurant')
            ->where('status', 'earned')
            ->when($from, fn ($q) => $q->where('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->where('created_at', '<=', $to))
            ->selectRaw('restaurant_id, COUNT(*) as orders_count, SUM(gross_subtotal) as gross_sales, SUM(commission_amount) as commissions, SUM(restaurant_net_earnings) as net_earnings')
            ->groupBy('restaurant_id')
            ->orderByDesc('gross_sales')
            ->limit(10)
            ->get();

        // Grafiku ditor (7-30 ditët e fundit)
        $chartStart = $from ?? Carbon::now()->subDays(13)->startOfDay();
        $dailyChart = Order::where('status', '!=', 'cancelled')
            ->where('created_at', '>=', $chartStart)
            ->when($to, fn ($q) => $q->where('created_at', '<=', $to))
            ->selectRaw('DATE(created_at) as date, COUNT(*) as orders_count, COALESCE(SUM(total_price), 0) as sales')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return [
            'summary' => [
                'total_platform_sales' => round($totalPlatformSales, 2),
                'total_platform_commissions' => round($totalPlatformCommissions, 2),
                'total_restaurant_earnings' => round($totalRestaurantEarnings, 2),
                'total_courier_earnings' => round($totalCourierEarnings, 2),
                'total_successful_payments' => round($totalSuccessfulPayments, 2),
                'total_cod_collections' => round($totalCodCollections, 2),
                'pending_payments_amount' => round($pendingPaymentsAmount, 2),
                'failed_payments_count' => $failedPaymentsCount,
                'total_refunds' => round($totalRefunds, 2),
                'pending_payouts' => round($pendingPayouts, 2),
                'completed_payouts' => round($completedPayouts, 2),
                'default_commission_rate' => (float) $this->getDefaultCommissionRate(),
            ],
            'payment_breakdown' => $paymentBreakdown,
            'top_restaurants' => $topRestaurants,
            'daily_chart' => $dailyChart,
        ];
    }

    public function getRestaurantDashboard(int $restaurantId, array $filters = []): array
    {
        [$from, $to] = $this->resolveDateRange($filters);

        $commQuery = RestaurantCommission::where('restaurant_id', $restaurantId)->where('status', 'earned');
        $ordersQuery = Order::whereHas('branch', fn ($q) => $q->where('restaurant_id', $restaurantId))
            ->where('status', '!=', 'cancelled')
            ->whereIn('payment_status', ['paid', 'partially_refunded']);
        $refundsQuery = Refund::where('restaurant_id', $restaurantId)->where('status', 'completed');

        if ($from) {
            $commQuery->where('created_at', '>=', $from);
            $ordersQuery->where('created_at', '>=', $from);
            $refundsQuery->where('created_at', '>=', $from);
        }
        if ($to) {
            $commQuery->where('created_at', '<=', $to);
            $ordersQuery->where('created_at', '<=', $to);
            $refundsQuery->where('created_at', '<=', $to);
        }

        $paidOrdersCount = (clone $ordersQuery)->count();
        $grossRevenue = (float) (clone $ordersQuery)->sum('total_price');
        $totalSales = (float) (clone $commQuery)->sum('gross_subtotal');
        $tastioCommissions = (float) (clone $commQuery)->sum('commission_amount');
        $netEarnings = (float) (clone $commQuery)->sum('restaurant_net_earnings');
        $refundTotals = (float) (clone $refundsQuery)->sum('amount');
        $avgOrderValue = $paidOrdersCount > 0 ? round($grossRevenue / $paidOrdersCount, 2) : 0.00;

        $balance = $this->getRestaurantBalance($restaurantId);

        $chartStart = $from ?? Carbon::now()->subDays(29)->startOfDay();
        $dailyChart = Order::whereHas('branch', fn ($q) => $q->where('restaurant_id', $restaurantId))
            ->where('status', '!=', 'cancelled')
            ->where('created_at', '>=', $chartStart)
            ->when($to, fn ($q) => $q->where('created_at', '<=', $to))
            ->selectRaw('DATE(created_at) as date, COUNT(*) as orders_count, COALESCE(SUM(total_price), 0) as revenue')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $paymentBreakdown = (clone $ordersQuery)
            ->selectRaw('payment_method as method, COUNT(*) as count, COALESCE(SUM(total_price), 0) as total')
            ->groupBy('payment_method')
            ->get();

        $commissionsHistory = RestaurantCommission::with('order')
            ->where('restaurant_id', $restaurantId)
            ->orderByDesc('created_at')
            ->limit(25)
            ->get();

        $payoutHistory = RestaurantPayout::where('restaurant_id', $restaurantId)
            ->orderByDesc('created_at')
            ->limit(25)
            ->get();

        return [
            'summary' => [
                'total_sales' => round($totalSales, 2),
                'gross_revenue' => round($grossRevenue, 2),
                'net_earnings' => round($netEarnings, 2),
                'tastio_commissions' => round($tastioCommissions, 2),
                'pending_payouts' => $balance['pending_payouts'],
                'completed_payouts' => $balance['completed_payouts'],
                'available_balance' => $balance['available_balance'],
                'refund_totals' => round($refundTotals, 2),
                'paid_orders_count' => $paidOrdersCount,
                'average_order_value' => $avgOrderValue,
            ],
            'daily_chart' => $dailyChart,
            'payment_breakdown' => $paymentBreakdown,
            'commissions_history' => $commissionsHistory,
            'payout_history' => $payoutHistory,
        ];
    }

    public function getCourierEarningsDashboard(int $courierId): array
    {
        $earnings = CourierEarning::with(['delivery.branch', 'order'])
            ->where('courier_id', $courierId)
            ->orderByDesc('created_at')
            ->get();

        $totalCents = $earnings->where('status', '!=', 'cancelled')->sum(fn ($e) => $this->toCents($e->total_amount));
        $pendingCents = $earnings->whereIn('status', ['pending', 'available'])->sum(fn ($e) => $this->toCents($e->total_amount));
        $paidCents = $earnings->where('status', 'paid')->sum(fn ($e) => $this->toCents($e->total_amount));
        $adjustmentsCents = FinancialAdjustment::where('courier_id', $courierId)->get()->sum(fn ($a) => $this->toCents($a->amount));

        return [
            'summary' => [
                'total_earnings' => (float) $this->fromCents($totalCents + $adjustmentsCents),
                'pending_earnings' => (float) $this->fromCents($pendingCents),
                'paid_earnings' => (float) $this->fromCents($paidCents),
                'completed_deliveries' => $earnings->where('status', '!=', 'cancelled')->count(),
            ],
            'history' => $earnings,
        ];
    }
}
