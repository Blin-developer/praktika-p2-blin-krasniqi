<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    /**
     * Krijon një porosi ndihmëse për testim.
     */
    private function createTestOrder(User $customer, string $status = 'confirmed'): Order
    {
        $branch = Branch::first();
        $product = Product::first();

        $order = Order::create([
            'order_number' => 'TASTIO-TEST' . rand(1000, 9999),
            'customer_id' => $customer->id,
            'branch_id' => $branch->id,
            'order_type' => 'delivery',
            'customer_name' => $customer->name,
            'customer_email' => $customer->email,
            'customer_phone' => '+38349111222',
            'delivery_address' => json_encode(['city' => 'Prishtinë', 'street' => 'Rruga Test']),
            'status' => $status,
            'subtotal' => 10.00,
            'delivery_fee' => 1.50,
            'tax_amount' => 0.00,
            'total_price' => 11.50,
            'payment_status' => 'pending',
            'payment_method' => 'cash_on_delivery',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name_snapshot' => $product->name,
            'unit_price_snapshot' => 10.00,
            'quantity' => 1,
            'line_total' => 10.00,
            'item_status' => 'pending',
        ]);

        Payment::create([
            'order_id' => $order->id,
            'amount' => 11.50,
            'method' => 'cash_on_delivery',
            'status' => 'pending',
        ]);

        OrderStatusHistory::create([
            'order_id' => $order->id,
            'from_status' => null,
            'to_status' => $status,
            'changed_by_user_id' => $customer->id,
            'reason_or_notes' => 'Porosi fillestare për test.',
        ]);

        return $order;
    }

    public function test_klienti_mund_te_shoh_porosite_e_veta_me_search_dhe_filtra(): void
    {
        $customer = User::where('role', 'customer')->first();
        $order = $this->createTestOrder($customer, 'confirmed');

        $token = $customer->createToken('test_token')->plainTextToken;

        // Merr listën
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/orders/my-orders');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data', 'meta']);

        $this->assertTrue(collect($response->json('data'))->contains('order_number', $order->order_number));

        // Filtrim me status
        $filterRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/orders/my-orders?status=confirmed');
        $filterRes->assertStatus(200);
        $this->assertTrue(collect($filterRes->json('data'))->contains('order_number', $order->order_number));

        // Kërkim sipas numrit të porosisë
        $searchRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/orders/my-orders?search=' . $order->order_number);
        $searchRes->assertStatus(200);
        $this->assertCount(1, $searchRes->json('data'));
    }

    public function test_klienti_nuk_mund_te_shoh_porosite_e_klienteve_te_tjere(): void
    {
        $customer1 = User::where('role', 'customer')->first();
        $customer2 = User::factory()->create(['role' => 'customer']);

        $order2 = $this->createTestOrder($customer2, 'confirmed');

        $token1 = $customer1->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token1)
            ->getJson('/api/v1/orders/my-orders');

        $response->assertStatus(200);
        $this->assertFalse(collect($response->json('data'))->contains('order_number', $order2->order_number));
    }

    public function test_klienti_mund_te_anuloj_porosine_e_tij_para_se_te_filloj_kuzhina(): void
    {
        $customer = User::where('role', 'customer')->first();
        $order = $this->createTestOrder($customer, 'confirmed');

        $token = $customer->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/orders/{$order->order_number}/cancel", [
                'reason' => 'Ndryshova mendje, dëshiroj diçka tjetër.',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'cancelled');

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'cancelled',
        ]);

        $this->assertDatabaseHas('order_status_history', [
            'order_id' => $order->id,
            'from_status' => 'confirmed',
            'to_status' => 'cancelled',
            'changed_by_user_id' => $customer->id,
        ]);
    }

    public function test_klienti_nuk_mund_te_anuloj_porosine_pasi_kuzhina_fillon_pergatitjen(): void
    {
        $customer = User::where('role', 'customer')->first();
        $order = $this->createTestOrder($customer, 'in_preparation');

        $token = $customer->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/orders/{$order->order_number}/cancel", [
                'reason' => 'Dua ta anuloj',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'in_preparation',
        ]);
    }

    public function test_stafi_i_kuzhines_mund_te_ndryshoj_statusin_ne_kds(): void
    {
        $customer = User::where('role', 'customer')->first();
        $kitchenStaff = User::where('role', 'kitchen_staff')->first();
        $order = $this->createTestOrder($customer, 'confirmed');

        $token = $kitchenStaff->createToken('staff_token')->plainTextToken;

        // Kalon nga confirmed në in_preparation
        $prepRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson("/api/v1/kds/tickets/{$order->id}/status", [
                'status' => 'in_preparation',
                'reason' => 'Filloi përgatitja e picës.',
            ]);

        $prepRes->assertStatus(200)
            ->assertJsonPath('data.status', 'in_preparation');

        // Kalon nga in_preparation në ready_for_pickup
        $readyRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson("/api/v1/kds/tickets/{$order->id}/status", [
                'status' => 'ready_for_pickup',
            ]);

        $readyRes->assertStatus(200)
            ->assertJsonPath('data.status', 'ready_for_pickup');

        $this->assertDatabaseHas('order_status_history', [
            'order_id' => $order->id,
            'from_status' => 'in_preparation',
            'to_status' => 'ready_for_pickup',
            'changed_by_user_id' => $kitchenStaff->id,
        ]);
    }

    public function test_perdoruesi_pa_autorizim_nuk_mund_te_kryej_tranzicion_te_paautorizuar(): void
    {
        $customer = User::where('role', 'customer')->first();
        $kitchenStaff = User::where('role', 'kitchen_staff')->first();
        $order = $this->createTestOrder($customer, 'ready_for_pickup');

        $token = $kitchenStaff->createToken('staff_token')->plainTextToken;

        // Stafi i kuzhinës nuk lejohet të shënojë porosinë si 'completed' (arkëtari ose admini e bën)
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson("/api/v1/orders/{$order->id}/status", [
                'status' => 'completed',
            ]);

        $response->assertStatus(403);
    }

    public function test_admini_mund_te_listoje_porosite_me_filtra_dhe_statistika(): void
    {
        $admin = User::where('role', 'super_admin')->first();
        $customer = User::where('role', 'customer')->first();

        $order1 = $this->createTestOrder($customer, 'confirmed');
        $order2 = $this->createTestOrder($customer, 'in_preparation');

        $token = $admin->createToken('admin_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/admin/orders');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data',
                'meta' => ['current_page', 'last_page', 'total'],
                'summary' => ['total_orders', 'status_counts'],
            ]);

        // Filtrim sipas statusit
        $filtered = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/admin/orders?status=confirmed');

        $filtered->assertStatus(200);
        $this->assertTrue(collect($filtered->json('data'))->contains('order_number', $order1->order_number));
    }

    public function test_admini_mund_te_shoh_detajet_e_plota_te_porosise(): void
    {
        $admin = User::where('role', 'super_admin')->first();
        $customer = User::where('role', 'customer')->first();
        $order = $this->createTestOrder($customer, 'confirmed');

        $token = $admin->createToken('admin_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson("/api/v1/admin/orders/{$order->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.order_number', $order->order_number)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'order_number',
                    'customer',
                    'branch',
                    'items',
                    'payment',
                    'status_history',
                ]
            ]);
    }

    public function test_klienti_nuk_ka_qasje_ne_admin_orders(): void
    {
        $customer = User::where('role', 'customer')->first();
        $token = $customer->createToken('cust_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/admin/orders');

        $response->assertStatus(403);
    }

    public function test_perfundimi_i_porosise_azhurnon_statusin_e_pageses(): void
    {
        $admin = User::where('role', 'super_admin')->first();
        $customer = User::where('role', 'customer')->first();
        $order = $this->createTestOrder($customer, 'ready_for_pickup');

        $token = $admin->createToken('admin_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson("/api/v1/admin/orders/{$order->id}/status", [
                'status' => 'completed',
                'reason' => 'Porosia u dorëzua dhe u pranua pagesa.',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.payment_status', 'paid');

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'completed',
            'payment_status' => 'paid',
        ]);

        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'status' => 'completed',
        ]);
    }
}
