<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Courier;
use App\Models\Delivery;
use App\Models\FinancialAdjustment;
use App\Models\Order;
use App\Models\Refund;
use App\Models\RestaurantPayout;
use App\Models\StaffMembership;
use App\Models\User;
use App\Notifications\TastioSystemNotification;
use Illuminate\Support\Collection;

class NotificationService
{
    /**
     * Dërgon njoftim te një përdorues i caktuar përmes Laravel Notifications + TastioDatabaseChannel.
     */
    public function sendToUser(
        User $user,
        string $title,
        string $message,
        string $type = 'order_update',
        ?string $eventKey = null,
        ?array $payload = null,
        ?string $actionUrl = null,
        ?int $branchId = null,
    ): void {
        if (!$user->is_active) {
            return;
        }

        $user->notify(new TastioSystemNotification(
            title: $title,
            message: $message,
            type: $type,
            eventKey: $eventKey,
            payload: $payload,
            actionUrl: $actionUrl,
            branchId: $branchId,
        ));
    }

    /**
     * Dërgon njoftim te një koleksion përdoruesish duke shmangur dublikimet.
     */
    public function sendToUsers(
        Collection $users,
        string $title,
        string $message,
        string $type,
        ?string $eventKey = null,
        ?array $payload = null,
        ?string $actionUrl = null,
        ?int $branchId = null,
    ): void {
        $uniqueUsers = $users->filter(fn ($u) => $u instanceof User && $u->is_active)->unique('id');
        foreach ($uniqueUsers as $user) {
            $this->sendToUser($user, $title, $message, $type, $eventKey, $payload, $actionUrl, $branchId);
        }
    }

    /**
     * Njoftime kur krijohet një porosi e re:
     * - Klienti: Porosia u pranua (+ Pagesa u konfirmua nëse u pagua)
     * - Kuzhina & Menaxherët e degës: Porosi e re
     * - Adminët: Porosi e re në platformë (përmbledhje e rëndësishme)
     */
    public function notifyOrderCreated(Order $order): void
    {
        $order->loadMissing(['branch.restaurant', 'customer', 'items']);
        $branchName = $order->branch?->name ?? 'Restoranti';
        $orderNumber = $order->order_number;
        $totalFormatted = number_format((float) $order->total_price, 2);
        $itemsCount = $order->items->sum('quantity') ?: $order->items->count();
        $orderTypeLabel = match ($order->order_type) {
            'delivery' => 'Dërgesë',
            'pickup' => 'Marrje vetë',
            'dine_in' => 'Në lokal',
            default => $order->order_type,
        };

        $basePayload = [
            'order_id' => $order->id,
            'order_number' => $orderNumber,
            'branch_id' => $order->branch_id,
            'branch_name' => $branchName,
            'status' => $order->status,
        ];

        // 1. Klienti
        if ($order->customer) {
            $this->sendToUser(
                user: $order->customer,
                title: 'Porosia u pranua',
                message: "Porosia #{$orderNumber} u pranua nga {$branchName} dhe po dërgohet në kuzhinë.",
                type: 'customer_order',
                eventKey: "order:{$order->id}:created:customer",
                payload: $basePayload,
                actionUrl: "/porosite?order={$orderNumber}",
                branchId: $order->branch_id,
            );

            if ($order->payment_status === 'paid') {
                $this->sendToUser(
                    user: $order->customer,
                    title: 'Pagesa u konfirmua',
                    message: "Pagesa prej €{$totalFormatted} për porosinë #{$orderNumber} u konfirmua me sukses.",
                    type: 'payment_confirmed',
                    eventKey: "order:{$order->id}:payment_confirmed:customer",
                    payload: array_merge($basePayload, ['amount' => (float) $order->total_price]),
                    actionUrl: "/porosite?order={$orderNumber}",
                    branchId: $order->branch_id,
                );
            }
        }

        // 2. Stafi i Kuzhinës & Menaxherët e Degës (vetëm dega përkatëse)
        $branchRecipients = $this->getBranchStaffAndManagers($order->branch_id);
        $this->sendToUsers(
            users: $branchRecipients,
            title: 'Porosi e re',
            message: "Porosi e re #{$orderNumber} ({$orderTypeLabel}) me {$itemsCount} artikuj në {$branchName}.",
            type: 'kitchen_new_order',
            eventKey: "order:{$order->id}:created:kitchen",
            payload: array_merge($basePayload, ['items_count' => $itemsCount, 'order_type' => $order->order_type]),
            actionUrl: "/kds?order={$order->id}",
            branchId: $order->branch_id,
        );

        // 3. Administratorët e platformës
        $admins = $this->getPlatformAdmins($branchRecipients->pluck('id')->all());
        $this->sendToUsers(
            users: $admins,
            title: 'Porosi e re në platformë',
            message: "Porosia #{$orderNumber} (€{$totalFormatted}, {$orderTypeLabel}) u regjistrua te {$branchName}.",
            type: 'admin_new_order',
            eventKey: "order:{$order->id}:created:admin",
            payload: array_merge($basePayload, ['total_price' => (float) $order->total_price]),
            actionUrl: "/admin?order={$order->id}",
            branchId: $order->branch_id,
        );
    }

