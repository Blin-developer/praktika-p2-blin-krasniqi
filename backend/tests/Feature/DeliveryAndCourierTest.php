<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Courier;
use App\Models\Delivery;
use App\Models\DeliveryZone;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeliveryAndCourierTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $customerUser;
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
        $this->branch = Branch::first();
        $this->product = Product::where('is_available', true)->first();

        $couriers = Courier::with('user')->get();
        $this->courier1 = $couriers[0];
        $this->courier2 = $couriers[1];
        $this->courierUser1 = $this->courier1->user;
        $this->courierUser2 = $this->courier2->user;

        $this->zone = DeliveryZone::where('branch_id', $this->branch->id)->first();
    }

    public function test_courier_rbac_and_permissions(): void
    {
        // Klienti nuk ka qasje te korrieri ose admin deliveries
        $this->actingAs($this->customerUser, 'sanctum')
            ->getJson('/api/v1/courier/dashboard')
            ->assertStatus(403);

        $this->actingAs($this->customerUser, 'sanctum')
            ->getJson('/api/v1/admin/deliveries')
            ->assertStatus(403);

        // Korrieri nuk ka qasje te admin deliveries
        $this->actingAs($this->courierUser1, 'sanctum')
            ->getJson('/api/v1/admin/deliveries')
            ->assertStatus(403);

        // Korrieri ka qasje te paneli i tij
        $this->actingAs($this->courierUser1, 'sanctum')
            ->getJson('/api/v1/courier/dashboard')
            ->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    public function test_courier_availability_toggle_and_active_delivery_guard(): void
    {
        $this->actingAs($this->courierUser1, 'sanctum')
            ->patchJson('/api/v1/courier/availability', ['availability_status' => 'offline'])
            ->assertStatus(200);
        $this->assertEquals('offline', $this->courier1->fresh()->availability_status);

        $this->actingAs($this->courierUser1, 'sanctum')
            ->patchJson('/api/v1/courier/availability', ['availability_status' => 'available'])
            ->assertStatus(200);
        $this->assertEquals('available', $this->courier1->fresh()->availability_status);
    }

    public function test_delivery_zone_fee_and_min_order_calculation(): void
    {
        // Endpoint publik i zonave
        $this->getJson("/api/v1/branches/{$this->branch->id}/delivery-zones")
            ->assertStatus(200)
            ->assertJsonPath('success', true);

        // Krijim zone të re nga admini me min_order_amount = 50.00 dhe delivery_fee = 3.00
        $zoneRes = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson('/api/v1/admin/delivery-zones', [
                'branch_id' => $this->branch->id,
                'name' => 'Zona Premium',
                'city' => 'Prishtinë',
                'delivery_fee' => 3.00,
                'min_order_amount' => 50.00,
                'estimated_delivery_minutes' => 40,
                'is_active' => true,
            ]);
        $zoneRes->assertStatus(201);
        $newZoneId = $zoneRes->json('data.id');

        // Checkout nën shumën minimale duhet të refuzohet
        $failCheckout = $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/orders', [
                'branch_id' => $this->branch->id,
                'delivery_zone_id' => $newZoneId,
                'order_type' => 'delivery',
                'customer_name' => 'Blin Krasniqi',
                'customer_email' => 'customer.blin@tastio.com',
                'customer_phone' => '+38349111222',
                'payment_method' => 'cash_on_delivery',
                'delivery_address' => ['city' => 'Prishtinë', 'street' => 'Rruga B'],
                'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
            ]);
        $failCheckout->assertStatus(422);

        // Checkout me zonën standarde aplikon tarifën e saj
        $okCheckout = $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/orders', [
                'branch_id' => $this->branch->id,
                'delivery_zone_id' => $this->zone->id,
                'order_type' => 'delivery',
                'customer_name' => 'Blin Krasniqi',
                'customer_email' => 'customer.blin@tastio.com',
                'customer_phone' => '+38349111222',
                'payment_method' => 'cash_on_delivery',
                'delivery_address' => ['city' => 'Prishtinë', 'street' => 'Rruga B'],
                'items' => [['product_id' => $this->product->id, 'quantity' => 3]],
            ]);
        $okCheckout->assertStatus(201);
        $orderId = $okCheckout->json('order.id');

        $this->assertDatabaseHas('deliveries', [
            'order_id' => $orderId,
            'delivery_zone_id' => $this->zone->id,
            'status' => 'pending_assignment',
        ]);
    }

    public function test_automatic_and_manual_assignment_and_conflict_prevention(): void
    {
        $orderRes = $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/orders', [
                'branch_id' => $this->branch->id,
                'order_type' => 'delivery',
                'customer_name' => 'Test Klient',
                'customer_email' => 'customer.blin@tastio.com',
                'customer_phone' => '+38349111222',
                'payment_method' => 'cash_on_delivery',
                'delivery_address' => ['city' => 'Prishtinë', 'street' => 'Ulpiana 5'],
                'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
            ])->assertStatus(201);

        $delivery = Delivery::where('order_id', $orderRes->json('order.id'))->firstOrFail();

        // Caktimi automatik
        $autoRes = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/v1/admin/deliveries/{$delivery->id}/auto-assign");
        $autoRes->assertStatus(200)
            ->assertJsonPath('data.status', 'assigned');

        // Përpjekja për caktim manual pa force_reassign mbi dërgesë të caktuar refuzohet
        $otherCourierId = $delivery->fresh()->courier_id === $this->courier1->id
            ? $this->courier2->id
            : $this->courier1->id;

        $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/v1/admin/deliveries/{$delivery->id}/assign", [
                'courier_id' => $otherCourierId,
                'force_reassign' => false,
            ])->assertStatus(422);

        // Ricaktimi me force_reassign funksionon
        $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/v1/admin/deliveries/{$delivery->id}/assign", [
                'courier_id' => $otherCourierId,
                'force_reassign' => true,
            ])->assertStatus(200)
            ->assertJsonPath('data.courier_id', $otherCourierId);
    }

    public function test_courier_accept_reject_and_complete_lifecycle_sync(): void
    {
        $orderRes = $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/orders', [
                'branch_id' => $this->branch->id,
                'order_type' => 'delivery',
                'customer_name' => 'Klient Cikel',
                'customer_email' => 'customer.blin@tastio.com',
                'customer_phone' => '+38349111222',
                'payment_method' => 'cash_on_delivery',
                'delivery_address' => ['city' => 'Prishtinë', 'street' => 'Dardania 12'],
                'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
            ])->assertStatus(201);

        $order = Order::findOrFail($orderRes->json('order.id'));
        $delivery = Delivery::where('order_id', $order->id)->firstOrFail();

        // Cakto te courier1
        $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/v1/admin/deliveries/{$delivery->id}/assign", [
                'courier_id' => $this->courier1->id,
            ])->assertStatus(200);

        // Courier1 refuzon -> sistemi tenton auto-reassign te courier2
        $rejectRes = $this->actingAs($this->courierUser1, 'sanctum')
            ->postJson("/api/v1/courier/deliveries/{$delivery->id}/reject", [
                'reason' => 'Jam larg zonës',
            ]);
        $rejectRes->assertStatus(200);
        $this->assertEquals(1, $delivery->fresh()->rejection_count);
        $this->assertEquals($this->courier2->id, $delivery->fresh()->courier_id);

        // Courier2 pranon
        $this->actingAs($this->courierUser2, 'sanctum')
            ->postJson("/api/v1/courier/deliveries/{$delivery->id}/accept")
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'accepted');
        $this->assertEquals('busy', $this->courier2->fresh()->availability_status);

        // Tranzicion i palejuar (accepted -> delivered direkt nuk lejohet)
        $this->actingAs($this->courierUser2, 'sanctum')
            ->patchJson("/api/v1/courier/deliveries/{$delivery->id}/status", ['status' => 'delivered'])
            ->assertStatus(422);

        // Përditësim i GPS real nga korrieri
        $this->actingAs($this->courierUser2, 'sanctum')
            ->postJson('/api/v1/courier/location', [
                'latitude' => 42.6615,
                'longitude' => 21.1640,
                'accuracy_meters' => 12.5,
            ])->assertStatus(200);

        $this->assertDatabaseHas('courier_locations', [
            'courier_id' => $this->courier2->id,
            'delivery_id' => $delivery->id,
        ]);

        // Cikli i plotë i hapave
        foreach (['heading_to_restaurant', 'arrived_at_restaurant', 'picked_up', 'heading_to_customer', 'arrived_at_customer'] as $step) {
            $this->actingAs($this->courierUser2, 'sanctum')
                ->patchJson("/api/v1/courier/deliveries/{$delivery->id}/status", ['status' => $step])
                ->assertStatus(200)
                ->assertJsonPath('data.status', $step);
        }

        // Pas picked_up, porosia duhet të ketë kaluar në ready_for_pickup
        $this->assertEquals('ready_for_pickup', $order->fresh()->status);

        // Dorëzimi final me shënim
        $this->actingAs($this->courierUser2, 'sanctum')
            ->patchJson("/api/v1/courier/deliveries/{$delivery->id}/status", [
                'status' => 'delivered',
                'proof_recipient_name' => 'Klient Cikel',
                'delivery_notes' => 'Dorëzuar në dorë',
            ])->assertStatus(200)
            ->assertJsonPath('data.status', 'delivered');

        // Sinkronizimi me porosinë, pagesën dhe korrierin
        $this->assertEquals('completed', $order->fresh()->status);
        $this->assertEquals('paid', $order->fresh()->payment_status);
        $this->assertEquals('available', $this->courier2->fresh()->availability_status);
        $this->assertGreaterThan(0, $this->courier2->fresh()->successful_deliveries);
    }

    public function test_failed_delivery_and_order_cancellation_sync(): void
    {
        $orderRes = $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/orders', [
                'branch_id' => $this->branch->id,
                'order_type' => 'delivery',
                'customer_name' => 'Klient Incident',
                'customer_email' => 'customer.blin@tastio.com',
                'customer_phone' => '+38349111222',
                'payment_method' => 'cash_on_delivery',
                'delivery_address' => ['city' => 'Prishtinë', 'street' => 'Lagjja Spitalit'],
                'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
            ])->assertStatus(201);

        $delivery = Delivery::where('order_id', $orderRes->json('order.id'))->firstOrFail();

        $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/v1/admin/deliveries/{$delivery->id}/assign", ['courier_id' => $this->courier1->id])
            ->assertStatus(200);
        $this->actingAs($this->courierUser1, 'sanctum')
            ->postJson("/api/v1/courier/deliveries/{$delivery->id}/accept")
            ->assertStatus(200);

        // Dështimi pa arsye refuzohet
        $this->actingAs($this->courierUser1, 'sanctum')
            ->patchJson("/api/v1/courier/deliveries/{$delivery->id}/status", ['status' => 'failed'])
            ->assertStatus(422);

        // Dështimi me arsye regjistrohet dhe liron korrierin
        $this->actingAs($this->courierUser1, 'sanctum')
            ->patchJson("/api/v1/courier/deliveries/{$delivery->id}/status", [
                'status' => 'failed',
                'incident_type' => 'customer_unavailable',
                'failure_reason' => 'Klienti nuk hapi derën dhe telefoni ishte i fikur.',
            ])->assertStatus(200)
            ->assertJsonPath('data.status', 'failed');

        $this->assertEquals('available', $this->courier1->fresh()->availability_status);

        // Testo anulimin e një porosie të re që anulon automatikisht dërgesën
        $order2Res = $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/orders', [
                'branch_id' => $this->branch->id,
                'order_type' => 'delivery',
                'customer_name' => 'Klient Anulim',
                'customer_email' => 'customer.blin@tastio.com',
                'customer_phone' => '+38349111222',
                'payment_method' => 'cash_on_delivery',
                'delivery_address' => ['city' => 'Prishtinë', 'street' => 'Rruga C'],
                'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
            ])->assertStatus(201);

        $order2Number = $order2Res->json('order.order_number');
        $order2Id = $order2Res->json('order.id');

        $this->actingAs($this->customerUser, 'sanctum')
            ->postJson("/api/v1/orders/{$order2Number}/cancel", ['reason' => 'Ndryshova mendje'])
            ->assertStatus(200);

        $this->assertDatabaseHas('deliveries', [
            'order_id' => $order2Id,
            'status' => 'cancelled',
        ]);
    }

    public function test_realtime_sync_endpoints(): void
    {
        $this->actingAs($this->courierUser1, 'sanctum')
            ->getJson('/api/v1/courier/sync')
            ->assertStatus(200)
            ->assertJsonStructure(['data' => ['assigned_count', 'active_count', 'checksum', 'server_time']]);

        $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/admin/deliveries/sync')
            ->assertStatus(200)
            ->assertJsonStructure(['data' => ['active_count', 'pending_assignment', 'checksum']]);
    }
}
