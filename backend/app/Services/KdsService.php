<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\Station;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class KdsService
{
    /**
     * Merr biletat aktive për ekranin e kuzhinës me llogaritje të urgjencës, stacioneve dhe orareve.
     */
    public function getActiveTickets(?int $branchId = null, string $stationCode = 'ALL')
    {
        $now = Carbon::now();

        $query = Order::with([
            'customer',
            'branch',
            'items.options',
            'items.station',
            'statusHistory.changedBy',
            'readyTimeHistory',
            'timeSlot'
        ])
        ->whereIn('status', ['confirmed', 'in_preparation'])
        ->whereNull('bumped_at');

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $orders = $query->get();

        // Përpunimi dhe pasurimi i secilës biletë
        $enrichedTickets = $orders->map(function (Order $order) use ($now, $stationCode) {
            // Llogaritja e kohës së kaluar (në minuta)
            $startTime = $order->started_preparing_at ?? $order->created_at;
            $elapsedSeconds = max(0, $now->diffInSeconds($startTime, false));
            $elapsedMinutes = (int) floor($elapsedSeconds / 60);

            $estimatedPrepMinutes = $order->estimated_prep_time_minutes ?: 15;
            $delayMinutes = max(0, $elapsedMinutes - $estimatedPrepMinutes);

            // Përcaktimi i nivelit të urgjencës
            $urgency = 'normal';
            if ($order->priority === 'urgent' || $elapsedMinutes >= $estimatedPrepMinutes) {
                $urgency = 'urgent';
            } elseif ($order->priority === 'high' || $elapsedMinutes >= (int)($estimatedPrepMinutes * 0.7)) {
                $urgency = 'warning';
            }

            // Statistikat e artikujve
            $totalItems = $order->items->count();
            $readyItems = $order->items->where('item_status', 'ready')->count();
            $preparingItems = $order->items->where('item_status', 'preparing')->count();
            $pendingItems = $order->items->where('item_status', 'pending')->count();
            $isFullyReady = ($totalItems > 0 && $readyItems === $totalItems);

            // Përcaktimi i artikujve për këtë stacion specifik
            $stationUpper = strtoupper(trim($stationCode));
            $itemsForStation = $order->items;
            $hasItemsForStation = true;

            if ($stationUpper !== 'ALL' && $stationUpper !== 'PACKING') {
                $itemsForStation = $order->items->filter(function ($item) use ($stationUpper) {
                    $code = strtoupper($item->station?->code ?? 'GRILL');
                    return $code === $stationUpper;
                })->values();

                $hasItemsForStation = $itemsForStation->count() > 0;
            }

            // Shto atributet dinamike
            $order->elapsed_seconds = $elapsedSeconds;
            $order->elapsed_minutes = $elapsedMinutes;
            $order->delay_minutes = $delayMinutes;
            $order->urgency = $urgency;
            $order->total_items_count = $totalItems;
            $order->ready_items_count = $readyItems;
            $order->preparing_items_count = $preparingItems;
            $order->pending_items_count = $pendingItems;
            $order->is_fully_ready = $isFullyReady;
            $order->station_filtered_items = $itemsForStation;
            $order->has_items_for_station = $hasItemsForStation;

            return $order;
        });

        // Filtrimi sipas stacionit nëse nuk është ALL apo PACKING
        if (strtoupper($stationCode) !== 'ALL' && strtoupper($stationCode) !== 'PACKING') {
            $enrichedTickets = $enrichedTickets->filter(fn($o) => $o->has_items_for_station)->values();
        }

        // Renditja inteligjente:
        // 1. Urgjente / Të vonuara në fillim
        // 2. High priority
        // 3. FIFO sipas created_at (ose scheduled_for për porositë e planifikuara)
        return $enrichedTickets->sort(function ($a, $b) {
            $urgencyWeight = ['urgent' => 3, 'warning' => 2, 'normal' => 1];
            $weightA = $urgencyWeight[$a->urgency] ?? 1;
            $weightB = $urgencyWeight[$b->urgency] ?? 1;

            if ($weightA !== $weightB) {
                return $weightB <=> $weightA; // Pesha më e madhe e para
            }

            // Nëse kanë të njëjtën urgjencë, kontrollo kohën e planifikuar
            $timeA = $a->scheduled_for ? $a->scheduled_for->timestamp : $a->created_at->timestamp;
            $timeB = $b->scheduled_for ? $b->scheduled_for->timestamp : $b->created_at->timestamp;

            return $timeA <=> $timeB;
        })->values();
    }

    /**
     * Merr biletat e larguara (Bumped / Finished) për mundësi rishikimi dhe Recall.
     */
    public function getBumpedTickets(?int $branchId = null, int $limit = 30)
    {
        $query = Order::with([
            'customer',
            'branch',
            'items.options',
            'items.station',
            'statusHistory.changedBy',
            'readyTimeHistory'
        ])
        ->where(function (Builder $b) {
            $b->whereNotNull('bumped_at')
              ->orWhereIn('status', ['ready_for_pickup', 'completed']);
        });

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        return $query->orderByRaw('COALESCE(bumped_at, updated_at) DESC')
            ->limit($limit)
            ->get();
    }

    /**
     * Përditëson statusin e një artikulli individual brenda porosisë (Item-Level Tracking).
     */
    public function updateItemStatus(int $itemId, string $newStatus, ?int $userId = null): array
    {
        if (!in_array($newStatus, ['pending', 'preparing', 'ready'])) {
            throw new \InvalidArgumentException("Statusi i pavlefshëm: {$newStatus}");
        }

        return DB::transaction(function () use ($itemId, $newStatus, $userId) {
            $item = OrderItem::with('order.items')->findOrFail($itemId);
            $order = $item->order;

            $now = Carbon::now();
            $item->item_status = $newStatus;
            if ($newStatus === 'preparing' && !$item->started_at) {
                $item->started_at = $now;
            } elseif ($newStatus === 'ready') {
                if (!$item->started_at) {
                    $item->started_at = $now;
                }
                $item->completed_at = $now;
            }
            $item->save();

            // Rifreskojmë të gjithë artikujt e kësaj porosie për të përcaktuar statusin e saj
            $allItems = OrderItem::where('order_id', $order->id)->get();
            $anyPreparing = $allItems->contains('item_status', 'preparing');
            $allReady = ($allItems->count() > 0 && $allItems->every(fn($i) => $i->item_status === 'ready'));

            $orderStatusChanged = false;
            $oldOrderStatus = $order->status;

            // 1. Nëse porosia ishte 'confirmed' dhe ndonjë artikull kaloi në 'preparing' apo 'ready',
            // porosia automatikisht kalon në 'in_preparation'
            if ($order->status === 'confirmed' && ($anyPreparing || $allReady)) {
                $order->status = 'in_preparation';
                if (!$order->started_preparing_at) {
                    $order->started_preparing_at = $now;
                }
                $order->save();
                $orderStatusChanged = true;

                OrderStatusHistory::create([
                    'order_id' => $order->id,
                    'from_status' => $oldOrderStatus,
                    'to_status' => 'in_preparation',
                    'changed_by_user_id' => $userId,
                    'reason_or_notes' => "Filloi përgatitja e artikullit '{$item->product_name_snapshot}' në kuzhinë.",
                ]);
            }

            // 2. Nëse të gjithë artikujt u bënë 'ready', porosia shënohet gati (ready_for_pickup)
            if ($allReady && $order->status === 'in_preparation') {
                $order->status = 'ready_for_pickup';
                $order->save();
                $orderStatusChanged = true;

                OrderStatusHistory::create([
                    'order_id' => $order->id,
                    'from_status' => 'in_preparation',
                    'to_status' => 'ready_for_pickup',
                    'changed_by_user_id' => $userId,
                    'reason_or_notes' => 'Të gjithë artikujt e porosisë janë përfunduar me sukses në kuzhinë.',
                ]);
            }

            $freshOrder = $order->fresh();
            if ($orderStatusChanged && $freshOrder) {
                $actor = $userId ? \App\Models\User::find($userId) : null;
                app(NotificationService::class)->notifyOrderStatusChanged(
                    $freshOrder,
                    $oldOrderStatus,
                    $freshOrder->status,
                    $actor
                );
            }

            return [
                'item' => $item->fresh(['station', 'options']),
                'order_status' => $freshOrder->status,
                'order_status_changed' => $orderStatusChanged,
                'is_fully_ready' => $allReady,
            ];
        });
    }

    /**
     * Bump: Largon biletën nga ekrani aktiv, shënon të gjithë artikujt gati dhe cakton bumped_at.
     */
    public function bumpTicket(int $orderId, ?string $reason = null, ?int $userId = null): Order
    {
        return DB::transaction(function () use ($orderId, $reason, $userId) {
            $order = Order::with('items')->findOrFail($orderId);
            $now = Carbon::now();
            $oldStatus = $order->status;

            // Caktojmë bumped_at
            $order->bumped_at = $now;

            // Nëse porosia nuk ishte përfunduar, kalon në ready_for_pickup (ose completed nëse është pickup dhe e dorëzuar)
            $targetStatus = 'ready_for_pickup';
            $order->status = $targetStatus;
            $order->save();

            // Gjithashtu shënojmë të gjithë artikujt si 'ready'
            OrderItem::where('order_id', $order->id)
                ->where('item_status', '!=', 'ready')
                ->update([
                    'item_status' => 'ready',
                    'completed_at' => $now,
                ]);

            OrderStatusHistory::create([
                'order_id' => $order->id,
                'from_status' => $oldStatus,
                'to_status' => $targetStatus,
                'changed_by_user_id' => $userId,
                'reason_or_notes' => $reason ?: 'Bileta u bump-ua nga ekrani i kuzhinës (U përfundua).',
            ]);

            if ($oldStatus !== $targetStatus) {
                $actor = $userId ? \App\Models\User::find($userId) : null;
                app(NotificationService::class)->notifyOrderStatusChanged(
                    $order->fresh(),
                    $oldStatus,
                    $targetStatus,
                    $actor
                );
            }

            return $order->fresh(['customer', 'branch', 'items.station', 'items.options']);
        });
    }

    /**
     * Recall: Rikthen një biletë të përfunduar/bumped përsëri në ekranin aktiv të KDS.
     */
    public function recallTicket(int $orderId, ?string $reason = null, ?int $userId = null): Order
    {
        return DB::transaction(function () use ($orderId, $reason, $userId) {
            $order = Order::with('items')->findOrFail($orderId);
            $oldStatus = $order->status;

            // Heqim bumped_at
            $order->bumped_at = null;
            $order->status = 'in_preparation';
            $order->save();

            // Rivendosim artikullin e parë si 'preparing' në mënyrë që të mbetet aktiv në stacion
            $firstItem = $order->items->first();
            if ($firstItem) {
                $firstItem->update(['item_status' => 'preparing']);
            }

            OrderStatusHistory::create([
                'order_id' => $order->id,
                'from_status' => $oldStatus,
                'to_status' => 'in_preparation',
                'changed_by_user_id' => $userId,
                'reason_or_notes' => $reason ?: 'Porosia u rikthye në ekranin e kuzhinës (Recall).',
            ]);

            return $order->fresh(['customer', 'branch', 'items.station', 'items.options']);
        });
    }

    /**
     * Ndryshon prioritetin e porosisë (normal, high, urgent).
     */
    public function updateOrderPriority(int $orderId, string $priority, ?int $userId = null): Order
    {
        if (!in_array($priority, ['normal', 'high', 'urgent'])) {
            throw new \InvalidArgumentException("Prioriteti i pavlefshëm: {$priority}");
        }

        $order = Order::findOrFail($orderId);
        $order->priority = $priority;
        $order->save();

        OrderStatusHistory::create([
            'order_id' => $order->id,
            'from_status' => $order->status,
            'to_status' => $order->status,
            'changed_by_user_id' => $userId,
            'reason_or_notes' => "Prioriteti i porosisë u ndryshua në: {$priority}",
        ]);

        if ($priority === 'urgent') {
            $notifService = app(NotificationService::class);
            $notifService->notifyOrderAttentionRequired($order, 'Porosia u shënua me prioritet URGJENT dhe kërkon vëmendje të menjëhershme.');
            if ($order->delivery) {
                $notifService->notifyCourierDeliveryUpdated($order->delivery, 'Prioriteti i dërgesës u ndryshua në URGJENT.');
            }
        }

        return $order;
    }

    /**
     * Statistika në kohë reale për kryefaqen e KDS.
     */
    public function getKdsStats(?int $branchId = null): array
    {
        $activeQuery = Order::whereIn('status', ['confirmed', 'in_preparation'])
            ->whereNull('bumped_at');

        if ($branchId) {
            $activeQuery->where('branch_id', $branchId);
        }

        $activeOrders = $activeQuery->get();
        $now = Carbon::now();

        $activeCount = $activeOrders->count();
        $inPrepCount = $activeOrders->where('status', 'in_preparation')->count();
        $urgentCount = $activeOrders->filter(function ($order) use ($now) {
            if ($order->priority === 'urgent') return true;
            $startTime = $order->started_preparing_at ?? $order->created_at;
            $elapsed = $now->diffInMinutes($startTime);
            return $elapsed >= ($order->estimated_prep_time_minutes ?: 15);
        })->count();

        // Porositë e përfunduara sot
        $completedTodayQuery = Order::whereDate('created_at', Carbon::today())
            ->where(function (Builder $b) {
                $b->whereNotNull('bumped_at')
                  ->orWhereIn('status', ['ready_for_pickup', 'completed']);
            });

        if ($branchId) {
            $completedTodayQuery->where('branch_id', $branchId);
        }

        $completedTodayCount = $completedTodayQuery->count();

        return [
            'active_orders' => $activeCount,
            'in_preparation' => $inPrepCount,
            'urgent_orders' => $urgentCount,
            'completed_today' => $completedTodayCount,
            'timestamp' => $now->toIso8601String(),
        ];
    }

    /**
     * Përgjigje ultra e lehtë për sinkronizim të shpejtë (Smart Polling çdo 3-4s).
     */
    public function getSyncInfo(?int $branchId = null): array
    {
        $query = Order::whereIn('status', ['confirmed', 'in_preparation'])
            ->whereNull('bumped_at');

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $count = $query->count();
        $latestOrder = $query->latest('updated_at')->first(['id', 'updated_at']);

        return [
            'active_count' => $count,
            'latest_order_id' => $latestOrder?->id,
            'latest_updated_at' => $latestOrder?->updated_at?->toIso8601String(),
            'checksum' => md5($count . '_' . ($latestOrder?->id ?? 0) . '_' . ($latestOrder?->updated_at ?? '')),
            'server_time' => Carbon::now()->toIso8601String(),
        ];
    }

    /**
     * Merr stacionet e degës me numërimin e artikujve aktivë për çdo stacion.
     */
    public function getStationsWithCounts(?int $branchId = null): array
    {
        $activeOrderIds = Order::whereIn('status', ['confirmed', 'in_preparation'])
            ->whereNull('bumped_at')
            ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
            ->pluck('id');

        $stationsQuery = Station::where('is_active', true);
        if ($branchId) {
            $stationsQuery->where('branch_id', $branchId);
        }
        $stations = $stationsQuery->get();

        $activeItems = OrderItem::whereIn('order_id', $activeOrderIds)->get();

        $counts = [
            'ALL' => $activeItems->count(),
            'PACKING' => $activeItems->count(),
        ];

        foreach ($stations as $st) {
            $code = strtoupper($st->code);
            $counts[$code] = $activeItems->where('station_id', $st->id)->count();
        }

        return [
            'stations' => $stations,
            'counts' => $counts,
        ];
    }
}