    /**
     * Njoftime kur ndryshon statusi i porosisë (KDS, Admin, Klient).
     */
    public function notifyOrderStatusChanged(Order $order, string $fromStatus, string $toStatus, ?User $actor = null, ?string $reason = null): void
    {
        if ($fromStatus === $toStatus) {
            return;
        }

        $order->loadMissing(['branch', 'customer', 'delivery.courier.user']);
        $branchName = $order->branch?->name ?? 'Restoranti';
        $orderNumber = $order->order_number;

        $basePayload = [
            'order_id' => $order->id,
            'order_number' => $orderNumber,
            'branch_id' => $order->branch_id,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
        ];

        // 1. Njoftimet për Klientin
        if ($order->customer) {
            $customerMsg = match ($toStatus) {
                'confirmed' => ['Porosia u pranua', "Porosia #{$orderNumber} u konfirmua nga {$branchName}."],
                'in_preparation' => $fromStatus === 'confirmed'
                    ? ['Restoranti filloi përgatitjen', "Kuzhina e {$branchName} filloi përgatitjen e porosisë #{$orderNumber}."]
                    : ['Porosia është duke u përgatitur', "Porosia #{$orderNumber} është aktualisht në përgatitje në {$branchName}."],
                'ready_for_pickup' => $order->order_type === 'delivery'
                    ? ['Porosia është gati për marrje nga korrieri', "Porosia #{$orderNumber} u përgatit dhe po pret marrjen nga korrieri."]
                    : ['Porosia është gati për marrje', "Porosia #{$orderNumber} është gati në {$branchName}!"],
                'completed' => ['Porosia u dorëzua', "Porosia #{$orderNumber} u dorëzua me sukses. Ju bëftë mirë!"],
                'cancelled' => ['Porosia u anulua', "Porosia #{$orderNumber} u anulua." . ($reason ? " Arsyeja: {$reason}" : '')],
                default => null,
            };

            if ($customerMsg) {
                $this->sendToUser(
                    user: $order->customer,
                    title: $customerMsg[0],
                    message: $customerMsg[1],
                    type: $toStatus === 'cancelled' ? 'order_cancelled' : 'customer_order',
                    eventKey: "order:{$order->id}:status:{$toStatus}:customer",
                    payload: $basePayload,
                    actionUrl: "/porosite?order={$orderNumber}",
                    branchId: $order->branch_id,
                );
            }

            if ($toStatus === 'completed' && $order->payment_status === 'paid') {
                $totalFormatted = number_format((float) $order->total_price, 2);
                $this->sendToUser(
                    user: $order->customer,
                    title: 'Pagesa u konfirmua',
                    message: "Pagesa prej €{$totalFormatted} për porosinë #{$orderNumber} u konfirmua.",
                    type: 'payment_confirmed',
                    eventKey: "order:{$order->id}:payment_confirmed:customer",
                    payload: $basePayload,
                    actionUrl: "/porosite?order={$orderNumber}",
                    branchId: $order->branch_id,
                );
            }
        }

        // 2. Anulimi: Njofto Kuzhinën, Menaxherët dhe Korrierin
        if ($toStatus === 'cancelled') {
            $actorLabel = $actor?->role === 'customer' ? 'klienti' : 'administratori/stafi';
            $branchRecipients = $this->getBranchStaffAndManagers($order->branch_id);
            $this->sendToUsers(
                users: $branchRecipients,
                title: 'Porosi e anuluar',
                message: "Porosia #{$orderNumber} u anulua nga {$actorLabel}. Ndaloni përgatitjen.",
                type: 'kitchen_order_cancelled',
                eventKey: "order:{$order->id}:cancelled:kitchen",
                payload: $basePayload,
                actionUrl: "/kds?order={$order->id}",
                branchId: $order->branch_id,
            );

            if ($order->delivery && $order->delivery->courier?->user) {
                $this->sendToUser(
                    user: $order->delivery->courier->user,
                    title: 'Porosia u anulua',
                    message: "Dërgesa për porosinë #{$orderNumber} u anulua dhe u hoq nga lista juaj.",
                    type: 'delivery_cancelled',
                    eventKey: "delivery:{$order->delivery->id}:cancelled:courier:{$order->delivery->courier_id}",
                    payload: array_merge($basePayload, ['delivery_id' => $order->delivery->id]),
                    actionUrl: "/korrieri",
                    branchId: $order->branch_id,
                );
            }
        }
    }

