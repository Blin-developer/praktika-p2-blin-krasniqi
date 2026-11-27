<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PaymentService
{
    public function __construct(
        protected FinancialService $financialService,
        protected NotificationService $notificationService,
    ) {}

    /**
     * Simulon pagesën online në mënyrë lokale dhe të sigurt (success | declined | pending).
     * Nuk mbledh të dhëna reale të kartelës dhe nuk lidhet me banka reale.
     */
    public function initiateSimulatedOnlinePayment(Order $order, string $outcome = 'success', ?User $actor = null): array
    {
        if (!in_array($outcome, ['success', 'declined', 'pending'], true)) {
            throw ValidationException::withMessages([
                'outcome' => ['Rezultati i simulimit duhet të jetë success, declined ose pending.'],
            ]);
        }

        return DB::transaction(function () use ($order, $outcome, $actor) {
            $lockedOrder = Order::with(['branch.restaurant', 'customer'])->where('id', $order->id)->lockForUpdate()->firstOrFail();

            if ($lockedOrder->status === 'cancelled') {
                throw ValidationException::withMessages([
                    'order' => ['Nuk mund të procesohet pagesa për një porosi të anuluar.'],
                ]);
            }

            if ($lockedOrder->payment_status === 'paid') {
                throw ValidationException::withMessages([
                    'payment' => ['Kjo porosi është paguar tashmë. Pagesat e dyfishta nuk lejohen.'],
                ]);
            }

            $payment = Payment::where('order_id', $lockedOrder->id)->lockForUpdate()->first();
            if (!$payment) {
                $payment = Payment::create([
                    'order_id' => $lockedOrder->id,
                    'amount' => $lockedOrder->total_price,
                    'currency' => 'EUR',
                    'method' => 'card',
                    'status' => 'pending',
                    'is_simulated' => true,
                ]);
            }

            $reference = 'SIM-PAY-' . strtoupper(Str::random(10));

            if ($outcome === 'success') {
                $payment->update([
                    'method' => 'card',
                    'status' => 'completed',
                    'is_simulated' => true,
                    'simulation_outcome' => 'success',
                    'failure_reason' => null,
                    'transaction_reference' => $reference,
                    'paid_at' => now(),
                    'processed_by_user_id' => $actor?->id,
                ]);

                $lockedOrder->update([
                    'payment_method' => 'card',
                    'payment_status' => 'paid',
                ]);

                $this->financialService->recordTransaction([
                    'order_id' => $lockedOrder->id,
                    'payment_id' => $payment->id,
                    'restaurant_id' => $lockedOrder->branch?->restaurant_id,
                    'branch_id' => $lockedOrder->branch_id,
                    'customer_id' => $lockedOrder->customer_id,
                    'type' => 'customer_payment',
                    'payment_method' => 'card',
                    'status' => 'successful',
                    'amount' => $payment->amount,
                    'description' => "Pagesë e simuluar online për porosinë #{$lockedOrder->order_number}",
                    'event_key' => "payment:success:{$reference}",
                    'completed_at' => now(),
                    'created_by_user_id' => $actor?->id,
                    'metadata' => ['is_simulated' => true, 'environment' => 'local_demo'],
                ]);

                $this->financialService->recordOrderCommission($lockedOrder);
                $this->notificationService->notifyPaymentSucceeded($lockedOrder, $reference);

                return [
                    'payment' => $payment->fresh(),
                    'order' => $lockedOrder->fresh(),
                    'reference' => $reference,
                    'message' => 'Pagesa e simuluar u krye me sukses (mjedis lokal demonstrues).',
                ];
            }

            if ($outcome === 'declined') {
                $reason = 'Pagesa e simuluar u refuzua (mjedis demonstrues).';
                $payment->update([
                    'method' => 'card',
                    'status' => 'failed',
                    'is_simulated' => true,
                    'simulation_outcome' => 'declined',
                    'failure_reason' => $reason,
                    'transaction_reference' => $reference,
                ]);

                $lockedOrder->update([
                    'payment_method' => 'card',
                    'payment_status' => 'failed',
                ]);

                $this->financialService->recordTransaction([
                    'order_id' => $lockedOrder->id,
                    'payment_id' => $payment->id,
                    'restaurant_id' => $lockedOrder->branch?->restaurant_id,
                    'branch_id' => $lockedOrder->branch_id,
                    'customer_id' => $lockedOrder->customer_id,
                    'type' => 'customer_payment',
                    'payment_method' => 'card',
                    'status' => 'failed',
                    'amount' => $payment->amount,
                    'description' => "Tentim i dështuar i pagesës së simuluar për porosinë #{$lockedOrder->order_number}",
                    'event_key' => "payment:failed:{$reference}",
                    'created_by_user_id' => $actor?->id,
                    'metadata' => ['is_simulated' => true, 'outcome' => 'declined'],
                ]);

                $this->notificationService->notifyPaymentFailed($lockedOrder, $reason);

                return [
                    'payment' => $payment->fresh(),
                    'order' => $lockedOrder->fresh(),
                    'reference' => $reference,
                    'message' => 'Pagesa e simuluar u refuzua. Ju lutem provoni sërish ose zgjidhni para në dorë.',
                ];
            }

            // outcome === 'pending'
            $payment->update([
                'method' => 'card',
                'status' => 'pending',
                'is_simulated' => true,
                'simulation_outcome' => 'pending',
                'transaction_reference' => $reference,
            ]);

            $this->financialService->recordTransaction([
                'order_id' => $lockedOrder->id,
                'payment_id' => $payment->id,
                'restaurant_id' => $lockedOrder->branch?->restaurant_id,
                'branch_id' => $lockedOrder->branch_id,
                'customer_id' => $lockedOrder->customer_id,
                'type' => 'customer_payment',
                'payment_method' => 'card',
                'status' => 'pending',
                'amount' => $payment->amount,
                'description' => "Pagesë e simuluar në pritje për porosinë #{$lockedOrder->order_number}",
                'event_key' => "payment:pending:{$reference}",
                'created_by_user_id' => $actor?->id,
                'metadata' => ['is_simulated' => true, 'outcome' => 'pending'],
            ]);

            return [
                'payment' => $payment->fresh(),
                'order' => $lockedOrder->fresh(),
                'reference' => $reference,
                'message' => 'Pagesa e simuluar është në pritje të konfirmimit.',
            ];
        });
    }

    /**
     * Regjistron arkëtimin e parave në dorë (COD) nga korrieri ose stafi i autorizuar.
     * Parandalon arkëtimet e dyfishta dhe nuk lejon arkëtim për dërgesat e anuluara/dështuara.
     */
    public function recordCodCollection(Order $order, User $actor, ?string $notes = null): Payment
    {
        return DB::transaction(function () use ($order, $actor, $notes) {
            $lockedOrder = Order::with(['branch.restaurant', 'delivery'])->where('id', $order->id)->lockForUpdate()->firstOrFail();

            if ($lockedOrder->status === 'cancelled' || $lockedOrder->delivery?->status === 'cancelled') {
                throw ValidationException::withMessages([
                    'order' => ['Nuk mund të arkëtohet COD për një porosi ose dërgesë të anuluar.'],
                ]);
            }

            if ($lockedOrder->delivery?->status === 'failed') {
                throw ValidationException::withMessages([
                    'delivery' => ['Nuk mund të arkëtohet COD pasi dërgesa ka dështuar.'],
                ]);
            }

            $payment = Payment::where('order_id', $lockedOrder->id)->lockForUpdate()->first();
            if (!$payment) {
                $payment = Payment::create([
                    'order_id' => $lockedOrder->id,
                    'amount' => $lockedOrder->total_price,
                    'currency' => 'EUR',
                    'method' => 'cash_on_delivery',
                    'status' => 'pending',
                    'is_simulated' => true,
                ]);
            }

            if ($payment->cod_collected) {
                return $payment; // Parandalo arkëtimin e dyfishtë
            }

            $reference = 'COD-' . strtoupper(Str::random(10));
            $isDelivered = $lockedOrder->status === 'completed' || $lockedOrder->delivery?->status === 'delivered';

            $payment->update([
                'method' => 'cash_on_delivery',
                'cod_collected' => true,
                'cod_collected_at' => now(),
                'cod_collected_by_user_id' => $actor->id,
                'cod_collection_notes' => $notes ?: 'Arkëtuar në dorë nga korrieri.',
                'transaction_reference' => $reference,
                'status' => $isDelivered ? 'completed' : 'pending',
                'paid_at' => $isDelivered ? now() : null,
                'processed_by_user_id' => $actor->id,
            ]);

            if ($isDelivered) {
                $lockedOrder->update(['payment_status' => 'paid']);
                $this->financialService->recordOrderCommission($lockedOrder);
            }

            $this->financialService->recordTransaction([
                'order_id' => $lockedOrder->id,
                'payment_id' => $payment->id,
                'restaurant_id' => $lockedOrder->branch?->restaurant_id,
                'branch_id' => $lockedOrder->branch_id,
                'customer_id' => $lockedOrder->customer_id,
                'courier_id' => $lockedOrder->delivery?->courier_id,
                'type' => 'cod_collection',
                'payment_method' => 'cash_on_delivery',
                'status' => 'successful',
                'amount' => $payment->amount,
                'description' => "Arkëtim COD nga korrieri për porosinë #{$lockedOrder->order_number}",
                'event_key' => "cod:collected:order:{$lockedOrder->id}",
                'completed_at' => now(),
                'created_by_user_id' => $actor->id,
                'metadata' => ['notes' => $notes],
            ]);

            $this->notificationService->notifyCodCollected($lockedOrder, $reference);

            return $payment->fresh();
        });
    }
}
