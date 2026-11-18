<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\PickupToken;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class OrderVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    private function createOrderWithToken(string $orderType = 'delivery', string $status = 'confirmed'): array
    {
        $customer = User::where('role', 'customer')->first();
        $branch = Branch::first();
        $product = Product::first();

        $order = Order::create([
            'order_number' => 'TASTIO-VER' . rand(1000, 9999),
            'customer_id' => $customer->id,
            'branch_id' => $branch->id,
            'order_type' => $orderType,
            'customer_name' => 'Blin Krasniqi',
            'customer_email' => 'blin.secret@example.com',
            'customer_phone' => '+38349111222',
            'delivery_address' => json_encode([
                'city' => 'Prishtinë',
                'street' => 'Rruga Nënë Tereza',
                'building' => '14',
            ]),
            'status' => $status,
            'subtotal' => 15.00,
            'delivery_fee' => $orderType === 'delivery' ? 1.50 : 0.00,
            'tax_amount' => 0.00,
            'total_price' => $orderType === 'delivery' ? 16.50 : 15.00,
            'payment_status' => 'pending',
            'payment_method' => 'cash_on_delivery',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name_snapshot' => $product->name,
            'unit_price_snapshot' => 15.00,
            'quantity' => 1,
            'line_total' => 15.00,
            'item_status' => 'pending',
        ]);

        Payment::create([
            'order_id' => $order->id,
            'amount' => $order->total_price,
            'method' => 'cash_on_delivery',
            'status' => 'pending',
        ]);

        $rawToken = Str::random(40);
        $verifyUrl = "https://tastio.com/orders/{$order->id}/verify?token={$rawToken}";

        $pickupToken = PickupToken::create([
            'order_id' => $order->id,
            'token_hash' => hash('sha256', $rawToken),
            'short_code' => '789123',
            'qr_payload' => $verifyUrl,
            'expires_at' => now()->addDays(2),
            'is_redeemed' => false,
        ]);

        return [$order, $rawToken, $pickupToken];
    }

    public function test_krijimi_i_porosise_gjeneron_url_te_vlefshme_per_qr_code(): void
    {
        $customer = User::where('role', 'customer')->first();
        $branch = Branch::first();
        $product = Product::where('is_available', true)->first();

        $token = $customer->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/orders', [
                'branch_id' => $branch->id,
                'order_type' => 'delivery',
                'customer_name' => 'Blin Krasniqi',
                'customer_email' => 'blin@tastio.com',
                'customer_phone' => '+38349111222',
                'payment_method' => 'cash_on_delivery',
                'delivery_address' => [
                    'city' => 'Prishtinë',
                    'street' => 'Rruga Test',
                ],
                'items' => [
                    [
                        'product_id' => $product->id,
                        'quantity' => 1,
                    ]
                ]
            ]);

        $response->assertStatus(201);
        $createdOrder = Order::latest()->first();
        $pickupToken = $createdOrder->pickupToken;

        $this->assertNotNull($pickupToken);
        $this->assertStringContainsString('/orders/', $pickupToken->qr_payload);
        $this->assertStringContainsString('/verify?token=', $pickupToken->qr_payload);
        $this->assertStringContainsString((string) $createdOrder->id, $pickupToken->qr_payload);
    }

    public function test_verifikimi_publik_funksionon_pa_autentifikim_dhe_me_token(): void
    {
        [$order, $rawToken] = $this->createOrderWithToken('delivery', 'confirmed');

        // Thirrje publike (pa Bearer token)
        $response = $this->getJson("/api/v1/orders/{$order->order_number}/verify?token={$rawToken}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('verified', true)
            ->assertJsonPath('data.order_number', $order->order_number)
            ->assertJsonPath('data.status', 'confirmed')
            ->assertJsonPath('data.order_type', 'delivery');
    }

    public function test_verifikimi_funksionon_edhe_me_id_numerike(): void
    {
        [$order, $rawToken] = $this->createOrderWithToken('pickup', 'ready_for_pickup');

        $response = $this->getJson("/api/v1/orders/{$order->id}/verify?token={$rawToken}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('verified', true)
            ->assertJsonPath('data.id', $order->id)
            ->assertJsonPath('data.order_type', 'pickup')
            ->assertJsonPath('data.status', 'ready_for_pickup');
    }

    public function test_verifikimi_deshton_me_token_te_pasakte(): void
    {
        [$order] = $this->createOrderWithToken('delivery');

        $response = $this->getJson("/api/v1/orders/{$order->id}/verify?token=gabim_total_token");

        $response->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('verified', false);
    }

    public function test_verifikimi_mbron_privatesine_dhe_nuk_ekspozon_te_dhena_private(): void
    {
        [$order, $rawToken] = $this->createOrderWithToken('delivery');

        $response = $this->getJson("/api/v1/orders/{$order->order_number}/verify?token={$rawToken}");

        $response->assertStatus(200);

        // Sigurohemi që email-i privat nuk kthehet në përgjigje
        $content = $response->getContent();
        $this->assertStringNotContainsString('blin.secret@example.com', $content);

        // Emri i klientit duhet të jetë i maskuar (p.sh. Blin K.)
        $this->assertEquals('Blin K.', $response->json('data.customer_display_name'));
    }

    public function test_my_orders_siguron_qr_payload_te_vlefshme_per_cdo_porosi(): void
    {
        $customer = User::where('role', 'customer')->first();
        [$order] = $this->createOrderWithToken('pickup');

        $authToken = $customer->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $authToken)
            ->getJson('/api/v1/orders/my-orders');

        $response->assertStatus(200);
        $orderData = collect($response->json('data'))->firstWhere('id', $order->id);

        $this->assertNotNull($orderData);
        $this->assertStringContainsString('/orders/', $orderData['pickup_token']['qr_payload']);
        $this->assertStringContainsString('/verify?token=', $orderData['pickup_token']['qr_payload']);
    }
}