    /**
     * Njoftime kur dështojnë pagesat.
     */
    public function notifyPaymentFailed(Order $order, ?string $reason = null): void
    {
        $order->loadMissing(['branch', 'customer']);
        $orderNumber = $order->order_number;

        if ($order->customer) {
            $this->sendToUser(
                user: $order->customer,
                title: 'Pagesa dështoi',
                message: "Pagesa për porosinë #{$orderNumber} nuk u krye." . ($reason ? " {$reason}" : ''),
                type: 'payment_failed',
                eventKey: "order:{$order->id}:payment_failed:customer",
                payload: ['order_id' => $order->id, 'order_number' => $orderNumber],
                actionUrl: "/porosite?order={$orderNumber}",
                branchId: $order->branch_id,
            );
        }

        $admins = $this->getPlatformAdmins();
        $this->sendToUsers(
            users: $admins,
            title: 'Dështim i pagesës',
            message: "Pagesa për porosinë #{$orderNumber} dështoi" . ($reason ? ": {$reason}" : '.'),
            type: 'admin_payment_failed',
            eventKey: "order:{$order->id}:payment_failed:admin",
            payload: ['order_id' => $order->id, 'order_number' => $orderNumber],
            actionUrl: "/admin?order={$order->id}",
            branchId: $order->branch_id,
        );
    }

    /**
     * Njoftime për KDS kur një porosi shënohet urgjente ose kërkon vëmendje.
     */
    public function notifyOrderAttentionRequired(Order $order, string $reason): void
    {
        $order->loadMissing('branch');
        $orderNumber = $order->order_number;
        $branchName = $order->branch?->name ?? 'Restoranti';

        $branchRecipients = $this->getBranchStaffAndManagers($order->branch_id);
        $this->sendToUsers(
            users: $branchRecipients,
            title: 'Porosi që kërkon vëmendje',
            message: "Porosia #{$orderNumber} në {$branchName}: {$reason}",
            type: 'kitchen_order_attention',
            eventKey: "order:{$order->id}:attention:" . md5($reason),
            payload: ['order_id' => $order->id, 'order_number' => $orderNumber, 'priority' => $order->priority],
            actionUrl: "/kds?order={$order->id}",
            branchId: $order->branch_id,
        );
    }

