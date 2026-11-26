<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Courier;
use App\Models\Delivery;
use App\Models\DeliveryZone;
use App\Models\Notification;
use App\Models\Order;
use App\Models\Product;
use App\Models\StaffMembership;
use App\Models\User;
use App\Services\NotificationService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationSystemTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $customerUser;
    protected User $otherCustomer;
    protected User $kitchenUser;
    protected User $courierUser1;
    protected User $courierUser2;
    protected Courier $courier1;
    protected Courier $courier2;
    protected Branch $branch;
    protected Product $product;
    protected DeliveryZone $zone;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->adminUser = User::where('role', 'super_admin')->first();
        $this->customerUser = User::where('role', 'customer')->first();
        $this->otherCustomer = User::create([
            'name' => 'Klient Tjetër',
            'email' => 'other.customer@tastio.com',
            'password' => bcrypt('password123'),
            'role' => 'customer',
            'is_active' => true,
        ]);
        $this->branch = Branch::first();
        $this->product = Product::where('is_available', true)->first();
        $this->zone = DeliveryZone::where('branch_id', $this->branch->id)->first();

        $this->kitchenUser = User::where('role', 'kitchen_staff')->first();
        // Sigurohemi që kuzhinieri i përket degës së parë
        StaffMembership::firstOrCreate(
            ['user_id' => $this->kitchenUser->id, 'branch_id' => $this->branch->id],
            ['role' => 'kitchen_staff', 'is_active' => true]
        );

        $couriers = Courier::with('user')->where('is_active', true)->get();
        $this->courier1 = $couriers[0];
        $this->courier2 = $couriers[1];
        $this->courierUser1 = $this->courier1->user;
        $this->courierUser2 = $this->courier2->user;

        $this->courier1->update(['availability_status' => 'available', 'is_active' => true]);
        $this->courier2->update(['availability_status' => 'available', 'is_active' => true]);
    }

    public function test_order_creation_triggers_customer_kitchen_courier_and_admin_notifications(): void
    {
        $res = $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/orders', [
                'branch_id' => $this->branch->id,
                'order_type' => 'delivery',
                'payment_method' => 'card',
                'customer_name' => 'Blin Krasniqi',
                'customer_email' => 'customer.blin@tastio.com',
                'customer_phone' => '044123456',
                'delivery_zone_id' => $this->zone?->id,
                'delivery_address' => ['city' => 'Prishtinë', 'street' => 'Rr. B'],
                'items' => [['product_id' => $this->product->id, 'quantity' => 2]],
            ]);

        $res->assertStatus(201);
        $orderNumber = $res->json('order.order_number');

        // 1. Klienti merr "Porosia u pranua"
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->customerUser->id,
            'title' => 'Porosia u pranua',
            'action_url' => "/porosite?order={$orderNumber}",
            'is_read' => false,
        ]);

        // Kur porosia kompletohet dhe pagesa konfirmohet, klienti merr "Pagesa u konfirmua"
        $orderId = $res->json('order.id');
        $this->actingAs($this->adminUser, 'sanctum')
            ->patchJson("/api/v1/admin/orders/{$orderId}/status", ['status' => 'completed'])
            ->assertStatus(200);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->customerUser->id,
            'title' => 'Pagesa u konfirmua',
            'type' => 'payment_confirmed',
        ]);

        // 2. Kuzhina e degës merr "Porosi e re"
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->kitchenUser->id,
            'branch_id' => $this->branch->id,
            'title' => 'Porosi e re',
            'type' => 'kitchen_new_order',
        ]);

        // 3. Admini merr "Porosi e re në platformë"
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->adminUser->id,
            'title' => 'Porosi e re në platformë',
            'type' => 'admin_new_order',
        ]);

        // 4. Korrieri i caktuar merr "Një porosi e re iu caktua"
        $delivery = Delivery::whereHas('order', fn ($q) => $q->where('order_number', $orderNumber))->firstOrFail();
        $assignedCourierUserId = $delivery->courier->user_id;
        $this->assertDatabaseHas('notifications', [
            'user_id' => $assignedCourierUserId,
            'title' => 'Një porosi e re iu caktua',
            'type' => 'delivery_assigned',
            'action_url' => "/korrieri?delivery={$delivery->id}",
        ]);
    }

    public function test_branch_permissions_isolate_kitchen_notifications_to_order_branch(): void
    {
        $otherBranch = Branch::where('id', '!=', $this->branch->id)->first();
        if (!$otherBranch) {
            $otherBranch = Branch::create([
                'restaurant_id' => $this->branch->restaurant_id,
                'name' => 'Dega Tjetër',
                'address' => 'Prizren',
                'phone' => '044999888',
                'is_active' => true,
            ]);
        }

        $otherBranchKitchen = User::create([
            'name' => 'Kuzhinier Dega 2',
            'email' => 'kitchen.other@tastio.com',
            'password' => bcrypt('password123'),
            'role' => 'kitchen_staff',
            'is_active' => true,
        ]);

        StaffMembership::create([
            'user_id' => $otherBranchKitchen->id,
            'branch_id' => $otherBranch->id,
            'role' => 'kitchen_staff',
            'is_active' => true,
        ]);

        $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/orders', [
                'branch_id' => $this->branch->id,
                'order_type' => 'pickup',
                'payment_method' => 'cash_on_delivery',
                'customer_name' => 'Klient',
                'customer_email' => 'klient@tastio.com',
                'customer_phone' => '044111222',
                'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
            ])->assertStatus(201);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->kitchenUser->id,
            'title' => 'Porosi e re',
        ]);
        $this->assertDatabaseMissing('notifications', [
            'user_id' => $otherBranchKitchen->id,
            'title' => 'Porosi e re',
        ]);
    }

    public function test_full_kds_and_delivery_lifecycle_notifications(): void
    {
        $res = $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/orders', [
                'branch_id' => $this->branch->id,
                'order_type' => 'delivery',
                'payment_method' => 'cash_on_delivery',
                'customer_name' => 'Klient Cikel',
                'customer_email' => 'klient@tastio.com',
                'customer_phone' => '044111222',
                'delivery_zone_id' => $this->zone?->id,
                'delivery_address' => ['city' => 'Prishtinë', 'street' => 'Dardania'],
                'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
            ])->assertStatus(201);

        $order = Order::with('items')->findOrFail($res->json('order.id'));
        $delivery = Delivery::where('order_id', $order->id)->firstOrFail();
        $courierUser = $delivery->courier->user;

        // KDS: artikulli -> preparing => order -> in_preparation
        $item = $order->items->first();
        $this->actingAs($this->kitchenUser, 'sanctum')
            ->patchJson("/api/v1/kds/items/{$item->id}/status", ['status' => 'preparing'])
            ->assertStatus(200);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->customerUser->id,
            'title' => 'Restoranti filloi përgatitjen',
        ]);

        // KDS: artikulli -> ready => order -> ready_for_pickup
        $this->actingAs($this->kitchenUser, 'sanctum')
            ->patchJson("/api/v1/kds/items/{$item->id}/status", ['status' => 'ready'])
            ->assertStatus(200);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->customerUser->id,
            'title' => 'Porosia është gati për marrje nga korrieri',
        ]);

        // KDS: prioriteti urgjent -> njoftim për vëmendje
        $this->actingAs($this->kitchenUser, 'sanctum')
            ->patchJson("/api/v1/kds/tickets/{$order->id}/priority", ['priority' => 'urgent'])
            ->assertStatus(200);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->kitchenUser->id,
            'title' => 'Porosi që kërkon vëmendje',
        ]);

        // Korrieri pranon dhe kalon hapat e dërgesës
        $this->actingAs($courierUser, 'sanctum')
            ->postJson("/api/v1/courier/deliveries/{$delivery->id}/accept")
            ->assertStatus(200);

        $this->actingAs($courierUser, 'sanctum')
            ->patchJson("/api/v1/courier/deliveries/{$delivery->id}/status", ['status' => 'picked_up'])
            ->assertStatus(200);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->customerUser->id,
            'title' => 'Korrieri e mori porosinë',
        ]);

        $this->actingAs($courierUser, 'sanctum')
            ->patchJson("/api/v1/courier/deliveries/{$delivery->id}/status", ['status' => 'heading_to_customer'])
            ->assertStatus(200);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->customerUser->id,
            'title' => 'Korrieri është rrugës drejt teje',
        ]);

        $this->actingAs($courierUser, 'sanctum')
            ->patchJson("/api/v1/courier/deliveries/{$delivery->id}/status", ['status' => 'arrived_at_customer'])
            ->assertStatus(200);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->customerUser->id,
            'title' => 'Korrieri ka arritur në destinacion',
        ]);

        $this->actingAs($courierUser, 'sanctum')
            ->postJson("/api/v1/courier/deliveries/{$delivery->id}/status", ['status' => 'delivered'])
            ->assertStatus(200);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->customerUser->id,
            'title' => 'Porosia u dorëzua',
        ]);
    }

    public function test_cancellation_and_reassignment_and_admin_issue_notifications(): void
    {
        $res = $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/orders', [
                'branch_id' => $this->branch->id,
                'order_type' => 'delivery',
                'payment_method' => 'cash_on_delivery',
                'customer_name' => 'Klient Anulim',
                'customer_email' => 'klient@tastio.com',
                'customer_phone' => '044111222',
                'delivery_zone_id' => $this->zone?->id,
                'delivery_address' => ['city' => 'Prishtinë', 'street' => 'Ulpiana'],
                'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
            ])->assertStatus(201);

        $orderNumber = $res->json('order.order_number');
        $delivery = Delivery::whereHas('order', fn ($q) => $q->where('order_number', $orderNumber))->firstOrFail();

        // Admin ricakton dërgesën te korrieri tjetër
        $targetCourier = $delivery->courier_id === $this->courier1->id ? $this->courier2 : $this->courier1;
        $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/v1/admin/deliveries/{$delivery->id}/assign", [
                'courier_id' => $targetCourier->id,
                'force_reassign' => true,
            ])->assertStatus(200);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $targetCourier->user_id,
            'title' => 'Porosia u ricaktua',
            'type' => 'delivery_reassigned',
        ]);

        // Klienti anulon porosinë -> njoftohet klienti, kuzhina dhe korrieri
        $this->actingAs($this->customerUser, 'sanctum')
            ->postJson("/api/v1/orders/{$orderNumber}/cancel", ['reason' => 'Ndërrova mendje'])
            ->assertStatus(200);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->customerUser->id,
            'title' => 'Porosia u anulua',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->kitchenUser->id,
            'title' => 'Porosi e anuluar',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $targetCourier->user_id,
            'title' => 'Porosia u anulua',
            'type' => 'delivery_cancelled',
        ]);

        // Testo dështimin e pagesës -> njoftim te admini & klienti
        $order = Order::where('order_number', $orderNumber)->firstOrFail();
        app(NotificationService::class)->notifyPaymentFailed($order, 'Karta u refuzua.');
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->adminUser->id,
            'title' => 'Dështim i pagesës',
            'type' => 'admin_payment_failed',
        ]);
    }

    public function test_duplicate_prevention_with_event_key(): void
    {
        $service = app(NotificationService::class);
        $beforeCount = Notification::where('user_id', $this->customerUser->id)->count();

        $service->sendToUser(
            user: $this->customerUser,
            title: 'Test Dublikim',
            message: 'Mesazh testues.',
            type: 'customer_order',
            eventKey: 'unique-event-key-123'
        );

        $service->sendToUser(
            user: $this->customerUser,
            title: 'Test Dublikim',
            message: 'Mesazh testues.',
            type: 'customer_order',
            eventKey: 'unique-event-key-123'
        );

        $afterCount = Notification::where('user_id', $this->customerUser->id)->count();
        $this->assertSame($beforeCount + 1, $afterCount);
    }

    public function test_notification_api_read_unread_pagination_sync_and_ownership_security(): void
    {
        Notification::where('user_id', $this->customerUser->id)->delete();

        $service = app(NotificationService::class);
        for ($i = 1; $i <= 6; $i++) {
            $service->sendToUser(
                user: $this->customerUser,
                title: "Njoftim {$i}",
                message: "Përmbajtje {$i}",
                type: 'customer_order',
                eventKey: "api-test-{$i}"
            );
        }

        // Pa autentifikim -> 401
        $this->getJson('/api/v1/notifications')->assertStatus(401);

        // Lista & unread-count sync (per_page min 5 -> 6 njoftime = 2 faqe)
        $listRes = $this->actingAs($this->customerUser, 'sanctum')
            ->getJson('/api/v1/notifications?per_page=5')
            ->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('unread_count', 6)
            ->assertJsonPath('meta.total', 6)
            ->assertJsonPath('meta.last_page', 2);

        $syncRes1 = $this->actingAs($this->customerUser, 'sanctum')
            ->getJson('/api/v1/notifications/unread-count')
            ->assertStatus(200)
            ->assertJsonPath('unread_count', 6);

        $firstNotifId = $listRes->json('data.0.id');

        // Përdorues tjetër nuk mund ta shënojë ose fshijë njoftimin e dikujt tjetër -> 403
        $this->actingAs($this->otherCustomer, 'sanctum')
            ->patchJson("/api/v1/notifications/{$firstNotifId}/read")
            ->assertStatus(403);

        $this->actingAs($this->otherCustomer, 'sanctum')
            ->deleteJson("/api/v1/notifications/{$firstNotifId}")
            ->assertStatus(403);

        // Pronari e shënon si të lexuar -> checksum ndryshon dhe unread_count bie në 5
        $this->actingAs($this->customerUser, 'sanctum')
            ->patchJson("/api/v1/notifications/{$firstNotifId}/read")
            ->assertStatus(200)
            ->assertJsonPath('unread_count', 5)
            ->assertJsonPath('data.is_read', true);

        $syncRes2 = $this->actingAs($this->customerUser, 'sanctum')
            ->getJson('/api/v1/notifications/unread-count')
            ->assertStatus(200)
            ->assertJsonPath('unread_count', 5);

        $this->assertNotSame($syncRes1->json('checksum'), $syncRes2->json('checksum'));

        // Shëno të gjitha si të lexuara
        $this->actingAs($this->customerUser, 'sanctum')
            ->patchJson('/api/v1/notifications/read-all')
            ->assertStatus(200)
            ->assertJsonPath('unread_count', 0);

        // Fshi një njoftim
        $this->actingAs($this->customerUser, 'sanctum')
            ->deleteJson("/api/v1/notifications/{$firstNotifId}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('notifications', ['id' => $firstNotifId]);
    }
}
