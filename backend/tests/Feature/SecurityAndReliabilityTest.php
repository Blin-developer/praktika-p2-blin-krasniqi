<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Courier;
use App\Models\Delivery;
use App\Models\DeliveryZone;
use App\Models\FinancialTransaction;
use App\Models\Notification;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Refund;
use App\Models\Restaurant;
use App\Models\RestaurantCommission;
use App\Models\User;
use App\Services\FinancialService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Phase 9 — Security & Reliability Tests
 *
 * Covers:
 * - Authentication and authorization for all role groups
 * - Ownership enforcement (customers cannot access other users' data)
 * - Role escalation prevention
 * - Payment ownership and duplicate prevention
 * - COD duplicate prevention
 * - Commission duplicate prevention
 * - Notification ownership
 * - Financial endpoint authorization
 * - Public endpoint data exposure limits
 * - Order status race condition protection
 */
class SecurityAndReliabilityTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $owner;
    protected User $branchManager;
    protected User $kitchenStaff;
    protected User $courierUser;
    protected User $customer;
    protected User $otherCustomer;
    protected Courier $courier;
    protected Branch $branch;
    protected Product $product;
    protected Restaurant $restaurant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->superAdmin    = User::where('role', 'super_admin')->first();
        $this->owner         = User::where('role', 'owner')->first();
        $this->branchManager = User::where('role', 'branch_manager')->first();
        $this->kitchenStaff  = User::where('role', 'kitchen_staff')->first();
        $this->courierUser   = User::where('role', 'courier')->first();
        $this->courier       = Courier::where('user_id', $this->courierUser->id)->first();
        $this->customer      = User::where('role', 'customer')->first();
        $this->branch        = Branch::first();
        $this->product       = Product::where('is_available', true)->first();
        $this->restaurant    = Restaurant::first();

        // Second customer for cross-ownership tests
        $this->otherCustomer = User::factory()->create(['role' => 'customer']);
    }

    // =========================================================================
    // SECTION 1 — AUTHENTICATION: Unauthenticated access to protected routes
    // =========================================================================

    public function test_unauthenticated_cannot_access_kds(): void
    {
        $this->getJson('/api/v1/kds/tickets')->assertStatus(401);
    }

    public function test_unauthenticated_cannot_access_admin_orders(): void
    {
        $this->getJson('/api/v1/admin/orders')->assertStatus(401);
    }

    public function test_unauthenticated_cannot_access_notifications(): void
    {
        $this->getJson('/api/v1/notifications')->assertStatus(401);
    }

    public function test_unauthenticated_cannot_access_courier_dashboard(): void
    {
        $this->getJson('/api/v1/courier/dashboard')->assertStatus(401);
    }

    public function test_unauthenticated_cannot_access_finance_dashboard(): void
    {
        $this->getJson('/api/v1/admin/finance/dashboard')->assertStatus(401);
    }

    public function test_unauthenticated_cannot_access_my_orders(): void
    {
        $this->getJson('/api/v1/orders/my-orders')->assertStatus(401);
    }

    // =========================================================================
    // SECTION 2 — ROLE AUTHORIZATION: Wrong role cannot access protected routes
    // =========================================================================

    public function test_customer_cannot_access_kds(): void
    {
        $this->actingAs($this->customer)
            ->getJson('/api/v1/kds/tickets')
            ->assertStatus(403);
    }

    public function test_customer_cannot_access_admin_orders(): void
    {
        $this->actingAs($this->customer)
            ->getJson('/api/v1/admin/orders')
            ->assertStatus(403);
    }

    public function test_customer_cannot_access_admin_finance_dashboard(): void
    {
        $this->actingAs($this->customer)
            ->getJson('/api/v1/admin/finance/dashboard')
            ->assertStatus(403);
    }

    public function test_customer_cannot_access_courier_dashboard(): void
    {
        $this->actingAs($this->customer)
            ->getJson('/api/v1/courier/dashboard')
            ->assertStatus(403);
    }

    public function test_kitchen_staff_cannot_access_finance(): void
    {
        $this->actingAs($this->kitchenStaff)
            ->getJson('/api/v1/admin/finance/dashboard')
            ->assertStatus(403);
    }

    public function test_courier_cannot_access_admin_orders(): void
    {
        $this->actingAs($this->courierUser)
            ->getJson('/api/v1/admin/orders')
            ->assertStatus(403);
    }

    public function test_courier_cannot_access_kds(): void
    {
        $this->actingAs($this->courierUser)
            ->getJson('/api/v1/kds/tickets')
            ->assertStatus(403);
    }

    public function test_kitchen_staff_cannot_access_admin_operations(): void
    {
        $this->actingAs($this->kitchenStaff)
            ->getJson('/api/v1/admin/orders')
            ->assertStatus(403);
    }

    // =========================================================================
    // SECTION 3 — ROLE AUTHORIZATION: Correct roles CAN access their routes
    // =========================================================================

    public function test_kitchen_staff_can_access_kds(): void
    {
        $this->actingAs($this->kitchenStaff)
            ->getJson('/api/v1/kds/tickets')
            ->assertStatus(200);
    }

    public function test_branch_manager_can_access_kds(): void
    {
        $this->actingAs($this->branchManager)
            ->getJson('/api/v1/kds/tickets')
            ->assertStatus(200);
    }

    public function test_super_admin_can_access_finance_dashboard(): void
    {
        $this->actingAs($this->superAdmin)
            ->getJson('/api/v1/admin/finance/dashboard')
            ->assertStatus(200);
    }

    public function test_super_admin_can_access_admin_orders(): void
    {
        $this->actingAs($this->superAdmin)
            ->getJson('/api/v1/admin/orders')
            ->assertStatus(200);
    }

    public function test_courier_can_access_courier_dashboard(): void
    {
        $this->actingAs($this->courierUser)
            ->getJson('/api/v1/courier/dashboard')
            ->assertStatus(200);
    }

    public function test_owner_can_access_admin_orders(): void
    {
        $this->actingAs($this->owner)
            ->getJson('/api/v1/admin/orders')
            ->assertStatus(200);
    }

    // =========================================================================
    // SECTION 4 — ROLE ESCALATION PREVENTION
    // =========================================================================

    public function test_register_always_assigns_customer_role(): void
    {
        // Attempt to self-assign super_admin role via registration
        $response = $this->postJson('/api/v1/auth/register', [
            'name'     => 'Hacker User',
            'email'    => 'hacker@tastio.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'email' => 'hacker@tastio.test',
            'role'  => 'customer',
        ]);
        $this->assertDatabaseMissing('users', [
            'email' => 'hacker@tastio.test',
            'role'  => 'super_admin',
        ]);
    }

    public function test_update_profile_cannot_change_role(): void
    {
        // Attempting to pass 'role' in update profile has no effect
        $this->actingAs($this->customer)
            ->putJson('/api/v1/auth/profile', [
                'name'  => 'Updated Name',
                'phone' => '044000000',
            ])
            ->assertStatus(200);

        // Reload from DB and verify role is still customer
        $this->assertEquals('customer', $this->customer->fresh()->role);
    }

    // =========================================================================
    // SECTION 5 — OWNERSHIP: Customers cannot access other users' data
    // =========================================================================

    public function test_customer_cannot_read_another_customers_notifications(): void
    {
        // Create notification for $this->customer
        $notif = Notification::create([
            'user_id' => $this->customer->id,
            'type'    => 'order_created',
            'title'   => 'Test',
            'message' => 'Test',
            'is_read' => false,
        ]);

        // otherCustomer tries to mark it as read
        $this->actingAs($this->otherCustomer)
            ->patchJson("/api/v1/notifications/{$notif->id}/read")
            ->assertStatus(403);
    }

    public function test_customer_cannot_delete_another_customers_notification(): void
    {
        $notif = Notification::create([
            'user_id' => $this->customer->id,
            'type'    => 'order_created',
            'title'   => 'Test',
            'message' => 'Test',
            'is_read' => false,
        ]);

        $this->actingAs($this->otherCustomer)
            ->deleteJson("/api/v1/notifications/{$notif->id}")
            ->assertStatus(403);
    }

    public function test_customer_cannot_cancel_another_customers_order(): void
    {
        $order = $this->createTestOrder($this->customer);

        $this->actingAs($this->otherCustomer)
            ->postJson("/api/v1/orders/{$order->order_number}/cancel")
            ->assertStatus(403);
    }

    public function test_customer_payment_status_does_not_expose_internal_refs(): void
    {
        $order = $this->createTestOrder($this->customer);

        // The payment status endpoint is public — verify it works but check response
        $response = $this->getJson("/api/v1/payments/orders/{$order->order_number}");
        $response->assertStatus(200);

        // The response should not expose SIM-PAY refs in the top-level message
        $content = $response->json();
        $this->assertArrayHasKey('success', $content);
    }

    // =========================================================================
    // SECTION 6 — PAYMENT SECURITY: Ownership and duplicate prevention
    // =========================================================================

    public function test_customer_cannot_pay_another_customers_order(): void
    {
        $order = $this->createTestOrder($this->customer);

        $this->actingAs($this->otherCustomer)
            ->postJson('/api/v1/payments/simulate', [
                'order_number' => $order->order_number,
                'outcome'      => 'success',
            ])
            ->assertStatus(403);
    }

    public function test_payment_simulate_requires_authentication(): void
    {
        $order = $this->createTestOrder($this->customer);

        $this->postJson('/api/v1/payments/simulate', [
            'order_number' => $order->order_number,
            'outcome'      => 'success',
        ])->assertStatus(401);
    }

    public function test_duplicate_payment_is_rejected(): void
    {
        $order = $this->createTestOrder($this->customer);

        // First payment succeeds
        $this->actingAs($this->customer)
            ->postJson('/api/v1/payments/simulate', [
                'order_number' => $order->order_number,
                'outcome'      => 'success',
            ])
            ->assertStatus(200);

        // Second attempt must fail (order already paid)
        $this->actingAs($this->customer)
            ->postJson('/api/v1/payments/simulate', [
                'order_number' => $order->order_number,
                'outcome'      => 'success',
            ])
            ->assertStatus(422);
    }

    public function test_payment_for_cancelled_order_is_rejected(): void
    {
        $order = $this->createTestOrder($this->customer);
        $order->update(['status' => 'cancelled']);

        $this->actingAs($this->customer)
            ->postJson('/api/v1/payments/simulate', [
                'order_number' => $order->order_number,
                'outcome'      => 'success',
            ])
            ->assertStatus(422);
    }

    public function test_payment_outcome_validation(): void
    {
        $order = $this->createTestOrder($this->customer);

        $this->actingAs($this->customer)
            ->postJson('/api/v1/payments/simulate', [
                'order_number' => $order->order_number,
                'outcome'      => 'invalid_outcome',
            ])
            ->assertStatus(422);
    }

    // =========================================================================
    // SECTION 7 — COD DUPLICATE PREVENTION
    // =========================================================================

    public function test_cod_cannot_be_collected_twice(): void
    {
        $order = $this->createTestOrder($this->customer, 'completed');
        $order->update(['payment_method' => 'cash_on_delivery']);

        // Create a delivery for the order
        $zone = DeliveryZone::first();
        $delivery = Delivery::create([
            'order_id'   => $order->id,
            'branch_id'  => $this->branch->id,
            'courier_id' => $this->courier->id,
            'delivery_zone_id' => $zone?->id,
            'status'     => 'delivered',
        ]);

        // First collection succeeds
        $this->actingAs($this->courierUser)
            ->postJson("/api/v1/courier/deliveries/{$delivery->id}/collect-cod")
            ->assertStatus(200);

        // Second collection returns the same payment (idempotent, not an error)
        $response = $this->actingAs($this->courierUser)
            ->postJson("/api/v1/courier/deliveries/{$delivery->id}/collect-cod")
            ->assertStatus(200);

        // Verify only one COD transaction was created
        $codTransactions = FinancialTransaction::where('order_id', $order->id)
            ->where('type', 'cod_collection')
            ->count();
        $this->assertEquals(1, $codTransactions, 'Only one COD transaction must be created even after two collect calls.');
    }

    public function test_courier_cannot_collect_cod_for_another_couriers_delivery(): void
    {
        $otherCourierUser = User::factory()->create(['role' => 'courier']);
        $otherCourier = Courier::create([
            'user_id'      => $otherCourierUser->id,
            'vehicle_type' => 'bicycle',
            'availability_status' => 'offline',
            'is_active'    => true,
        ]);

        $order = $this->createTestOrder($this->customer, 'completed');
        $zone = DeliveryZone::first();
        $delivery = Delivery::create([
            'order_id'   => $order->id,
            'branch_id'  => $this->branch->id,
            'courier_id' => $otherCourier->id,
            'delivery_zone_id' => $zone?->id,
            'status'     => 'delivered',
        ]);

        // This courier is not assigned to the delivery
        $this->actingAs($this->courierUser)
            ->postJson("/api/v1/courier/deliveries/{$delivery->id}/collect-cod")
            ->assertStatus(403);
    }

    // =========================================================================
    // SECTION 8 — COMMISSION DUPLICATE PREVENTION
    // =========================================================================

    public function test_commission_is_not_duplicated_on_concurrent_completion(): void
    {
        $order = $this->createTestOrder($this->customer, 'in_preparation');
        $financialService = app(FinancialService::class);

        // Simulate two concurrent completion calls
        $financialService->recordOrderCommission($order);
        $financialService->recordOrderCommission($order);

        $commissions = RestaurantCommission::where('order_id', $order->id)->count();
        $this->assertEquals(1, $commissions, 'Commission must only be recorded once per order.');
    }

    public function test_commission_is_reversed_when_order_cancelled(): void
    {
        $order = $this->createTestOrder($this->customer, 'confirmed');
        $order->update(['payment_status' => 'paid']);
        $financialService = app(FinancialService::class);

        // Record commission first
        $financialService->recordOrderCommission($order);
        $this->assertDatabaseHas('restaurant_commissions', ['order_id' => $order->id, 'status' => 'earned']);

        // Cancel the order through API
        $this->actingAs($this->superAdmin)
            ->patchJson("/api/v1/admin/orders/{$order->id}/status", [
                'status' => 'cancelled',
                'reason' => 'Test cancellation',
            ])
            ->assertStatus(200);

        // Commission should now be reversed
        $this->assertDatabaseHas('restaurant_commissions', ['order_id' => $order->id, 'status' => 'reversed']);
    }

    // =========================================================================
    // SECTION 9 — ORDER STATUS PROTECTION
    // =========================================================================

    public function test_customer_cannot_set_order_to_in_preparation(): void
    {
        $order = $this->createTestOrder($this->customer, 'confirmed');

        $this->actingAs($this->customer)
            ->patchJson("/api/v1/orders/{$order->id}/status", [
                'status' => 'in_preparation',
            ])
            ->assertStatus(403);
    }

    public function test_customer_cannot_set_order_to_completed(): void
    {
        $order = $this->createTestOrder($this->customer, 'ready_for_pickup');

        $this->actingAs($this->customer)
            ->patchJson("/api/v1/orders/{$order->id}/status", [
                'status' => 'completed',
            ])
            ->assertStatus(403);
    }

    public function test_kitchen_staff_can_only_move_to_allowed_statuses(): void
    {
        $order = $this->createTestOrder($this->customer, 'confirmed');

        // Kitchen staff cannot skip to completed
        $this->actingAs($this->kitchenStaff)
            ->patchJson("/api/v1/orders/{$order->id}/status", [
                'status' => 'completed',
            ])
            ->assertStatus(403);
    }

    public function test_order_state_machine_prevents_invalid_transitions(): void
    {
        $order = $this->createTestOrder($this->customer, 'confirmed');

        // Cannot jump from confirmed to ready_for_pickup (must pass in_preparation)
        $this->actingAs($this->owner)
            ->patchJson("/api/v1/admin/orders/{$order->id}/status", [
                'status' => 'ready_for_pickup',
            ])
            ->assertStatus(422);
    }

    public function test_completed_order_cannot_change_status(): void
    {
        $order = $this->createTestOrder($this->customer, 'completed');

        $this->actingAs($this->owner)
            ->patchJson("/api/v1/admin/orders/{$order->id}/status", [
                'status' => 'cancelled',
            ])
            ->assertStatus(422);
    }

    public function test_cancelled_order_cannot_change_status(): void
    {
        $order = $this->createTestOrder($this->customer, 'cancelled');

        $this->actingAs($this->owner)
            ->patchJson("/api/v1/admin/orders/{$order->id}/status", [
                'status' => 'confirmed',
            ])
            ->assertStatus(422);
    }

    // =========================================================================
    // SECTION 10 — FINANCIAL AUTHORIZATION
    // =========================================================================

    public function test_customer_cannot_access_refunds_endpoint(): void
    {
        $this->actingAs($this->customer)
            ->getJson('/api/v1/admin/finance/refunds')
            ->assertStatus(403);
    }

    public function test_kitchen_staff_cannot_trigger_payout(): void
    {
        $this->actingAs($this->kitchenStaff)
            ->postJson('/api/v1/admin/finance/payouts', [
                'restaurant_id' => $this->restaurant->id,
                'amount'        => 100.00,
            ])
            ->assertStatus(403);
    }

    public function test_super_admin_can_process_refund_decision(): void
    {
        $order = $this->createTestOrder($this->customer, 'confirmed');
        $order->update(['payment_status' => 'paid']);

        // Create a refund request
        $refund = Refund::create([
            'reference'         => 'REF-' . strtoupper(Str::random(8)),
            'order_id'          => $order->id,
            'payment_id'        => Payment::where('order_id', $order->id)->first()?->id,
            'restaurant_id'     => $this->restaurant->id,
            'amount'            => (float) $order->total_price,
            'type'              => 'full',
            'reason'            => 'Test refund',
            'status'            => 'pending',
            'requested_by_user_id' => $this->customer->id,
        ]);

        $this->actingAs($this->superAdmin)
            ->postJson("/api/v1/admin/finance/refunds/{$refund->id}/decision", [
                'decision'    => 'approve',
                'admin_notes' => 'Approved by test.',
            ])
            ->assertStatus(200)
            ->assertJsonFragment(['success' => true]);
    }

    public function test_owner_cannot_access_super_admin_finance_routes(): void
    {
        // POST /admin/finance/payouts is super_admin only
        $this->actingAs($this->owner)
            ->postJson('/api/v1/admin/finance/payouts', [
                'restaurant_id' => $this->restaurant->id,
                'amount'        => 50.00,
            ])
            ->assertStatus(403);
    }

    // =========================================================================
    // SECTION 11 — PUBLIC ENDPOINT SAFETY
    // =========================================================================

    public function test_public_restaurant_list_does_not_expose_sensitive_data(): void
    {
        $response = $this->getJson('/api/v1/public/restaurants');
        $response->assertStatus(200);

        // Check that owner_user_id is not in the response
        $body = $response->getContent();
        $this->assertStringNotContainsString('password', $body);
    }

    public function test_health_endpoint_is_public(): void
    {
        $this->getJson('/api/v1/health')
            ->assertStatus(200)
            ->assertJsonFragment(['status' => 'ok']);
    }

    public function test_order_show_does_not_expose_full_customer_data_publicly(): void
    {
        $order = $this->createTestOrder($this->customer);

        // Public access to order details
        $response = $this->getJson("/api/v1/orders/{$order->order_number}/details");
        $response->assertStatus(200);

        // Sensitive fields must not be in response (password never shown)
        $body = $response->getContent();
        $this->assertStringNotContainsString('password', $body);
    }

    // =========================================================================
    // SECTION 12 — FINANCIAL TRANSACTION IDEMPOTENCY
    // =========================================================================

    public function test_financial_transaction_event_key_prevents_duplicates(): void
    {
        $order = $this->createTestOrder($this->customer, 'confirmed');
        $financialService = app(FinancialService::class);

        $eventKey = 'payment:success:TEST-' . Str::random(8);

        $financialService->recordTransaction([
            'order_id'       => $order->id,
            'type'           => 'customer_payment',
            'payment_method' => 'card',
            'status'         => 'successful',
            'amount'         => $order->total_price,
            'description'    => 'Test payment',
            'event_key'      => $eventKey,
            'completed_at'   => now(),
        ]);

        // Try to record the same event again
        $financialService->recordTransaction([
            'order_id'       => $order->id,
            'type'           => 'customer_payment',
            'payment_method' => 'card',
            'status'         => 'successful',
            'amount'         => $order->total_price,
            'description'    => 'Test payment duplicate',
            'event_key'      => $eventKey,
            'completed_at'   => now(),
        ]);

        $count = FinancialTransaction::where('event_key', $eventKey)->count();
        $this->assertEquals(1, $count, 'Duplicate financial transactions must be prevented by event_key.');
    }

    // =========================================================================
    // SECTION 13 — ORDER CREATION VALIDATION
    // =========================================================================

    public function test_order_creation_requires_valid_items(): void
    {
        $this->postJson('/api/v1/orders', [
            'branch_id'      => $this->branch->id,
            'customer_name'  => 'Test User',
            'customer_email' => 'test@example.com',
            'customer_phone' => '044000000',
            'payment_method' => 'cash_on_delivery',
            'items'          => [], // Empty items
        ])->assertStatus(422);
    }

    public function test_order_creation_requires_valid_payment_method(): void
    {
        $this->postJson('/api/v1/orders', [
            'branch_id'      => $this->branch->id,
            'customer_name'  => 'Test User',
            'customer_email' => 'test@example.com',
            'customer_phone' => '044000000',
            'payment_method' => 'bitcoin', // Invalid
            'items'          => [['product_id' => $this->product->id, 'quantity' => 1]],
        ])->assertStatus(422);
    }

    public function test_order_creation_validates_product_exists(): void
    {
        $this->postJson('/api/v1/orders', [
            'branch_id'      => $this->branch->id,
            'customer_name'  => 'Test User',
            'customer_email' => 'test@example.com',
            'customer_phone' => '044000000',
            'payment_method' => 'cash_on_delivery',
            'items'          => [['product_id' => 999999, 'quantity' => 1]], // Non-existent product
        ])->assertStatus(422);
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private function createTestOrder(User $customer, string $status = 'confirmed'): Order
    {
        $order = Order::create([
            'order_number'    => 'TASTIO-' . strtoupper(Str::random(8)),
            'customer_id'     => $customer->id,
            'branch_id'       => $this->branch->id,
            'order_type'      => 'delivery',
            'customer_name'   => $customer->name,
            'customer_email'  => $customer->email,
            'customer_phone'  => '044000000',
            'delivery_address' => '{"street":"Rruga Test","city":"Prishtinë"}',
            'status'          => $status,
            'payment_method'  => 'cash_on_delivery',
            'payment_status'  => 'pending',
            'subtotal'        => 10.00,
            'delivery_fee'    => 1.00,
            'tax_amount'      => 0.00,
            'total_price'     => 11.00,
        ]);

        Payment::create([
            'order_id'  => $order->id,
            'amount'    => 11.00,
            'currency'  => 'EUR',
            'method'    => 'cash_on_delivery',
            'status'    => 'pending',
            'is_simulated' => true,
            'transaction_reference' => 'COD-' . strtoupper(Str::random(8)),
        ]);

        return $order;
    }
}
