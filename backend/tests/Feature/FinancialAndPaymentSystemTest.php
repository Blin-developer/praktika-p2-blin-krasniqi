<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Courier;
use App\Models\CourierEarning;
use App\Models\Delivery;
use App\Models\DeliveryZone;
use App\Models\FinancialTransaction;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Restaurant;
use App\Models\RestaurantCommission;
use App\Models\RestaurantPayout;
use App\Models\User;
use App\Services\FinancialService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinancialAndPaymentSystemTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $ownerUser;
    protected User $otherOwner;
    protected User $customerUser;
    protected User $otherCustomer;
    protected User $courierUser;
    protected Courier $courier;
    protected Branch $branch;
    protected Restaurant $restaurant;
    protected Restaurant $otherRestaurant;
    protected Product $product;
    protected DeliveryZone $zone;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->superAdmin = User::where('role', 'super_admin')->first();
        $this->customerUser = User::where('role', 'customer')->first();
        $this->otherCustomer = User::create([
            'name' => 'Klient Tjetër',
            'email' => 'other.finance@tastio.com',
            'password' => bcrypt('password123'),
            'role' => 'customer',
            'is_active' => true,
        ]);

        $this->branch = Branch::with('restaurant')->first();
        $this->restaurant = $this->branch->restaurant;
        $this->ownerUser = User::find($this->restaurant->owner_user_id) ?? User::where('role', 'owner')->first();
        if ($this->restaurant->owner_user_id !== $this->ownerUser->id) {
            $this->restaurant->update(['owner_user_id' => $this->ownerUser->id]);
        }

        $this->otherOwner = User::create([
            'name' => 'Pronar Tjetër',
            'email' => 'other.owner@tastio.com',
            'password' => bcrypt('password123'),
            'role' => 'owner',
            'is_active' => true,
        ]);

        $this->otherRestaurant = Restaurant::create([
            'name' => 'Restoranti Tjetër',
            'slug' => 'restoranti-tjeter-' . uniqid(),
            'status' => 'active',
            'owner_user_id' => $this->otherOwner->id,
        ]);

        $this->product = Product::where('is_available', true)->first();
        $this->zone = DeliveryZone::where('branch_id', $this->branch->id)->first();

        $this->courier = Courier::with('user')->where('is_active', true)->first();
        $this->courierUser = $this->courier->user;
        $this->courier->update(['availability_status' => 'available', 'is_active' => true, 'base_delivery_fee' => 1.50]);
    }

    private function createOrder(string $paymentMethod = 'card', string $orderType = 'delivery'): Order
    {
        $res = $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/orders', [
                'branch_id' => $this->branch->id,
                'order_type' => $orderType,
                'payment_method' => $paymentMethod,
                'customer_name' => 'Blin Krasniqi',
                'customer_email' => 'customer.blin@tastio.com',
                'customer_phone' => '044123456',
                'delivery_zone_id' => $orderType === 'delivery' ? $this->zone?->id : null,
                'delivery_address' => $orderType === 'delivery' ? ['city' => 'Prishtinë', 'street' => 'Rr. B'] : null,
                'items' => [['product_id' => $this->product->id, 'quantity' => 2]],
            ]);

        $res->assertStatus(201);
        return Order::with(['payment', 'delivery'])->findOrFail($res->json('order.id'));
    }

    // 1. SIMULATED ONLINE PAYMENTS
    public function test_simulated_online_payment_success_declined_pending_duplicate_and_ownership(): void
    {
        $order = $this->createOrder('card', 'pickup');

        // Ownership check: another customer cannot pay this order
        $this->actingAs($this->otherCustomer, 'sanctum')
            ->postJson('/api/v1/payments/simulate', [
                'order_number' => $order->order_number,
                'outcome' => 'success',
            ])->assertStatus(403);

        // Pending simulation
        $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/payments/simulate', [
                'order_number' => $order->order_number,
                'outcome' => 'pending',
            ])->assertStatus(200)
            ->assertJsonPath('data.payment.status', 'pending');

        // Declined simulation
        $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/payments/simulate', [
                'order_number' => $order->order_number,
                'outcome' => 'declined',
            ])->assertStatus(402)
            ->assertJsonPath('success', false)
            ->assertJsonPath('data.payment.status', 'failed');

        $this->assertSame('failed', $order->fresh()->payment_status);

        // Success simulation
        $okRes = $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/payments/simulate', [
                'order_number' => $order->order_number,
                'outcome' => 'success',
            ])->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.payment.status', 'completed')
            ->assertJsonPath('data.payment.is_simulated', true);

        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->assertNotNull($okRes->json('data.reference'));

        // Duplicate charge prevention
        $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/payments/simulate', [
                'order_number' => $order->order_number,
                'outcome' => 'success',
            ])->assertStatus(422);

        // Status endpoint returns transaction references
        $this->actingAs($this->customerUser, 'sanctum')
            ->getJson("/api/v1/payments/orders/{$order->order_number}")
            ->assertStatus(200)
            ->assertJsonPath('data.payment_status', 'paid');
    }

    // 2. CASH ON DELIVERY (COD) & COURIER EARNINGS
    public function test_cod_collection_delivery_completion_cancellation_and_no_duplicates(): void
    {
        $order = $this->createOrder('cash_on_delivery', 'delivery');
        $delivery = $order->delivery;
        $assignedCourierUser = $delivery->courier->user;

        // COD must NOT be marked collected on creation
        $this->assertFalse((bool) $order->payment->cod_collected);
        $this->assertSame('pending', $order->payment_status);

        // Accept delivery
        $this->actingAs($assignedCourierUser, 'sanctum')
            ->postJson("/api/v1/courier/deliveries/{$delivery->id}/accept")
            ->assertStatus(200);

        // Courier collects COD cash
        $this->actingAs($assignedCourierUser, 'sanctum')
            ->postJson("/api/v1/courier/deliveries/{$delivery->id}/collect-cod", ['notes' => 'Marrë në dorë'])
            ->assertStatus(200)
            ->assertJsonPath('data.cod_collected', true);

        // Duplicate COD collection does not create duplicate transaction
        $this->actingAs($assignedCourierUser, 'sanctum')
            ->postJson("/api/v1/courier/deliveries/{$delivery->id}/collect-cod")
            ->assertStatus(200);
        $this->assertSame(1, FinancialTransaction::where('order_id', $order->id)->where('type', 'cod_collection')->count());

        // Complete delivery -> marks paid, creates commission & courier earning
        $this->actingAs($assignedCourierUser, 'sanctum')
            ->patchJson("/api/v1/courier/deliveries/{$delivery->id}/status", ['status' => 'picked_up'])
            ->assertStatus(200);
        $this->actingAs($assignedCourierUser, 'sanctum')
            ->postJson("/api/v1/courier/deliveries/{$delivery->id}/status", ['status' => 'delivered'])
            ->assertStatus(200);

        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->assertDatabaseHas('courier_earnings', [
            'delivery_id' => $delivery->id,
            'courier_id' => $delivery->courier_id,
            'status' => 'available',
        ]);
        $this->assertSame(1, CourierEarning::where('delivery_id', $delivery->id)->count());

        // Cancelled delivery cannot collect COD
        $cancelledOrder = $this->createOrder('cash_on_delivery', 'delivery');
        $cancelledDelivery = $cancelledOrder->delivery;
        $this->actingAs($this->customerUser, 'sanctum')
            ->postJson("/api/v1/orders/{$cancelledOrder->order_number}/cancel")
            ->assertStatus(200);

        $this->actingAs($cancelledDelivery->courier->user, 'sanctum')
            ->postJson("/api/v1/courier/deliveries/{$cancelledDelivery->id}/collect-cod")
            ->assertStatus(422);
    }

    // 3. COMMISSIONS & HISTORICAL RATE PRESERVATION
    public function test_commission_calculation_custom_rate_historical_preservation_and_cancellation(): void
    {
        // Set restaurant-specific rate to 10%
        $this->actingAs($this->superAdmin, 'sanctum')
            ->patchJson('/api/v1/admin/finance/commissions/settings', [
                'restaurant_id' => $this->restaurant->id,
                'restaurant_commission_rate' => 10.00,
            ])->assertStatus(200);

        $order = $this->createOrder('card', 'delivery');
        $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/payments/simulate', [
                'order_number' => $order->order_number,
                'outcome' => 'success',
            ])->assertStatus(200);

        $commission = RestaurantCommission::where('order_id', $order->id)->firstOrFail();
        $expectedCommission = round(((float) $order->subtotal) * 0.10, 2);
        $expectedNet = round(((float) $order->subtotal) - $expectedCommission, 2);

        $this->assertEqualsWithDelta(10.00, (float) $commission->commission_rate, 0.01);
        $this->assertEqualsWithDelta($expectedCommission, (float) $commission->commission_amount, 0.01);
        $this->assertEqualsWithDelta($expectedNet, (float) $commission->restaurant_net_earnings, 0.01);

        // Change future restaurant commission rate to 20% -> historical record MUST NOT change
        $this->actingAs($this->superAdmin, 'sanctum')
            ->patchJson('/api/v1/admin/finance/commissions/settings', [
                'restaurant_id' => $this->restaurant->id,
                'restaurant_commission_rate' => 20.00,
            ])->assertStatus(200);

        $this->assertEqualsWithDelta(10.00, (float) $commission->fresh()->commission_rate, 0.01);

        // Cancelled order reverses commission
        $this->actingAs($this->superAdmin, 'sanctum')
            ->patchJson("/api/v1/admin/orders/{$order->id}/status", ['status' => 'cancelled'])
            ->assertStatus(200);

        $this->assertSame('reversed', $commission->fresh()->status);
    }

    // 4. REFUNDS (FULL, PARTIAL, LIMITS, DUPLICATES, AUTH)
    public function test_full_and_partial_refunds_limits_and_authorization(): void
    {
        $order = $this->createOrder('card', 'pickup');
        $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/payments/simulate', [
                'order_number' => $order->order_number,
                'outcome' => 'success',
            ])->assertStatus(200);

        $total = (float) $order->total_price;
        $partial = round($total / 2, 2);

        // Customer cannot issue refund -> 403
        $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/admin/finance/refunds', [
                'order_id' => $order->id,
                'amount' => $partial,
                'reason' => 'Test',
            ])->assertStatus(403);

        // Other restaurant owner cannot refund -> 403
        $this->actingAs($this->otherOwner, 'sanctum')
            ->postJson('/api/v1/admin/finance/refunds', [
                'order_id' => $order->id,
                'amount' => $partial,
                'reason' => 'Test',
            ])->assertStatus(403);

        // Refund exceeding payment -> 422
        $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/finance/refunds', [
                'order_id' => $order->id,
                'amount' => $total + 10,
                'type' => 'full',
                'reason' => 'Shumë e madhe',
            ])->assertStatus(422);

        // Partial refund succeeds
        $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/finance/refunds', [
                'order_id' => $order->id,
                'amount' => $partial,
                'type' => 'partial',
                'reason' => 'Artikull mungon',
            ])->assertStatus(201);

        $this->assertSame('partially_refunded', $order->fresh()->payment_status);

        // Remaining refund completes full refund
        $remaining = round($total - $partial, 2);
        $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/finance/refunds', [
                'order_id' => $order->id,
                'amount' => $remaining,
                'type' => 'full',
                'reason' => 'Përmbyllje rimbursimi',
            ])->assertStatus(201);

        $this->assertSame('refunded', $order->fresh()->payment_status);

        // Duplicate refund beyond remaining -> 422
        $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/finance/refunds', [
                'order_id' => $order->id,
                'amount' => 1.00,
                'reason' => 'Dublikim',
            ])->assertStatus(422);
    }

    // 5. PAYOUTS & FINANCIAL DASHBOARDS & ISOLATION
    public function test_payout_workflow_balance_limits_and_dashboard_isolation(): void
    {
        $order = $this->createOrder('card', 'pickup');
        $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/payments/simulate', [
                'order_number' => $order->order_number,
                'outcome' => 'success',
            ])->assertStatus(200);

        $balance = app(FinancialService::class)->getRestaurantBalance($this->restaurant->id);
        $available = $balance['available_balance'];
        $this->assertGreaterThan(0, $available);

        // Owner cannot create payout -> 403
        $this->actingAs($this->ownerUser, 'sanctum')
            ->postJson('/api/v1/admin/finance/payouts', [
                'restaurant_id' => $this->restaurant->id,
                'amount' => 1.00,
            ])->assertStatus(403);

        // Payout exceeding available balance -> 422
        $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/finance/payouts', [
                'restaurant_id' => $this->restaurant->id,
                'amount' => $available + 100,
            ])->assertStatus(422);

        // Valid payout creation & completion
        $payoutRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/finance/payouts', [
                'restaurant_id' => $this->restaurant->id,
                'amount' => $available,
                'notes' => 'Pagesë mujore e simuluar',
            ])->assertStatus(201)
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.is_simulated', true);

        $payoutId = $payoutRes->json('data.id');
        $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson("/api/v1/admin/finance/payouts/{$payoutId}/complete")
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'completed');

        // Super admin dashboard returns real metrics
        $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/finance/dashboard?period=30d')
            ->assertStatus(200)
            ->assertJsonPath('success', true);

        // Restaurant owner dashboard & isolation
        $this->actingAs($this->ownerUser, 'sanctum')
            ->getJson('/api/v1/admin/finance/restaurant-dashboard?period=today')
            ->assertStatus(200)
            ->assertJsonPath('restaurant.id', $this->restaurant->id);

        // Other owner sees ONLY their own restaurant (0 sales), NOT restaurant 1
        $otherRes = $this->actingAs($this->otherOwner, 'sanctum')
            ->getJson('/api/v1/admin/finance/restaurant-dashboard')
            ->assertStatus(200)
            ->assertJsonPath('restaurant.id', $this->otherRestaurant->id);
        $this->assertEquals(0, $otherRes->json('data.summary.paid_orders_count'));

        // Courier earnings endpoint
        $this->actingAs($this->courierUser, 'sanctum')
            ->getJson('/api/v1/courier/earnings')
            ->assertStatus(200)
            ->assertJsonPath('success', true);
    }
}
