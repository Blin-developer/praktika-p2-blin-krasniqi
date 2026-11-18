<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\OpeningHour;
use App\Models\Order;
use App\Models\Product;
use App\Models\SpecialOpeningHour;
use App\Models\StaffMembership;
use App\Models\User;
use App\Services\RestaurantAvailabilityService;
use Carbon\Carbon;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RestaurantOperationsTest extends TestCase
{
    use RefreshDatabase;

    protected RestaurantAvailabilityService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->service = app(RestaurantAvailabilityService::class);
    }

    public function test_dega_llogarit_saktesisht_statusin_hapur_dhe_mbyllur(): void
    {
        $branch = Branch::first();

        // Vendosim orarin për të Hënën (day 1): 09:00 - 18:00
        OpeningHour::where('branch_id', $branch->id)->where('day_of_week', 1)->delete();
        OpeningHour::create([
            'branch_id' => $branch->id,
            'day_of_week' => 1,
            'open_time' => '09:00:00',
            'close_time' => '18:00:00',
            'is_closed' => false,
        ]);

        // Simulohet e Hënë në orën 12:00 (brenda orarit)
        $mondayNoon = Carbon::parse('next Monday 12:00:00', 'Europe/Belgrade');
        $availOpen = $this->service->getBranchAvailability($branch, $mondayNoon);

        $this->assertTrue($availOpen['is_open']);
        $this->assertEquals('open', $availOpen['status']);
        $this->assertEquals('Hapur', $availOpen['status_label']);
        $this->assertTrue($availOpen['can_accept_orders']);

        // Simulohet e Hënë në orën 22:00 (jashtë orarit)
        $mondayNight = Carbon::parse('next Monday 22:00:00', 'Europe/Belgrade');
        $availClosed = $this->service->getBranchAvailability($branch, $mondayNight);

        $this->assertFalse($availClosed['is_open']);
        $this->assertEquals('closed', $availClosed['status']);
        $this->assertEquals('Mbyllur', $availClosed['status_label']);
        $this->assertFalse($availClosed['can_accept_orders']);
    }

    public function test_orari_me_intervale_te_shumefishta_ne_dite(): void
    {
        $branch = Branch::first();

        // Dy intervale për të Martën (day 2): Drekë (11:00-15:00) dhe Darkë (18:00-23:00)
        OpeningHour::where('branch_id', $branch->id)->where('day_of_week', 2)->delete();

        OpeningHour::create([
            'branch_id' => $branch->id,
            'day_of_week' => 2,
            'open_time' => '11:00:00',
            'close_time' => '15:00:00',
            'is_closed' => false,
            'label' => 'Orari i Drekës',
            'sort_order' => 1,
        ]);

        OpeningHour::create([
            'branch_id' => $branch->id,
            'day_of_week' => 2,
            'open_time' => '18:00:00',
            'close_time' => '23:00:00',
            'is_closed' => false,
            'label' => 'Orari i Darkës',
            'sort_order' => 2,
        ]);

        // 1. Ora 13:00 (gjatë drekës) -> HAPUR
        $tuesdayLunch = Carbon::parse('next Tuesday 13:00:00', 'Europe/Belgrade');
        $availLunch = $this->service->getBranchAvailability($branch, $tuesdayLunch);
        $this->assertTrue($availLunch['is_open']);
        $this->assertEquals('Orari i Drekës', $availLunch['active_interval']['label'] ?? '');

        // 2. Ora 16:30 (pushim mes drekës dhe darkës) -> MBYLLUR
        $tuesdayBreak = Carbon::parse('next Tuesday 16:30:00', 'Europe/Belgrade');
        $availBreak = $this->service->getBranchAvailability($branch, $tuesdayBreak);
        $this->assertFalse($availBreak['is_open']);

        // 3. Ora 20:00 (gjatë darkës) -> HAPUR
        $tuesdayDinner = Carbon::parse('next Tuesday 20:00:00', 'Europe/Belgrade');
        $availDinner = $this->service->getBranchAvailability($branch, $tuesdayDinner);
        $this->assertTrue($availDinner['is_open']);
        $this->assertEquals('Orari i Darkës', $availDinner['active_interval']['label'] ?? '');
    }

    public function test_orari_i_nates_pas_mesnate(): void
    {
        $branch = Branch::first();

        // E Premte (day 5) orar nate: 20:00 deri në 03:00 të mëngjesit të së Shtunës
        OpeningHour::where('branch_id', $branch->id)->where('day_of_week', 5)->delete();
        OpeningHour::create([
            'branch_id' => $branch->id,
            'day_of_week' => 5,
            'open_time' => '20:00:00',
            'close_time' => '03:00:00',
            'is_closed' => false,
            'is_overnight' => true,
            'label' => 'Shifti i Natës',
        ]);

        // E Shtunë (day 6): hapet në 12:00
        OpeningHour::where('branch_id', $branch->id)->where('day_of_week', 6)->delete();
        OpeningHour::create([
            'branch_id' => $branch->id,
            'day_of_week' => 6,
            'open_time' => '12:00:00',
            'close_time' => '23:00:00',
            'is_closed' => false,
        ]);

        // E Premte në orën 23:00 -> HAPUR
        $fridayNight = Carbon::parse('next Friday 23:00:00', 'Europe/Belgrade');
        $availFriday = $this->service->getBranchAvailability($branch, $fridayNight);
        $this->assertTrue($availFriday['is_open']);

        // Të Shtunën në orën 01:30 të mëngjesit (vazhdimi i orarit të së Premtes pas mesnate) -> HAPUR
        $saturdayEarly = Carbon::parse('next Friday 23:00:00', 'Europe/Belgrade')->addHours(2.5); // Saturday 01:30
        $availEarly = $this->service->getBranchAvailability($branch, $saturdayEarly);
        $this->assertTrue($availEarly['is_open']);

        // Të Shtunën në orën 04:00 të mëngjesit -> MBYLLUR
        $saturdayMorning = Carbon::parse('next Friday 23:00:00', 'Europe/Belgrade')->addHours(5); // Saturday 04:00
        $availClosed = $this->service->getBranchAvailability($branch, $saturdayMorning);
        $this->assertFalse($availClosed['is_open']);
    }

    public function test_orari_special_dhe_festat_kane_perparesi_ndaj_orarit_javor(): void
    {
        $branch = Branch::first();
        $targetDate = Carbon::parse('2026-11-28 12:00:00', 'Europe/Belgrade'); // Dita e Flamurit

        // Orari javor do të ishte hapur
        OpeningHour::where('branch_id', $branch->id)->where('day_of_week', $targetDate->dayOfWeek)->delete();
        OpeningHour::create([
            'branch_id' => $branch->id,
            'day_of_week' => $targetDate->dayOfWeek,
            'open_time' => '08:00:00',
            'close_time' => '22:00:00',
            'is_closed' => false,
        ]);

        // Vendosim orar special për festë: Mbyllur plotësisht
        SpecialOpeningHour::create([
            'branch_id' => $branch->id,
            'date' => '2026-11-28',
            'is_closed' => true,
            'reason_or_occasion' => 'Dita e Flamurit',
        ]);

        $availHoliday = $this->service->getBranchAvailability($branch, $targetDate);

        $this->assertFalse($availHoliday['is_open']);
        $this->assertTrue($availHoliday['is_special_day']);
        $this->assertEquals('Dita e Flamurit', $availHoliday['special_day_reason']);
        $this->assertStringContainsString('Dita e Flamurit', $availHoliday['rejection_reason']);
    }

    public function test_pauzimi_i_perkoheshem_nga_menaxheri_dhe_rihapja(): void
    {
        $manager = User::where('role', 'branch_manager')->first();
        $branch = Branch::first();

        $token = $manager->createToken('test')->plainTextToken;

        // 1. Menaxheri pauzon degën për 45 minuta
        $pauseRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/operations/branches/{$branch->id}/temporary-closure", [
                'action' => 'pause',
                'reason' => 'Kuzhina ka fluks të lartë porosish',
                'duration_minutes' => 45,
            ]);

        $pauseRes->assertStatus(200);
        $this->assertDatabaseHas('branches', [
            'id' => $branch->id,
            'is_temporarily_closed' => true,
            'pause_reason' => 'Kuzhina ka fluks të lartë porosish',
        ]);

        $avail = $this->service->getBranchAvailability($branch->fresh());
        $this->assertFalse($avail['can_accept_orders']);
        $this->assertEquals('temporarily_closed', $avail['status']);
        $this->assertEquals('Përkohësisht i Mbyllur', $avail['status_label']);

        // 2. Menaxheri e rihap degën
        $reopenRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/v1/operations/branches/{$branch->id}/temporary-closure", [
                'action' => 'reopen',
            ]);

        $reopenRes->assertStatus(200);
        $this->assertDatabaseHas('branches', [
            'id' => $branch->id,
            'is_temporarily_closed' => false,
        ]);
    }

    public function test_pauzimi_i_perkoheshem_rihapet_automatikisht_kur_kalon_afati(): void
    {
        $branch = Branch::first();
        $branch->update([
            'is_temporarily_closed' => true,
            'paused_until' => now()->subMinutes(10), // Afati ka kaluar 10 minuta më parë
            'pause_reason' => 'Pauzë e shkurtër',
        ]);

        // Kur thirret llogaritja e disponueshmërisë, dega sinkronizohet dhe rihapet automatikisht
        $this->service->getBranchAvailability($branch);

        $branch->refresh();
        $this->assertFalse($branch->is_temporarily_closed);
        $this->assertNull($branch->paused_until);
    }

    public function test_llogaritja_dhe_ruajtja_e_kohes_se_pergatitjes_snapshot(): void
    {
        $customer = User::where('role', 'customer')->first();
        $branch = Branch::first();
        $product = Product::where('is_available', true)->first();

        // Konfigurojmë kohën e produktit dhe të degës
        $branch->update(['default_prep_time_minutes' => 30]);
        $product->update(['estimated_prep_minutes' => 35]);

        $token = $customer->createToken('test')->plainTextToken;

        $res = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/orders', [
                'branch_id' => $branch->id,
                'order_type' => 'delivery',
                'customer_name' => 'Klient Test',
                'customer_email' => 'test.prep@tastio.com',
                'customer_phone' => '+38349000111',
                'payment_method' => 'cash_on_delivery',
                'delivery_address' => [
                    'city' => 'Prishtinë',
                    'street' => 'Rruga Test',
                ],
                'items' => [
                    [
                        'product_id' => $product->id,
                        'quantity' => 1,
                        'selected_choices' => [],
                    ]
                ]
            ]);

        $res->assertStatus(201);
        $orderNumber = $res->json('order.order_number');

        $order = Order::where('order_number', $orderNumber)->first();
        $this->assertNotNull($order);
        // Snapshot duhet të jetë të paktën 35 minuta (nga produkti)
        $this->assertEquals(35, $order->estimated_prep_time_minutes);

        // Nëse dega e ndryshon më vonë kohën e përgatitjes, porosia e vjetër mbetet e pandryshuar!
        $branch->update(['default_prep_time_minutes' => 15]);
        $this->assertEquals(35, $order->fresh()->estimated_prep_time_minutes);
    }

    public function test_menaxhimi_i_disponueshmerise_dhe_stokut_te_produktit(): void
    {
        $manager = User::where('role', 'branch_manager')->first();
        $product = Product::first();

        $token = $manager->createToken('test')->plainTextToken;

        // 1. Çaktivizimi i produktit
        $res = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson("/api/v1/operations/products/{$product->id}/availability", [
                'is_available' => false,
                'temporary_unavailable_reason' => 'Mungesë përbërësish të freskët',
            ]);

        $res->assertStatus(200);
        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'is_available' => false,
            'temporary_unavailable_reason' => 'Mungesë përbërësish të freskët',
        ]);

        // 2. Aktivizimi i menaxhimit të stokut
        $resStock = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson("/api/v1/operations/products/{$product->id}/availability", [
                'is_available' => true,
                'track_stock' => true,
                'stock_quantity' => 5,
                'is_out_of_stock' => false,
            ]);

        $resStock->assertStatus(200);
        $product->refresh();
        $this->assertTrue($product->track_stock);
        $this->assertEquals(5, $product->stock_quantity);

        // 3. Kur sasia bëhet 0, produkti automatikisht shënjohet out of stock
        $resZero = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->patchJson("/api/v1/operations/products/{$product->id}/availability", [
                'stock_quantity' => 0,
            ]);

        $resZero->assertStatus(200);
        $this->assertTrue($product->fresh()->is_out_of_stock);
    }

    public function test_checkout_refuzohet_kur_restoranti_eshte_i_mbyllur(): void
    {
        $customer = User::where('role', 'customer')->first();
        $branch = Branch::first();
        $product = Product::where('is_available', true)->first();

        // Mbyllim degën përkohësisht
        $branch->update([
            'is_temporarily_closed' => true,
            'pause_reason' => 'Restoranti është i mbyllur për mirëmbajtje',
        ]);

        $token = $customer->createToken('test')->plainTextToken;

        $res = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/orders', [
                'branch_id' => $branch->id,
                'order_type' => 'delivery',
                'customer_name' => 'Klient Test',
                'customer_email' => 'closed.test@tastio.com',
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
                        'selected_choices' => [],
                    ]
                ]
            ]);

        $res->assertStatus(422)
            ->assertJsonValidationErrors('branch_id');
    }

    public function test_checkout_refuzohet_kur_produkti_eshte_pa_stok_ose_i_padisponueshem(): void
    {
        $customer = User::where('role', 'customer')->first();
        $branch = Branch::first();
        $product = Product::first();

        // Sigurojmë që dega është hapur
        $branch->update(['is_temporarily_closed' => false, 'is_active' => true]);

        // Vendosim produktin me stok 2 copë
        $product->update([
            'is_available' => true,
            'track_stock' => true,
            'stock_quantity' => 2,
            'is_out_of_stock' => false,
        ]);

        $token = $customer->createToken('test')->plainTextToken;

        // Porositim 5 copë (më shumë se stoku 2)
        $res = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/orders', [
                'branch_id' => $branch->id,
                'order_type' => 'delivery',
                'customer_name' => 'Klient Test',
                'customer_email' => 'stock.test@tastio.com',
                'customer_phone' => '+38349111222',
                'payment_method' => 'cash_on_delivery',
                'delivery_address' => [
                    'city' => 'Prishtinë',
                    'street' => 'Rruga Test',
                ],
                'items' => [
                    [
                        'product_id' => $product->id,
                        'quantity' => 5,
                        'selected_choices' => [],
                    ]
                ]
            ]);

        $res->assertStatus(422)
            ->assertJsonValidationErrors('items');
    }

    public function test_autorizimi_rbac_per_menaxhimin_e_operacioneve(): void
    {
        $customer = User::where('role', 'customer')->first();
        $superAdmin = User::where('role', 'super_admin')->first();
        $branch = Branch::first();

        // 1. Klienti nuk ka autorizim të ndryshojë orarin -> 403
        $resCust = $this->actingAs($customer, 'sanctum')
            ->postJson("/api/v1/operations/branches/{$branch->id}/temporary-closure", [
                'action' => 'pause',
            ]);
        $resCust->assertStatus(403);

        // 2. Super Admin ka të drejta të plota -> 200
        $resAdmin = $this->actingAs($superAdmin, 'sanctum')
            ->postJson("/api/v1/operations/branches/{$branch->id}/temporary-closure", [
                'action' => 'reopen',
            ]);
        $resAdmin->assertStatus(200);
    }
}
