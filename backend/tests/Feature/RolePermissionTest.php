<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RolePermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_klienti_nuk_ka_qasje_ne_kds(): void
    {
        $klient = User::factory()->create(['role' => 'customer']);
        $token = $klient->createToken('token_test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/kds/tickets');

        $response->assertStatus(403);
    }

    public function test_stafi_i_kuzines_ka_qasje_ne_kds(): void
    {
        $stafi = User::factory()->create(['role' => 'kitchen_staff']);
        $token = $stafi->createToken('token_test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/kds/tickets');

        $response->assertStatus(200);
    }

    public function test_klienti_nuk_ka_qasje_ne_metriken_e_admins(): void
    {
        $klient = User::factory()->create(['role' => 'customer']);
        $token = $klient->createToken('token_test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/admin/metrics');

        $response->assertStatus(403);
    }

    public function test_super_admini_ka_qasje_ne_metriken_e_platformes(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $token = $admin->createToken('token_test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/admin/metrics');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'total_users',
                'total_restaurants',
                'total_branches',
                'total_orders',
                'total_revenue',
            ]);
    }
}
