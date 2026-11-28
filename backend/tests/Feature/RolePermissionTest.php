<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Role Permission Tests
 *
 * Verifies that RBAC middleware correctly enforces role-based access
 * on all major API route groups: KDS, Admin, Courier, Finance.
 */
class RolePermissionTest extends TestCase
{
    use RefreshDatabase;

    // ---- KDS ----

    public function test_klienti_nuk_ka_qasje_ne_kds(): void
    {
        $klient = User::factory()->create(['role' => 'customer']);
        $this->actingAs($klient)
            ->getJson('/api/v1/kds/tickets')
            ->assertStatus(403);
    }

    public function test_stafi_i_kuzines_ka_qasje_ne_kds(): void
    {
        $stafi = User::factory()->create(['role' => 'kitchen_staff']);
        $this->actingAs($stafi)
            ->getJson('/api/v1/kds/tickets')
            ->assertStatus(200);
    }

    public function test_branch_manager_ka_qasje_ne_kds(): void
    {
        $manager = User::factory()->create(['role' => 'branch_manager']);
        $this->actingAs($manager)
            ->getJson('/api/v1/kds/tickets')
            ->assertStatus(200);
    }

    public function test_super_admin_ka_qasje_ne_kds(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $this->actingAs($admin)
            ->getJson('/api/v1/kds/tickets')
            ->assertStatus(200);
    }

    public function test_korrieri_nuk_ka_qasje_ne_kds(): void
    {
        $korrieri = User::factory()->create(['role' => 'courier']);
        $this->actingAs($korrieri)
            ->getJson('/api/v1/kds/tickets')
            ->assertStatus(403);
    }

    // ---- Admin Metrics ----

    public function test_klienti_nuk_ka_qasje_ne_metriken_e_admins(): void
    {
        $klient = User::factory()->create(['role' => 'customer']);
        $this->actingAs($klient)
            ->getJson('/api/v1/admin/metrics')
            ->assertStatus(403);
    }

    public function test_stafi_i_kuzines_nuk_ka_qasje_ne_metriken_e_admins(): void
    {
        $stafi = User::factory()->create(['role' => 'kitchen_staff']);
        $this->actingAs($stafi)
            ->getJson('/api/v1/admin/metrics')
            ->assertStatus(403);
    }

    public function test_korrieri_nuk_ka_qasje_ne_metriken_e_admins(): void
    {
        $korrieri = User::factory()->create(['role' => 'courier']);
        $this->actingAs($korrieri)
            ->getJson('/api/v1/admin/metrics')
            ->assertStatus(403);
    }

    public function test_super_admini_ka_qasje_ne_metriken_e_platformes(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $this->actingAs($admin)
            ->getJson('/api/v1/admin/metrics')
            ->assertStatus(200)
            ->assertJsonStructure([
                'total_users',
                'total_restaurants',
                'total_branches',
                'total_orders',
                'total_revenue',
            ]);
    }

    public function test_owner_ka_qasje_ne_metriken_e_admins(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $this->actingAs($owner)
            ->getJson('/api/v1/admin/metrics')
            ->assertStatus(200);
    }

    public function test_branch_manager_ka_qasje_ne_metriken_e_admins(): void
    {
        $manager = User::factory()->create(['role' => 'branch_manager']);
        $this->actingAs($manager)
            ->getJson('/api/v1/admin/metrics')
            ->assertStatus(200);
    }

    // ---- Courier Dashboard ----

    public function test_klienti_nuk_ka_qasje_ne_courier_dashboard(): void
    {
        $klient = User::factory()->create(['role' => 'customer']);
        $this->actingAs($klient)
            ->getJson('/api/v1/courier/dashboard')
            ->assertStatus(403);
    }

    public function test_stafi_i_kuzines_nuk_ka_qasje_ne_courier_dashboard(): void
    {
        $stafi = User::factory()->create(['role' => 'kitchen_staff']);
        $this->actingAs($stafi)
            ->getJson('/api/v1/courier/dashboard')
            ->assertStatus(403);
    }

    public function test_korrieri_ka_qasje_ne_courier_dashboard(): void
    {
        $korrieri = User::factory()->create(['role' => 'courier']);
        $this->actingAs($korrieri)
            ->getJson('/api/v1/courier/dashboard')
            ->assertStatus(200);
    }

    // ---- Super Admin Finance ----

    public function test_klienti_nuk_ka_qasje_ne_finance_dashboard(): void
    {
        $klient = User::factory()->create(['role' => 'customer']);
        $this->actingAs($klient)
            ->getJson('/api/v1/admin/finance/dashboard')
            ->assertStatus(403);
    }

    public function test_owner_nuk_ka_qasje_ne_super_admin_finance_dashboard(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $this->actingAs($owner)
            ->getJson('/api/v1/admin/finance/dashboard')
            ->assertStatus(403);
    }

    public function test_branch_manager_nuk_ka_qasje_ne_super_admin_finance_dashboard(): void
    {
        $manager = User::factory()->create(['role' => 'branch_manager']);
        $this->actingAs($manager)
            ->getJson('/api/v1/admin/finance/dashboard')
            ->assertStatus(403);
    }

    public function test_super_admin_ka_qasje_ne_finance_dashboard(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $this->actingAs($admin)
            ->getJson('/api/v1/admin/finance/dashboard')
            ->assertStatus(200);
    }

    // ---- Unauthenticated ----

    public function test_i_paautentifikuar_nuk_ka_qasje_ne_kds(): void
    {
        $this->getJson('/api/v1/kds/tickets')->assertStatus(401);
    }

    public function test_i_paautentifikuar_nuk_ka_qasje_ne_admin(): void
    {
        $this->getJson('/api/v1/admin/orders')->assertStatus(401);
    }

    public function test_i_paautentifikuar_nuk_ka_qasje_ne_notifications(): void
    {
        $this->getJson('/api/v1/notifications')->assertStatus(401);
    }

    public function test_i_paautentifikuar_nuk_ka_qasje_ne_courier(): void
    {
        $this->getJson('/api/v1/courier/dashboard')->assertStatus(401);
    }

    public function test_i_paautentifikuar_nuk_ka_qasje_ne_finance(): void
    {
        $this->getJson('/api/v1/admin/finance/dashboard')->assertStatus(401);
    }
}