    /**
     * Njofton korrierin kur i caktohet ose ricaktohet një dërgesë.
     */
    public function notifyCourierAssigned(Courier $courier, Delivery $delivery, bool $isReassignment = false, ?Courier $previousCourier = null): void
    {
        $delivery->loadMissing(['order', 'branch']);
        $courier->loadMissing('user');
        $orderNumber = $delivery->order?->order_number ?? $delivery->order_id;
        $branchName = $delivery->branch?->name ?? 'Restoranti';

        if ($courier->user) {
            $title = $isReassignment ? 'Porosia u ricaktua' : 'Një porosi e re iu caktua';
            $message = $isReassignment
                ? "Ju është ricaktuar porosia #{$orderNumber} nga {$branchName}."
                : "Ju është caktuar porosia #{$orderNumber} nga {$branchName}.";

            $this->sendToUser(
                user: $courier->user,
                title: $title,
                message: $message,
                type: $isReassignment ? 'delivery_reassigned' : 'delivery_assigned',
                eventKey: "delivery:{$delivery->id}:assigned:courier:{$courier->id}:" . ($delivery->assigned_at?->timestamp ?? time()),
                payload: [
                    'delivery_id' => $delivery->id,
                    'order_id' => $delivery->order_id,
                    'order_number' => $orderNumber,
                    'branch_name' => $branchName,
                ],
                actionUrl: "/korrieri?delivery={$delivery->id}",
                branchId: $delivery->branch_id,
            );
        }

        // Nëse kishte korrier të mëparshëm të ndryshëm, njoftoje që dërgesa u ricaktua
        if ($isReassignment && $previousCourier && $previousCourier->id !== $courier->id) {
            $previousCourier->loadMissing('user');
            if ($previousCourier->user) {
                $this->sendToUser(
                    user: $previousCourier->user,
                    title: 'Porosia u ricaktua',
                    message: "Dërgesa për porosinë #{$orderNumber} iu ricaktua një korrieri tjetër.",
                    type: 'delivery_reassigned',
                    eventKey: "delivery:{$delivery->id}:unassigned:courier:{$previousCourier->id}:" . ($delivery->assigned_at?->timestamp ?? time()),
                    payload: [
                        'delivery_id' => $delivery->id,
                        'order_id' => $delivery->order_id,
                        'order_number' => $orderNumber,
                    ],
                    actionUrl: "/korrieri",
                    branchId: $delivery->branch_id,
                );
            }
        }
    }

