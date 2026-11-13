<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderCheckoutTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_klienti_mund_te_krijoj_porosi_me_sukses(): void
    {
        $customer = User::where('role', 'customer')->first();
        $branch = Branch::first();
        $product = Product::where('is_available', true)->first();

        $payload = [
            'branch_id' => $branch->id,
            'order_type' => 'delivery',
            'customer_name' => 'Blin Krasniqi',
            'customer_email' => 'customer.blin@tastio.com',
            'customer_phone' => '+38349111222',
            'customer_note' => 'Ju lutem bjerini ziles',
            'payment_method' => 'cash_on_delivery',
            'delivery_address' => [
                'city' => 'Prishtinë',
                'street' => 'Rruga Nëna Terezë',
                'building' => 'Ndërtesa 14',
                'floor' => 'Kati 3, Banesa 9',
                'notes' => 'Hyrja A'
            ],
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 2,
                    'selected_choices' => []
                ]
            ]
        ];

        $token = $customer->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/orders', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('orders', [
            'branch_id' => $branch->id,
            'customer_id' => $customer->id,
            'status' => 'confirmed',
            'order_type' => 'delivery',
        ]);
    }

    public function test_porosia_deshton_kur_adresa_e_dergeses_mungon(): void
    {
        $customer = User::where('role', 'customer')->first();
        $branch = Branch::first();
        $product = Product::where('is_available', true)->first();

        $payload = [
            'branch_id' => $branch->id,
            'order_type' => 'delivery',
            'customer_name' => 'Blin Krasniqi',
            'customer_email' => 'customer.blin@tastio.com',
            'customer_phone' => '+38349111222',
            'payment_method' => 'cash_on_delivery',
            'delivery_address' => null,
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 1
                ]
            ]
        ];

        $token = $customer->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/orders', $payload);

        $response->assertStatus(422);
    }
}
