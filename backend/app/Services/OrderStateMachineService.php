<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderStatusHistory;
use InvalidArgumentException;

/**
 * Service managing atomic, legal state machine transitions for food orders.
 * Legal flow: pending -> confirmed -> in_preparation -> ready_for_pickup -> completed (or cancelled)
 */
class OrderStateMachineService
{
    protected array $allowedTransitions = [
        'pending' => ['confirmed', 'cancelled'],
        'confirmed' => ['in_preparation', 'cancelled'],
        'in_preparation' => ['ready_for_pickup'],
        'ready_for_pickup' => ['completed'],
        'completed' => [],
        'cancelled' => [],
    ];

    public function transition(Order $order, string $newStatus, int $changedByUserId, ?string $reason = null): Order
    {
        $currentStatus = $order->status;

        if (!in_array($newStatus, $this->allowedTransitions[$currentStatus] ?? [])) {
            throw new InvalidArgumentException("Illegal order status transition from '{$currentStatus}' to '{$newStatus}'.");
        }

        $order->status = $newStatus;
        $order->save();

        OrderStatusHistory::create([
            'order_id' => $order->id,
            'from_status' => $currentStatus,
            'to_status' => $newStatus,
            'changed_by_user_id' => $changedByUserId,
            'reason_or_notes' => $reason,
        ]);

        return $order;
    }
}