    /**
     * Njoftime për ndryshimet e statusit të dërgesës (Klienti, Korrieri, Admini).
     */
    public function notifyDeliveryStatusChanged(Delivery $delivery, string $fromStatus, string $toStatus, ?string $reason = null): void
    {
        if ($fromStatus === $toStatus) {
            return;
        }

        $delivery->loadMissing(['order.customer', 'branch', 'courier.user']);
        $order = $delivery->order;
        $orderNumber = $order?->order_number ?? $delivery->order_id;

        $payload = [
            'delivery_id' => $delivery->id,
            'order_id' => $delivery->order_id,
            'order_number' => $orderNumber,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
        ];

        // 1. Njoftimet për Klientin gjatë dorëzimit
        if ($order && $order->customer) {
            $customerMsg = match ($toStatus) {
                'picked_up' => ['Korrieri e mori porosinë', "Korrieri mori porosinë #{$orderNumber} nga restoranti."],
                'heading_to_customer' => ['Korrieri është rrugës drejt teje', "Korrieri është nisur drejt adresës suaj me porosinë #{$orderNumber}."],
                'arrived_at_customer' => ['Korrieri ka arritur në destinacion', "Korrieri ka mbërritur te adresa juaj me porosinë #{$orderNumber}."],
                'delivered' => ['Porosia u dorëzua', "Porosia #{$orderNumber} u dorëzua me sukses. Ju bëftë mirë!"],
                'cancelled' => ['Porosia u anulua', "Dërgesa për porosinë #{$orderNumber} u anulua." . ($reason ? " {$reason}" : '')],
                default => null,
            };

            if ($customerMsg) {
                $this->sendToUser(
                    user: $order->customer,
                    title: $customerMsg[0],
                    message: $customerMsg[1],
                    type: 'customer_delivery',
                    eventKey: "delivery:{$delivery->id}:status:{$toStatus}:customer",
                    payload: $payload,
                    actionUrl: "/porosite?order={$orderNumber}",
                    branchId: $delivery->branch_id,
                );
            }
        }

        // 2. Njoftime për Adminin & Menaxherin e Degës kur ka problem me dërgesën
        if ($toStatus === 'failed') {
            $issueMsg = "Dërgesa për porosinë #{$orderNumber} dështoi" . ($reason ? ": {$reason}" : '.');
            $admins = $this->getPlatformAdmins();
            $this->sendToUsers(
                users: $admins,
                title: 'Problem me dërgesën',
                message: $issueMsg,
                type: 'admin_delivery_issue',
                eventKey: "delivery:{$delivery->id}:failed:admin:" . time(),
                payload: $payload,
                actionUrl: "/admin?tab=deliveries&delivery={$delivery->id}",
                branchId: $delivery->branch_id,
            );
        }
    }

    /**
     * Njofton adminët kur nuk ka korrier të disponueshëm ose kur një caktim skadon pa u ricaktuar.
     */
    public function notifyDeliveryRequiresIntervention(Delivery $delivery, string $reason): void
    {
        $delivery->loadMissing(['order', 'branch']);
        $orderNumber = $delivery->order?->order_number ?? $delivery->order_id;
        $admins = $this->getPlatformAdmins();

        $this->sendToUsers(
            users: $admins,
            title: 'Ndërhyrje e nevojshme për dërgesën',
            message: "Dërgesa #{$orderNumber}: {$reason}",
            type: 'admin_attention_required',
            eventKey: "delivery:{$delivery->id}:intervention:" . md5($reason),
            payload: ['delivery_id' => $delivery->id, 'order_number' => $orderNumber],
            actionUrl: "/admin?tab=deliveries&delivery={$delivery->id}",
            branchId: $delivery->branch_id,
        );
    }

    /**
     * Njofton korrierin për ndryshime të rëndësishme në dërgesë (p.sh. prioritet urgjent).
     */
    public function notifyCourierDeliveryUpdated(Delivery $delivery, string $reason): void
    {
        $delivery->loadMissing(['order', 'courier.user']);
        if (!$delivery->courier?->user) {
            return;
        }

        $orderNumber = $delivery->order?->order_number ?? $delivery->order_id;
        $this->sendToUser(
            user: $delivery->courier->user,
            title: 'Ndryshime të rëndësishme në dërgesë',
            message: "Porosia #{$orderNumber}: {$reason}",
            type: 'delivery_updated',
            eventKey: "delivery:{$delivery->id}:updated:" . md5($reason),
            payload: ['delivery_id' => $delivery->id, 'order_number' => $orderNumber],
            actionUrl: "/korrieri?delivery={$delivery->id}",
            branchId: $delivery->branch_id,
        );
    }

    /**
     * Kthen stafin e kuzhinës, menaxherët e degës dhe pronarin e restorantit për degën e dhënë.
     */
    public function getBranchStaffAndManagers(?int $branchId): Collection
    {
        if (!$branchId) {
            return collect();
        }

        $staffUsers = StaffMembership::with('user')
            ->where('branch_id', $branchId)
            ->where('is_active', true)
            ->whereIn('role', ['kitchen_staff', 'branch_manager'])
            ->get()
            ->pluck('user')
            ->filter();

        $branch = Branch::with('restaurant.owner')->find($branchId);
        if ($branch?->restaurant?->owner) {
            $staffUsers->push($branch->restaurant->owner);
        }

        return $staffUsers->filter(fn ($u) => $u instanceof User && $u->is_active)->unique('id')->values();
    }

