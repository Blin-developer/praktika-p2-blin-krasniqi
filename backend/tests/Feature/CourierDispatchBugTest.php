<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Courier;
use App\Models\Delivery;
use App\Models\DeliveryZone;
use App\Models\Product;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Phase 6.1 — Bug-fix regression tests.
 *
 * BUG 1: Delivery orders did not trigger automatic courier assignment.
 *         createDeliveryForOrder() was called but autoAssign() was never invoked.
 *
 * BUG 2: GPS "Aktivizo GPS" button set gpsStatus='watching' before the browser
 *         actually granted permission. No secure-context check was performed.
 *         (Backend test: location endpoint reachable and authenticated correctly.)
 */
class CourierDispatchBugTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $customerUser;
    protected User $courierUser;
    protected Courier $courier;
    protected Branch $branch;
    protected Product $product;
    protected DeliveryZone $zone;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->adminUser    = User::where('role', 'super_admin')->first();
        $this->customerUser = User::where('role', 'customer')->first();
        $this->branch       = Branch::first();
        $this->product      = Product::where('is_available', true)->first();

        $couriers       = Courier::with('user')->where('is_active', true)->get();
        $this->courier  = $couriers->first();
        $this->courierUser = $this->courier->user;

        // Garantojmë që korrieri është Online + Available para secilit test
        $this->courier->update([
            'availability_status' => 'available',
            'is_active'           => true,
        ]);

        $this->zone = DeliveryZone::where('branch_id', $this->branch->id)->first();
    }

    // ─── BUG 1 TESTS ──────────────────────────────────────────────────────────

    /**
     * TEST 1.1 – Pasi klienti vendos një porosi dërgese, sistemi duhet të krijojë
     *            automatikisht një Delivery rekord.
     */
    public function test_placing_delivery_order_creates_delivery_record(): void
    {
        $payload = $this->buildDeliveryOrderPayload();

        $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/orders', $payload)
            ->assertStatus(201)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('deliveries', [
            'branch_id' => $this->branch->id,
            'status'    => 'assigned', // Duhet të jetë auto-caktuar, jo pending_assignment
        ]);
    }

    /**
     * TEST 1.2 – Pas vendosjes së porosisë, korrieri i disponueshëm duhet të marrë
     *            caktimin automatik (auto-assign).
     */
    public function test_placing_delivery_order_auto_assigns_available_courier(): void
    {
        $payload = $this->buildDeliveryOrderPayload();

        $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/orders', $payload)
            ->assertStatus(201);

        $delivery = Delivery::where('branch_id', $this->branch->id)->latest()->first();

        $this->assertNotNull($delivery, 'Delivery record duhet të ekzistojë.');
        $this->assertSame('assigned', $delivery->status,
            "Statusi duhet të jetë 'assigned' pas auto-assign, jo '{$delivery->status}'.");
        $this->assertNotNull($delivery->courier_id,
            'courier_id duhet të jetë jo-null pas auto-assign.');
        $this->assertNotNull($delivery->assigned_at,
            'assigned_at duhet të jetë vendosur pas auto-assign.');
        $this->assertNotNull($delivery->assignment_expires_at,
            'assignment_expires_at duhet të jetë vendosur (timeout-i i pranimit).');
    }

    /**
     * TEST 1.3 – Dërgesa e auto-caktuar duhet të shfaqet te /courier/dashboard
     *            si "pending_requests" (korrieri pret të pranojë ose refuzojë).
     */
    public function test_auto_assigned_delivery_appears_in_courier_dashboard(): void
    {
        $payload = $this->buildDeliveryOrderPayload();

        $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/orders', $payload)
            ->assertStatus(201);

        // Paneli i korrierit duhet të shfaqë kërkesën e re
        $response = $this->actingAs($this->courierUser, 'sanctum')
            ->getJson('/api/v1/courier/dashboard')
            ->assertStatus(200)
            ->assertJsonPath('success', true);

        $pendingRequests = $response->json('data.pending_requests');

        $this->assertNotEmpty($pendingRequests,
            'pending_requests duhet të ketë të paktën 1 kërkesë pas auto-assign.');

        $deliveryIds = collect($pendingRequests)->pluck('courier_id')->unique()->values();
        $this->assertTrue(
            collect($pendingRequests)->contains('status', 'assigned'),
            "Të gjitha kërkesat në 'pending_requests' duhet të kenë status 'assigned'."
        );
    }

    /**
     * TEST 1.4 – Korrieri mund të pranojë kërkesën dhe statusi kalon në 'accepted'.
     */
    public function test_courier_can_accept_assigned_delivery(): void
    {
        $payload = $this->buildDeliveryOrderPayload();

        $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/orders', $payload)
            ->assertStatus(201);

        $delivery = Delivery::where('status', 'assigned')
            ->where('courier_id', $this->courier->id)
            ->latest()
            ->first();

        $this->assertNotNull($delivery, 'Dërgesa e caktuar duhet të ekzistojë.');

        $this->actingAs($this->courierUser, 'sanctum')
            ->postJson("/api/v1/courier/deliveries/{$delivery->id}/accept")
            ->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('deliveries', [
            'id'     => $delivery->id,
            'status' => 'accepted',
        ]);
    }

    /**
     * TEST 1.5 – Porositë jo-dërgesa (pickup / dine_in) NUK duhet të krijojnë Delivery rekord.
     */
    public function test_non_delivery_order_does_not_create_delivery_record(): void
    {
        $countBefore = Delivery::count();

        $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/orders', [
                'branch_id'      => $this->branch->id,
                'order_type'     => 'pickup',
                'payment_method' => 'cash_on_delivery',
                'customer_name'  => 'Test Klient',
                'customer_phone' => '044000000',
                'customer_email' => 'klient@tastio.com',
                'items'          => [
                    ['product_id' => $this->product->id, 'quantity' => 1, 'options' => []],
                ],
            ])
            ->assertStatus(201);

        $this->assertSame($countBefore, Delivery::count(),
            'Porosia pickup NUK duhet të krijojë asnjë Delivery rekord.');
    }

    // ─── BUG 2 BACKEND TESTS ─────────────────────────────────────────────────

    /**
     * TEST 2.1 – Endpoint-i POST /courier/location duhet të pranojë koordinata
     *            reale nga korrieri i autentikuar.
     */
    public function test_courier_location_endpoint_accepts_real_coordinates(): void
    {
        $response = $this->actingAs($this->courierUser, 'sanctum')
            ->postJson('/api/v1/courier/location', [
                'latitude'        => 42.6629,
                'longitude'       => 21.1655,
                'accuracy_meters' => 15.5,
            ]);

        $response->assertStatus(200)
                 ->assertJsonPath('success', true);

        // Verifikojmë se koordinatat u ruajtën te korrieri
        $this->courier->refresh();
        $this->assertEqualsWithDelta(42.6629, (float) $this->courier->current_latitude, 0.001);
        $this->assertEqualsWithDelta(21.1655, (float) $this->courier->current_longitude, 0.001);
    }

    /**
     * TEST 2.2 – Klienti i rregullt nuk mund të aksesojë /courier/location.
     */
    public function test_customer_cannot_post_courier_location(): void
    {
        $this->actingAs($this->customerUser, 'sanctum')
            ->postJson('/api/v1/courier/location', [
                'latitude'  => 42.6629,
                'longitude' => 21.1655,
            ])
            ->assertStatus(403);
    }

    /**
     * TEST 2.3 – Koordinatat me vlera të pasakta (jashtë rangut) duhet të refuzohen.
     */
    public function test_courier_location_validates_coordinate_ranges(): void
    {
        $this->actingAs($this->courierUser, 'sanctum')
            ->postJson('/api/v1/courier/location', [
                'latitude'  => 999.0,   // E pavlefshme
                'longitude' => 21.1655,
            ])
            ->assertStatus(422);

        $this->actingAs($this->courierUser, 'sanctum')
            ->postJson('/api/v1/courier/location', [
                'latitude'  => 42.6629,
                'longitude' => 999.0,   // E pavlefshme
            ])
            ->assertStatus(422);
    }

    /**
     * TEST 2.4 – Korrieri i paautentikuar nuk mund të aksesojë /courier/location.
     */
    public function test_unauthenticated_cannot_post_courier_location(): void
    {
        $this->postJson('/api/v1/courier/location', [
            'latitude'  => 42.6629,
            'longitude' => 21.1655,
        ])->assertStatus(401);
    }

    // ─── HELPER ───────────────────────────────────────────────────────────────

    private function buildDeliveryOrderPayload(): array
    {
        return [
            'branch_id'        => $this->branch->id,
            'order_type'       => 'delivery',
            'payment_method'   => 'cash_on_delivery',
            'customer_name'    => 'Test Klient Delivery',
            'customer_phone'   => '044111222',
            'customer_email'   => 'klient@tastio.com',
            'delivery_address' => json_encode([
                'street'   => 'Rr. UCK',
                'building' => '10',
                'city'     => 'Prishtinë',
                'notes'    => 'Kati 2',
            ]),
            'delivery_zone_id' => $this->zone?->id,
            'items'            => [
                [
                    'product_id' => $this->product->id,
                    'quantity'   => 2,
                    'options'    => [],
                ],
            ],
        ];
    }
}
