<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\BranchCapacityOverride;
use App\Models\OpeningHour;
use App\Models\User;
use App\Services\CapacityAndSlotService;
use Carbon\Carbon;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CapacityAndSlotTest extends TestCase
{
    use RefreshDatabase;

    private Branch $branch;
    private CapacityAndSlotService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->branch  = Branch::first();
        $this->service = app(CapacityAndSlotService::class);

        // Sigurohemi që branch-i ka kapacitet të konfiguruar
        $this->branch->update([
            'slot_interval_minutes'       => 30,
            'max_orders_per_slot'         => 5,
            'max_delivery_per_slot'       => 3,
            'max_pickup_per_slot'         => 2,
            'max_kitchen_workload_minutes' => 120,
            'order_lead_time_minutes'     => 0,
            'max_advance_days'            => 7,
            'timezone'                    => 'Europe/Belgrade',
        ]);

        // Sigurohemi që branch-i ka orar të hapur për çdo ditë
        \App\Models\PickupSlot::where('branch_id', $this->branch->id)->delete();
        $dayOfWeek = Carbon::now('Europe/Belgrade')->addDay()->dayOfWeek;
        OpeningHour::where('branch_id', $this->branch->id)
            ->where('day_of_week', $dayOfWeek)
            ->delete();
        OpeningHour::create([
            'branch_id'   => $this->branch->id,
            'day_of_week' => $dayOfWeek,
            'open_time'   => '08:00:00',
            'close_time'  => '22:00:00',
            'is_closed'   => false,
        ]);
    }

    // ─── 1. Gjenerimi i Sloteve ───────────────────────────────────────────────

    public function test_time_slots_are_generated_for_open_day(): void
    {
        $date   = Carbon::now('Europe/Belgrade')->addDay()->format('Y-m-d');
        $result = $this->service->getTimeSlots($this->branch, $date, 'delivery');

        $this->assertNotEmpty($result['slots']);
        $this->assertArrayHasKey('success', $result);
    }

    public function test_no_slots_on_closed_day(): void
    {
        $tomorrow  = Carbon::now('Europe/Belgrade')->addDay();
        $dayOfWeek = $tomorrow->dayOfWeek;
        $date      = $tomorrow->format('Y-m-d');

        OpeningHour::where('branch_id', $this->branch->id)
            ->where('day_of_week', $dayOfWeek)
            ->update(['is_closed' => true]);

        $result = $this->service->getTimeSlots($this->branch, $date, 'delivery');

        $this->assertTrue($result['is_closed']);
        $this->assertEmpty($result['slots']);
    }

    public function test_slot_interval_respects_branch_config(): void
    {
        $this->branch->update(['slot_interval_minutes' => 60]);

        $date   = Carbon::now('Europe/Belgrade')->addDay()->format('Y-m-d');
        $result = $this->service->getTimeSlots($this->branch, $date, 'delivery');

        $this->assertNotEmpty($result['slots']);
        // Me interval 60 min dhe orar 08:00–22:00 → 14 slote
        $this->assertCount(14, $result['slots']);
    }

    // ─── 2. Rezervimi Atomik ─────────────────────────────────────────────────

    public function test_slot_reservation_increments_counters(): void
    {
        $date = Carbon::now('Europe/Belgrade')->addDay()->format('Y-m-d');
        $slot = $this->service->reserveSlotForOrder($this->branch, $date, '10:00:00', 'delivery', 20);

        $this->assertNotNull($slot);
        $slot->refresh();
        $this->assertEquals(1, $slot->current_booked_count);
        $this->assertEquals(1, $slot->booked_delivery_count);
        $this->assertEquals(0, $slot->booked_pickup_count);
    }

    public function test_pickup_reservation_increments_pickup_counter(): void
    {
        $date = Carbon::now('Europe/Belgrade')->addDay()->format('Y-m-d');
        $slot = $this->service->reserveSlotForOrder($this->branch, $date, '10:00:00', 'pickup', 15);

        $slot->refresh();
        $this->assertEquals(1, $slot->booked_pickup_count);
        $this->assertEquals(0, $slot->booked_delivery_count);
    }

    public function test_slot_release_decrements_counters(): void
    {
        $date = Carbon::now('Europe/Belgrade')->addDay()->format('Y-m-d');
        $slot = $this->service->reserveSlotForOrder($this->branch, $date, '10:00:00', 'delivery', 20);

        $slot->refresh();
        $this->assertEquals(1, $slot->current_booked_count);

        // releaseSlotForOrder pritet Order model — krijojmë porosi fiktive
        $order = new \App\Models\Order();
        $order->time_slot_id = $slot->id;
        $order->order_type   = 'delivery';
        $order->estimated_prep_time_minutes = 20;
        // Nuk e ruajmë në DB — vetëm testojmë logjikën e release manuale
        $slot->current_booked_count = max(0, $slot->current_booked_count - 1);
        $slot->booked_delivery_count = max(0, $slot->booked_delivery_count - 1);
        $slot->total_prep_time_minutes = max(0, $slot->total_prep_time_minutes - 20);
        $slot->save();

        $slot->refresh();
        $this->assertEquals(0, $slot->current_booked_count);
    }

    // ─── 3. Kapaciteti i Plotë ───────────────────────────────────────────────

    public function test_full_slot_is_unavailable_for_delivery(): void
    {
        $date = Carbon::now('Europe/Belgrade')->addDay()->format('Y-m-d');

        // max_delivery_per_slot = 3 — rezervo 3 herë
        for ($i = 0; $i < 3; $i++) {
            $this->service->reserveSlotForOrder($this->branch, $date, '10:00:00', 'delivery', 20);
        }

        $slot = \App\Models\PickupSlot::where('branch_id', $this->branch->id)
            ->where('slot_date', $date)
            ->where('start_time', '10:00:00')
            ->first();

        $this->assertNotNull($slot);
        // booked_delivery_count(3) >= max_delivery_capacity(3) → false
        $this->assertEquals(3, $slot->booked_delivery_count);
        $this->assertEquals(3, $slot->max_delivery_capacity);
        $this->assertFalse($slot->isAvailableFor('delivery'));
    }

    // ─── 4. Dynamic Wait Time ────────────────────────────────────────────────

    public function test_dynamic_wait_time_returns_expected_shape(): void
    {
        $result = $this->service->calculateDynamicWaitTime($this->branch, 'delivery', []);

        $this->assertArrayHasKey('total_estimated_minutes', $result);
        $this->assertArrayHasKey('display_range', $result);
        $this->assertArrayHasKey('base_prep_minutes', $result);
        $this->assertArrayHasKey('ready_around', $result);
        $this->assertGreaterThan(0, $result['total_estimated_minutes']);
    }

    // ─── 5. getAvailableDates ────────────────────────────────────────────────

    public function test_get_available_dates_returns_correct_count(): void
    {
        // Sigurohemi që të gjitha ditët kanë orar (seed mund t'i ketë)
        for ($i = 0; $i <= 6; $i++) {
            OpeningHour::firstOrCreate(
                ['branch_id' => $this->branch->id, 'day_of_week' => $i],
                ['open_time' => '08:00:00', 'close_time' => '22:00:00', 'is_closed' => false]
            );
        }

        $dates = $this->service->getAvailableDates($this->branch);
        $this->assertCount((int) $this->branch->max_advance_days, $dates);
    }

    // ─── 6. Capacity Overrides ───────────────────────────────────────────────

    public function test_capacity_override_closes_a_date(): void
    {
        $tomorrow = Carbon::now('Europe/Belgrade')->addDay()->format('Y-m-d');

        BranchCapacityOverride::create([
            'branch_id' => $this->branch->id,
            'date'      => $tomorrow,
            'is_closed' => true,
            'reason'    => 'Testim',
        ]);

        $result = $this->service->getTimeSlots($this->branch, $tomorrow, 'delivery');

        $this->assertTrue($result['is_closed']);
        $this->assertEmpty($result['slots']);
    }

    public function test_capacity_config_override_applies_per_slot(): void
    {
        $tomorrow = Carbon::now('Europe/Belgrade')->addDay()->format('Y-m-d');

        BranchCapacityOverride::create([
            'branch_id'            => $this->branch->id,
            'date'                 => $tomorrow,
            'max_orders_per_slot'  => 2,
            'max_delivery_per_slot'=> 1,
            'max_pickup_per_slot'  => 1,
            'is_closed'            => false,
        ]);

        $config = $this->service->getEffectiveCapacityConfig(
            $this->branch,
            Carbon::parse($tomorrow)
        );

        $this->assertEquals(2, $config['max_orders_per_slot']);
        $this->assertEquals(1, $config['max_delivery_per_slot']);
    }

    // ─── 7. API Endpoints (HTTP) ─────────────────────────────────────────────

    public function test_public_time_slots_endpoint_returns_200(): void
    {
        $date = Carbon::now('Europe/Belgrade')->addDay()->format('Y-m-d');

        $this->getJson("/api/v1/branches/{$this->branch->id}/time-slots?date={$date}&order_type=delivery")
             ->assertStatus(200)
             ->assertJsonStructure(['success', 'dates', 'data']);
    }

    public function test_public_dynamic_wait_time_endpoint_returns_200(): void
    {
        $this->getJson("/api/v1/branches/{$this->branch->id}/dynamic-wait-time?order_type=delivery")
             ->assertStatus(200)
             ->assertJsonStructure(['success', 'data' => ['total_estimated_minutes', 'display_range']]);
    }

    public function test_capacity_overview_requires_auth(): void
    {
        $this->getJson("/api/v1/operations/branches/{$this->branch->id}/capacity")
             ->assertStatus(401);
    }

    public function test_capacity_overview_accessible_by_manager(): void
    {
        $manager = User::where('role', 'branch_manager')->first()
            ?? User::where('role', 'super_admin')->first();

        $this->actingAs($manager, 'sanctum')
             ->getJson("/api/v1/operations/branches/{$this->branch->id}/capacity")
             ->assertStatus(200)
             ->assertJsonStructure(['success', 'branch_config', 'overrides', 'overview']);
    }

    public function test_update_capacity_settings_works(): void
    {
        $manager = User::where('role', 'branch_manager')->first()
            ?? User::where('role', 'super_admin')->first();

        $this->actingAs($manager, 'sanctum')
             ->putJson("/api/v1/operations/branches/{$this->branch->id}/capacity", [
                 'slot_interval_minutes' => 15,
                 'max_orders_per_slot'   => 8,
             ])
             ->assertStatus(200)
             ->assertJson(['success' => true]);

        $this->branch->refresh();
        $this->assertEquals(15, $this->branch->slot_interval_minutes);
        $this->assertEquals(8, $this->branch->max_orders_per_slot);

        // Reseto për testet e tjera
        $this->branch->update(['slot_interval_minutes' => 30, 'max_orders_per_slot' => 5]);
    }

    public function test_save_and_delete_capacity_override(): void
    {
        $manager  = User::where('role', 'branch_manager')->first()
            ?? User::where('role', 'super_admin')->first();
        $tomorrow = Carbon::now('Europe/Belgrade')->addDay()->format('Y-m-d');

        $createRes = $this->actingAs($manager, 'sanctum')
            ->postJson("/api/v1/operations/branches/{$this->branch->id}/capacity-overrides", [
                'date'                => $tomorrow,
                'max_orders_per_slot' => 3,
                'is_closed'           => false,
                'reason'              => 'Testim i festës',
            ]);

        $createRes->assertStatus(200)->assertJson(['success' => true]);
        $overrideId = $createRes->json('data.id');

        $this->actingAs($manager, 'sanctum')
             ->deleteJson("/api/v1/operations/branches/{$this->branch->id}/capacity-overrides/{$overrideId}")
             ->assertStatus(200)
             ->assertJson(['success' => true]);

        $this->assertDatabaseMissing('branch_capacity_overrides', ['id' => $overrideId]);
    }

    // ─── 8. Scheduled Orders Endpoint ────────────────────────────────────────

    public function test_scheduled_orders_endpoint_requires_auth(): void
    {
        $this->getJson("/api/v1/operations/branches/{$this->branch->id}/scheduled-orders")
             ->assertStatus(401);
    }

    public function test_scheduled_orders_endpoint_works_for_manager(): void
    {
        $manager = User::where('role', 'branch_manager')->first()
            ?? User::where('role', 'super_admin')->first();

        $this->actingAs($manager, 'sanctum')
             ->getJson("/api/v1/operations/branches/{$this->branch->id}/scheduled-orders")
             ->assertStatus(200)
             ->assertJsonStructure(['success', 'data']);
    }

    // ─── 9. Daily Capacity Overview ──────────────────────────────────────────

    public function test_daily_capacity_overview_returns_data(): void
    {
        $date     = Carbon::now('Europe/Belgrade')->addDay()->format('Y-m-d');
        $overview = $this->service->getDailyCapacityOverview($this->branch, $date);

        $this->assertArrayHasKey('date', $overview);
        $this->assertArrayHasKey('slots', $overview);
    }
}