    /**
     * Kthen administratorët aktivë të platformës.
     */
    public function getPlatformAdmins(array $excludeUserIds = []): Collection
    {
        $query = User::whereIn('role', ['super_admin', 'admin'])
            ->where('is_active', true);

        if (!empty($excludeUserIds)) {
            $query->whereNotIn('id', $excludeUserIds);
        }

        return $query->get();
    }

    // =========================================================================
    // FAZA 8: NJOFTIMET FINANCIARE DHE TË PAGESAVE
    // =========================================================================

    public function notifyPaymentSucceeded(Order $order, string $reference): void
    {
        $order->loadMissing(['branch', 'customer']);
        $orderNumber = $order->order_number;
        $totalFormatted = number_format((float) $order->total_price, 2);

        if ($order->customer) {
            $this->sendToUser(
                user: $order->customer,
                title: 'Pagesa u konfirmua',
                message: "Pagesa e simuluar prej €{$totalFormatted} për porosinë #{$orderNumber} u krye me sukses (Ref: {$reference}).",
                type: 'payment_confirmed',
                eventKey: "order:{$order->id}:payment_confirmed:customer:{$reference}",
                payload: ['order_id' => $order->id, 'order_number' => $orderNumber, 'reference' => $reference],
                actionUrl: "/porosite?order={$orderNumber}",
                branchId: $order->branch_id,
            );
        }
    }

    public function notifyCodCollected(Order $order, string $reference): void
    {
        $order->loadMissing(['branch', 'customer']);
        $orderNumber = $order->order_number;
        $totalFormatted = number_format((float) $order->total_price, 2);

        $branchRecipients = $this->getBranchStaffAndManagers($order->branch_id);
        $this->sendToUsers(
            users: $branchRecipients,
            title: 'Pagesa COD u arkëtua',
            message: "Korrieri arkëtoi €{$totalFormatted} në dorë për porosinë #{$orderNumber} (Ref: {$reference}).",
            type: 'cod_collection',
            eventKey: "order:{$order->id}:cod_collected:branch",
            payload: ['order_id' => $order->id, 'order_number' => $orderNumber, 'reference' => $reference],
            actionUrl: "/admin?tab=finance",
            branchId: $order->branch_id,
        );
    }

    public function notifyRefundProcessed(Refund $refund): void
    {
        $refund->loadMissing(['order.customer', 'restaurant']);
        $order = $refund->order;
        $orderNumber = $order?->order_number ?? $refund->order_id;
        $amountFormatted = number_format((float) $refund->amount, 2);

        if ($order?->customer) {
            $title = match ($refund->status) {
                'completed' => 'Rimbursimi u miratua',
                'rejected' => 'Kërkesa për rimbursim u refuzua',
                default => 'Kërkesë për rimbursim',
            };
            $msg = match ($refund->status) {
                'completed' => "Rimbursimi i simuluar prej €{$amountFormatted} për porosinë #{$orderNumber} u aprovua (Ref: {$refund->reference}).",
                'rejected' => "Kërkesa për rimbursim për porosinë #{$orderNumber} u refuzua." . ($refund->admin_notes ? " {$refund->admin_notes}" : ''),
                default => "Kërkesa juaj për rimbursim prej €{$amountFormatted} për porosinë #{$orderNumber} po shqyrtohet.",
            };

            $this->sendToUser(
                user: $order->customer,
                title: $title,
                message: $msg,
                type: 'refund_update',
                eventKey: "refund:{$refund->id}:status:{$refund->status}:customer",
                payload: ['refund_id' => $refund->id, 'order_number' => $orderNumber, 'reference' => $refund->reference],
                actionUrl: "/porosite?order={$orderNumber}",
                branchId: $order->branch_id,
            );
        }

        if ($refund->status === 'pending') {
            $admins = $this->getPlatformAdmins();
            $this->sendToUsers(
                users: $admins,
                title: 'Kërkesë e re për rimbursim',
                message: "Kërkesë për rimbursim prej €{$amountFormatted} për porosinë #{$orderNumber} ({$refund->reference}).",
                type: 'admin_refund_request',
                eventKey: "refund:{$refund->id}:pending:admin",
                payload: ['refund_id' => $refund->id, 'order_number' => $orderNumber],
                actionUrl: "/admin?tab=finance",
                branchId: $order?->branch_id,
            );
        }
    }

