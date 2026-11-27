<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\FinancialTransaction;
use App\Models\Order;
use App\Services\PaymentService;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(protected PaymentService $paymentService) {}

    /**
     * Simulon pagesën online lokale (success | declined | pending) për një porosi.
     */
    public function simulateOnlinePayment(Request $request)
    {
        $validated = $request->validate([
            'order_number' => 'required|string',
            'outcome' => 'nullable|string|in:success,declined,pending',
        ]);

        $order = Order::where('order_number', $validated['order_number'])->firstOrFail();
        $user = $request->user('sanctum');

        if ($order->customer_id) {
            if (!$user || ($user->role === 'customer' && $order->customer_id !== $user->id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nuk keni autorizim për të paguar këtë porosi.',
                ], 403);
            }
        }

        $result = $this->paymentService->initiateSimulatedOnlinePayment(
            $order,
            $validated['outcome'] ?? 'success',
            $user
        );

        return response()->json([
            'success' => $result['payment']->status !== 'failed',
            'message' => $result['message'],
            'data' => $result,
        ], $result['payment']->status === 'failed' ? 402 : 200);
    }

    /**
     * Kthen statusin e pagesës, referencën e transaksionit dhe rimbursimet për një porosi.
     */
    public function orderPaymentStatus(string $orderNumber, Request $request)
    {
        $order = Order::with(['payment', 'refunds'])
            ->where('order_number', $orderNumber)
            ->firstOrFail();

        $user = $request->user('sanctum');
        if ($order->customer_id && $user && $user->role === 'customer' && $order->customer_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Nuk keni autorizim për këtë porosi.',
            ], 403);
        }

        $transactions = FinancialTransaction::where('order_id', $order->id)
            ->whereIn('type', ['customer_payment', 'cod_collection', 'refund'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'order_number' => $order->order_number,
                'payment_method' => $order->payment_method,
                'payment_status' => $order->payment_status,
                'total_price' => (float) $order->total_price,
                'payment' => $order->payment,
                'refunds' => $order->refunds,
                'transactions' => $transactions,
            ],
        ]);
    }

    /**
     * Korrieri regjistron arkëtimin e parave në dorë (COD) për dërgesën e tij.
     */
    public function collectCod(int $deliveryId, Request $request)
    {
        $validated = $request->validate([
            'notes' => 'nullable|string|max:255',
        ]);

        $user = $request->user();
        $delivery = Delivery::with('order')->findOrFail($deliveryId);

        if ($user->role === 'courier') {
            if (!$user->courier || $delivery->courier_id !== $user->courier->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nuk jeni i caktuar për këtë dërgesë.',
                ], 403);
            }
        } elseif (!in_array($user->role, ['super_admin', 'admin', 'branch_manager', 'owner'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Nuk keni leje për të arkëtuar pagesën COD.',
            ], 403);
        }

        $payment = $this->paymentService->recordCodCollection(
            $delivery->order,
            $user,
            $validated['notes'] ?? null
        );

        return response()->json([
            'success' => true,
            'message' => 'Pagesa COD u regjistrua si e arkëtuar.',
            'data' => $payment,
        ]);
    }
}
