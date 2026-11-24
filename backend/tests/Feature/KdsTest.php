<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Station;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KdsTest extends TestCase
{
    use RefreshDatabase;

    protected User $kitchenUser;
    protected User $customerUser;
    protected Branch $branch;
    protected Station $grillStation;
    protected Station $drinksStation;
    protected Product $product1;
    protected Product $product2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);

        $this->branch = Branch::first();
        $this->kitchenUser = User::where('role', 'kitchen_staff')->first();
        $this->customerUser = User::where('role', 'customer')->first();

        // Sigurojmë stacionet për degën
        $this->grillStation = Station::firstOrCreate(
            ['branch_id' => $this->branch->id, 'code' => 'GRILL'],
            ['name' => 'Grill', 'is_active' => true]
        );

        $this->drinksStation = Station::firstOrCreate(
            ['branch_id' => $this->branch->id, 'code' => 'DRINKS'],
            ['name' => 'Pije', 'is_active' => true]
        );

        $products = Product::where('is_available', true)->take(2)->get();
        $this->product1 = $products[0];
        $this->product2 = $products[1];

        $this->product1->update(['default_station_id' => $this->grillStation->id]);
        $this->product2->update(['default_station_id' => $this->drinksStation->id]);
    }

    public function test_unauthorized_user_cannot_access_kds(): void
    {
        $response = $this->getJson('/api/v1/kds/tickets');
        $response->assertStatus(401);

        $customerToken = $this->customerUser->createToken('c_token')->plainTextToken;
        $forbiddenResponse = $this->withHeader('Authorization', 'Bearer ' . $customerToken)
            ->getJson('/api/v1/kds/tickets');
        $forbiddenResponse->assertStatus(403);
    }

    public function test_kitchen_staff_can_view_active_tickets_and_stations(): void
    {
        $token = $this->kitchenUser->createToken('k_token')->plainTextToken;

        $order = Order::create([
            'order_number' => 'ORD-KDS-TEST1',
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customerUser->id,
            'order_type' => 'delivery',
            'customer_name' => 'Blin Krasniqi',
            'status' => 'confirmed',
            'subtotal' => 10.00,
            'total_price' => 10.00,
            'payment_status' => 'pending',
            'payment_method' => 'cash',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product1->id,
            'station_id' => $this->grillStation->id,
            'product_name_snapshot' => $this->product1->name,
            'unit_price_snapshot' => $this->product1->base_price,
            'quantity' => 1,
            'line_total' => $this->product1->base_price,
            'item_status' => 'pending',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/kds/tickets');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $tickets = $response->json('data');
        $this->assertTrue(collect($tickets)->contains('id', $order->id));
    }

    public function test_item_level_tracking_updates_item_and_auto_transitions_order_status(): void
    {
        $token = $this->kitchenUser->createToken('k_token')->plainTextToken;

        $order = Order::create([
            'order_number' => 'ORD-KDS-TEST2',
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customerUser->id,
            'order_type' => 'delivery',
            'customer_name' => 'Klient Test',
            'status' => 'confirmed',
            'subtotal' => 15.00,
            'total_price' => 15.00,
            'payment_status' => 'pending',
            'payment_method' => 'cash',
        ]);

        $item1 = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product1->id,
            'station_id' => $this->grillStation->id,
            'product_name_snapshot' => $this->product1->name,
            'unit_price_snapshot' => $this->product1->base_price,
            'quantity' => 1,
            'line_total' => $this->product1->base_price,
            'item_status' => 'pending',
        ]);

        $item2 = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product2->id,
            'station_id' => $this->drinksStation->id,
            'product_name_snapshot' => $this->product2->name,
            'unit_price_snapshot' => $this->product2->base_price,
            'quantity' => 1,
            'line_total' => $this->product2->base_price,
            'item_status' => 'pending',
        ]);

        // 1. Kur artikulli 1 kalon në 'preparing', porosia kalon automatikisht në 'in_preparation'
        $patchRes1 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson("/api/v1/kds/items/{$item1->id}/status", [
                'status' => 'preparing'
            ]);

        $patchRes1->assertStatus(200)
            ->assertJsonPath('data.item.item_status', 'preparing')
            ->assertJsonPath('data.order_status', 'in_preparation');

        $this->assertEquals('in_preparation', $order->fresh()->status);
        $this->assertNotNull($order->fresh()->started_preparing_at);

        // 2. Kur të gjithë artikujt bëhen 'ready', porosia kalon në 'ready_for_pickup'
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson("/api/v1/kds/items/{$item1->id}/status", ['status' => 'ready'])
            ->assertStatus(200);

        $patchRes2 = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson("/api/v1/kds/items/{$item2->id}/status", ['status' => 'ready']);

        $patchRes2->assertStatus(200)
            ->assertJsonPath('data.is_fully_ready', true)
            ->assertJsonPath('data.order_status', 'ready_for_pickup');

        $this->assertEquals('ready_for_pickup', $order->fresh()->status);
    }

    public function test_station_workflow_isolation(): void
    {
        $token = $this->kitchenUser->createToken('k_token')->plainTextToken;

        $order = Order::create([
            'order_number' => 'ORD-KDS-TEST3',
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customerUser->id,
            'order_type' => 'pickup',
            'customer_name' => 'Klient Izolim',
            'status' => 'confirmed',
            'subtotal' => 10.00,
            'total_price' => 10.00,
            'payment_status' => 'pending',
            'payment_method' => 'cash',
        ]);

        $itemGrill = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product1->id,
            'station_id' => $this->grillStation->id,
            'product_name_snapshot' => $this->product1->name,
            'unit_price_snapshot' => $this->product1->base_price,
            'quantity' => 1,
            'line_total' => $this->product1->base_price,
            'item_status' => 'pending',
        ]);

        $itemDrinks = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product2->id,
            'station_id' => $this->drinksStation->id,
            'product_name_snapshot' => $this->product2->name,
            'unit_price_snapshot' => $this->product2->base_price,
            'quantity' => 1,
            'line_total' => $this->product2->base_price,
            'item_status' => 'pending',
        ]);

        // Filtrimi vetëm për stacionin GRILL
        $resGrill = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson("/api/v1/kds/tickets?branch_id={$this->branch->id}&station=GRILL");

        $resGrill->assertStatus(200);
        $tickets = collect($resGrill->json('data'));
        $targetTicket = $tickets->firstWhere('id', $order->id);

        $this->assertNotNull($targetTicket);
        $this->assertCount(1, $targetTicket['station_filtered_items']);
        $this->assertEquals('GRILL', $targetTicket['station_filtered_items'][0]['station']['code']);

        // Përfundimi i artikullit Grill nuk prek pijen
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson("/api/v1/kds/items/{$itemGrill->id}/status", ['status' => 'ready']);

        $this->assertEquals('ready', $itemGrill->fresh()->item_status);
        $this->assertEquals('pending', $itemDrinks->fresh()->item_status);
    }

    public function test_bump_and_recall_workflow(): void
    {
        $token = $this->kitchenUser->createToken('k_token')->plainTextToken;

        $order = Order::create([
            'order_number' => 'ORD-KDS-BUMP1',
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customerUser->id,
            'order_type' => 'delivery',
            'customer_name' => 'Klient Bump',
            'status' => 'in_preparation',
            'subtotal' => 10.00,
            'total_price' => 10.00,
            'payment_status' => 'paid',
            'payment_method' => 'card',
        ]);

        $item = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $this->product1->id,
            'station_id' => $this->grillStation->id,
            'product_name_snapshot' => $this->product1->name,
            'unit_price_snapshot' => $this->product1->base_price,
            'quantity' => 1,
            'line_total' => $this->product1->base_price,
            'item_status' => 'preparing',
        ]);

        // 1. Bump
        $bumpRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/kds/tickets/{$order->id}/bump");

        $bumpRes->assertStatus(200)
            ->assertJsonPath('success', true);

        $orderFresh = $order->fresh();
        $this->assertNotNull($orderFresh->bumped_at);
        $this->assertEquals('ready_for_pickup', $orderFresh->status);
        $this->assertEquals('ready', $item->fresh()->item_status);

        // Bileta e bump-uar nuk shfaqet më në biletat aktive
        $activeRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson("/api/v1/kds/tickets?branch_id={$this->branch->id}");
        $this->assertFalse(collect($activeRes->json('data'))->contains('id', $order->id));

        // Por shfaqet te /kds/bumped
        $bumpedRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson("/api/v1/kds/bumped?branch_id={$this->branch->id}");
        $bumpedRes->assertStatus(200);
        $this->assertTrue(collect($bumpedRes->json('data'))->contains('id', $order->id));

        // 2. Recall
        $recallRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/kds/tickets/{$order->id}/recall");

        $recallRes->assertStatus(200)
            ->assertJsonPath('success', true);

        $orderRecalled = $order->fresh();
        $this->assertNull($orderRecalled->bumped_at);
        $this->assertEquals('in_preparation', $orderRecalled->status);

        // Tani shfaqet sërish te biletat aktive
        $activeResAfterRecall = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson("/api/v1/kds/tickets?branch_id={$this->branch->id}");
        $this->assertTrue(collect($activeResAfterRecall->json('data'))->contains('id', $order->id));
    }

    public function test_priority_stats_and_sync_endpoints(): void
    {
        $token = $this->kitchenUser->createToken('k_token')->plainTextToken;

        $order = Order::create([
            'order_number' => 'ORD-KDS-PRIO1',
            'branch_id' => $this->branch->id,
            'customer_id' => $this->customerUser->id,
            'order_type' => 'delivery',
            'customer_name' => 'Klient Prioritet',
            'status' => 'confirmed',
            'priority' => 'normal',
            'subtotal' => 10.00,
            'total_price' => 10.00,
            'payment_status' => 'pending',
            'payment_method' => 'cash',
        ]);

        // Prioritet
        $prioRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson("/api/v1/kds/tickets/{$order->id}/priority", [
                'priority' => 'urgent'
            ]);
        $prioRes->assertStatus(200);
        $this->assertEquals('urgent', $order->fresh()->priority);

        // Stats
        $statsRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson("/api/v1/kds/stats?branch_id={$this->branch->id}");
        $statsRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['active_orders', 'urgent_orders', 'completed_today']]);

        // Sync
        $syncRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson("/api/v1/kds/sync?branch_id={$this->branch->id}");
        $syncRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['active_count', 'checksum', 'server_time']]);
    }
}