    public function notifyPayoutEvent(RestaurantPayout $payout): void
    {
        $payout->loadMissing('restaurant.owner');
        $restaurant = $payout->restaurant;
        if (!$restaurant) {
            return;
        }

        $amountFormatted = number_format((float) $payout->amount, 2);
        $recipients = collect();
        if ($restaurant->owner) {
            $recipients->push($restaurant->owner);
        }

        $branchIds = $restaurant->branches()->pluck('id');
        foreach ($branchIds as $bid) {
            $recipients = $recipients->merge($this->getBranchStaffAndManagers($bid));
        }
        $recipients = $recipients->filter(fn ($u) => in_array($u->role, ['owner', 'branch_manager'], true))->unique('id');

        $title = $payout->status === 'completed'
            ? 'Pagesa e restorantit u përfundua'
            : ($payout->status === 'cancelled' ? 'Pagesa e restorantit u anulua' : 'Pagesë e re e restorantit u krijua');

        $msg = match ($payout->status) {
            'completed' => "Pagesa e simuluar prej €{$amountFormatted} për {$restaurant->name} u përfundua (Ref: {$payout->reference}).",
            'cancelled' => "Pagesa prej €{$amountFormatted} për {$restaurant->name} u anulua (Ref: {$payout->reference}).",
            default => "U krijua një pagesë në pritje prej €{$amountFormatted} për {$restaurant->name} (Ref: {$payout->reference}).",
        };

        $this->sendToUsers(
            users: $recipients,
            title: $title,
            message: $msg,
            type: 'restaurant_payout',
            eventKey: "payout:{$payout->id}:status:{$payout->status}",
            payload: ['payout_id' => $payout->id, 'reference' => $payout->reference, 'amount' => (float) $payout->amount],
            actionUrl: "/admin?tab=finance",
        );
    }

    public function notifyFinancialAdjustment(FinancialAdjustment $adjustment): void
    {
        $adjustment->loadMissing(['restaurant.owner', 'courier.user']);
        $amountFormatted = number_format((float) $adjustment->amount, 2);

        if ($adjustment->restaurant?->owner) {
            $this->sendToUser(
                user: $adjustment->restaurant->owner,
                title: 'Rregullim financiar i regjistruar',
                message: "U regjistrua një rregullim financiar prej €{$amountFormatted} për {$adjustment->restaurant->name}: {$adjustment->reason}",
                type: 'financial_adjustment',
                eventKey: "adjustment:{$adjustment->id}:restaurant",
                payload: ['adjustment_id' => $adjustment->id, 'reference' => $adjustment->reference],
                actionUrl: "/admin?tab=finance",
            );
        }

        if ($adjustment->courier?->user) {
            $this->sendToUser(
                user: $adjustment->courier->user,
                title: 'Rregullim financiar i bilancit',
                message: "U regjistrua një rregullim financiar prej €{$amountFormatted}: {$adjustment->reason}",
                type: 'financial_adjustment',
                eventKey: "adjustment:{$adjustment->id}:courier",
                payload: ['adjustment_id' => $adjustment->id, 'reference' => $adjustment->reference],
                actionUrl: "/korrieri",
            );
        }
    }
}
