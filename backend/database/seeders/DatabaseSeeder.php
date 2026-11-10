<?php

namespace Database\Seeders;

use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\BusinessCategory;
use App\Models\MenuCategory;
use App\Models\Notification;
use App\Models\OpeningHour;
use App\Models\OptionChoice;
use App\Models\OptionGroup;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderItemOption;
use App\Models\OrderStatusHistory;
use App\Models\Payment;
use App\Models\PickupSlot;
use App\Models\PickupToken;
use App\Models\Product;
use App\Models\ReadyTimeHistory;
use App\Models\Restaurant;
use App\Models\StaffMembership;
use App\Models\Station;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $defaultPassword = Hash::make('password123');

        // 1. Përdoruesit Kryesorë (5 Rolet e RBAC)
        $superAdmin = User::create([
            'name' => 'Super Administratori',
            'email' => 'admin@tastio.com',
            'password' => $defaultPassword,
            'phone' => '+38344111222',
            'role' => 'super_admin',
            'email_verified_at' => now(),
        ]);

        $ownerTartine = User::create([
            'name' => 'Artan Krasniqi (Pronar Tartine)',
            'email' => 'owner.tartine@tastio.com',
            'password' => $defaultPassword,
            'phone' => '+38349111222',
            'role' => 'owner',
            'email_verified_at' => now(),
        ]);

        $ownerBabalup = User::create([
            'name' => 'Dardan Berisha (Pronar Babalup)',
            'email' => 'owner.babalup@tastio.com',
            'password' => $defaultPassword,
            'phone' => '+38349222333',
            'role' => 'owner',
            'email_verified_at' => now(),
        ]);

        $managerCenter = User::create([
            'name' => 'Vesa Gashi (Menaxhere Dege)',
            'email' => 'manager.center@tastio.com',
            'password' => $defaultPassword,
            'phone' => '+38349333444',
            'role' => 'branch_manager',
            'email_verified_at' => now(),
        ]);

        $kitchenGrill = User::create([
            'name' => 'Lirim Hoxha (Shef Grill)',
            'email' => 'kitchen.grill@tastio.com',
            'password' => $defaultPassword,
            'phone' => '+38349444555',
            'role' => 'kitchen_staff',
            'email_verified_at' => now(),
        ]);

        $kitchenSalad = User::create([
            'name' => 'Zana Morina (Shefe Sallatash)',
            'email' => 'kitchen.salad@tastio.com',
            'password' => $defaultPassword,
            'phone' => '+38349555666',
            'role' => 'kitchen_staff',
            'email_verified_at' => now(),
        ]);

        $cashierCenter = User::create([
            'name' => 'Erion Rama (Arkëtar)',
            'email' => 'cashier.center@tastio.com',
            'password' => $defaultPassword,
            'phone' => '+38349666777',
            'role' => 'cashier',
            'email_verified_at' => now(),
        ]);

        $customer = User::create([
            'name' => 'Blin Krasniqi',
            'email' => 'customer.blin@tastio.com',
            'password' => $defaultPassword,
            'phone' => '+38349777888',
            'role' => 'customer',
            'email_verified_at' => now(),
        ]);

        // 2. Kategoritë e Biznesit (Kuzhinat)
        $categories = [
            ['name' => 'Burger & Ushqim i Shpejtë', 'slug' => 'burger-ushqim-i-shpejte', 'icon_url' => '/icons/burger.svg'],
            ['name' => 'Furrë Artizanale & Sanduiçë', 'slug' => 'furre-artizanale-sanduice', 'icon_url' => '/icons/bakery.svg'],
            ['name' => 'Ushqim Tradicional Shqiptar', 'slug' => 'ushqim-tradicional-shqiptar', 'icon_url' => '/icons/traditional.svg'],
            ['name' => 'Pica & Kuzhinë Italiane', 'slug' => 'pica-kuzhine-italiane', 'icon_url' => '/icons/pizza.svg'],
            ['name' => 'Sallata të Freskëta & Ushqim i Shëndetshëm', 'slug' => 'sallata-ushqim-i-shendetshem', 'icon_url' => '/icons/salad.svg'],
        ];

        $categoryModels = [];
        foreach ($categories as $cat) {
            $categoryModels[$cat['slug']] = BusinessCategory::create($cat);
        }

        // 3. Restorantet
        $tartine = Restaurant::create([
            'name' => 'Tartine Deli & Furrë Artizanale',
            'slug' => 'tartine-deli-furre-artizanale',
            'description' => 'Sanduiçë me bukë të thekruar me brumë të thartë natyral, sallata organike dhe ëmbëlsira artizanale në Prishtinë.',
            'logo_url' => 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop',
            'banner_url' => 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&h=400&fit=crop',
            'status' => 'active',
            'owner_user_id' => $ownerTartine->id,
        ]);
        $tartine->businessCategories()->attach([
            $categoryModels['furre-artizanale-sanduice']->id,
            $categoryModels['sallata-ushqim-i-shendetshem']->id,
        ]);

        $babalup = Restaurant::create([
            'name' => 'Babalup Craft Burger & Grill',
            'slug' => 'babalup-craft-burger-grill',
            'description' => 'Smash burger premium me mish viçi vendor të pjekur në skarë, patate tartufi dhe salca unike të shtëpisë.',
            'logo_url' => 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop',
            'banner_url' => 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&h=400&fit=crop',
            'status' => 'active',
            'owner_user_id' => $ownerBabalup->id,
        ]);
        $babalup->businessCategories()->attach([
            $categoryModels['burger-ushqim-i-shpejte']->id,
        ]);

        // 4. Degët në Prishtinë
        $branchCenter = Branch::create([
            'restaurant_id' => $tartine->id,
            'name' => 'Tartine Qendër (Bulevardi Nënë Tereza)',
            'address' => 'Bulevardi Nënë Tereza, Nr. 42',
            'city' => 'Prishtinë',
            'latitude' => 42.662914,
            'longitude' => 21.165503,
            'phone' => '+38338222333',
            'is_active' => true,
            'default_prep_time_minutes' => 20,
            'slot_interval_minutes' => 15,
            'max_orders_per_slot' => 8,
        ]);

        $branchDardania = Branch::create([
            'restaurant_id' => $babalup->id,
            'name' => 'Babalup Dardani (Bill Clinton)',
            'address' => 'Bulevardi Bill Clinton, Nr. 15',
            'city' => 'Prishtinë',
            'latitude' => 42.656540,
            'longitude' => 21.152430,
            'phone' => '+38338555666',
            'is_active' => true,
            'default_prep_time_minutes' => 25,
            'slot_interval_minutes' => 15,
            'max_orders_per_slot' => 10,
        ]);

        // 5. Stacionet e Kuzhinës
        $stationGrill = Station::create([
            'branch_id' => $branchCenter->id,
            'name' => 'Sanduiçë të Ngrohtë & Grill',
            'code' => 'GRILL',
            'is_active' => true,
        ]);

        $stationSalad = Station::create([
            'branch_id' => $branchCenter->id,
            'name' => 'Sallata të Freskëta & Ushqime të Ftohta',
            'code' => 'SALAD',
            'is_active' => true,
        ]);

        $stationBeverage = Station::create([
            'branch_id' => $branchCenter->id,
            'name' => 'Kafe Speciale & Lëngje Natyrale',
            'code' => 'BEVERAGE',
            'is_active' => true,
        ]);

        $stationPackaging = Station::create([
            'branch_id' => $branchCenter->id,
            'name' => 'Paketimi Përfundimtar & Sporteli',
            'code' => 'PACKAGING',
            'is_active' => true,
        ]);

        // 6. Anëtarësimet e Stafit
        StaffMembership::create([
            'user_id' => $managerCenter->id,
            'branch_id' => $branchCenter->id,
            'role' => 'branch_manager',
            'assigned_station_id' => null,
            'is_active' => true,
        ]);

        StaffMembership::create([
            'user_id' => $kitchenGrill->id,
            'branch_id' => $branchCenter->id,
            'role' => 'kitchen_staff',
            'assigned_station_id' => $stationGrill->id,
            'is_active' => true,
        ]);

        StaffMembership::create([
            'user_id' => $kitchenSalad->id,
            'branch_id' => $branchCenter->id,
            'role' => 'kitchen_staff',
            'assigned_station_id' => $stationSalad->id,
            'is_active' => true,
        ]);

        StaffMembership::create([
            'user_id' => $cashierCenter->id,
            'branch_id' => $branchCenter->id,
            'role' => 'cashier',
            'assigned_station_id' => null,
            'is_active' => true,
        ]);

        // 7. Orare Pune Javore (7 Ditë)
        for ($day = 0; $day <= 6; $day++) {
            OpeningHour::create([
                'branch_id' => $branchCenter->id,
                'day_of_week' => $day,
                'open_time' => '08:00:00',
                'close_time' => '22:30:00',
                'is_closed' => false,
            ]);

            OpeningHour::create([
                'branch_id' => $branchDardania->id,
                'day_of_week' => $day,
                'open_time' => '11:00:00',
                'close_time' => '23:30:00',
                'is_closed' => false,
            ]);
        }

        // 8. Dritaret Kohore për Marrje (Pickup Slots)
        $today = Carbon::today();
        foreach ([$today, $today->copy()->addDay()] as $date) {
            for ($hour = 9; $hour <= 21; $hour++) {
                foreach ([0, 15, 30, 45] as $min) {
                    $start = sprintf('%02d:%02d:00', $hour, $min);
                    $endCarbon = Carbon::createFromTimeString($start)->addMinutes(15);
                    $end = $endCarbon->format('H:i:s');

                    PickupSlot::create([
                        'branch_id' => $branchCenter->id,
                        'slot_date' => $date->toDateString(),
                        'start_time' => $start,
                        'end_time' => $end,
                        'max_capacity' => 8,
                        'current_booked_count' => ($hour === 13 && $min === 0) ? 3 : 0,
                    ]);
                }
            }
        }

        // 9. Kategoritë e Menysë dhe Artikujt për Tartine
        $menuCatSandwiches = MenuCategory::create([
            'restaurant_id' => $tartine->id,
            'name' => 'Sanduiçë Artizanalë me Bukë Sourdough',
            'description' => 'Të përgatitur me bukë të bërë vetë me fermentim të ngadaltë natyral.',
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $menuCatBowls = MenuCategory::create([
            'restaurant_id' => $tartine->id,
            'name' => 'Pjata të Freskëta & Sallata Organike',
            'description' => 'Pjata të pasura ushqyese me perime të freskëta nga tregu vendor i Prishtinës.',
            'sort_order' => 2,
            'is_active' => true,
        ]);

        $menuCatDrinks = MenuCategory::create([
            'restaurant_id' => $tartine->id,
            'name' => 'Pije të Ftohta & Kafe Speciale',
            'description' => 'Lëngje të shtrydhura në çast nga fruta të pastra dhe kafe të cilësisë së lartë.',
            'sort_order' => 3,
            'is_active' => true,
        ]);

        // Artikulli 1: Sanduiç me Proshutë & Tartuf
        $prodProsciutto = Product::create([
            'menu_category_id' => $menuCatSandwiches->id,
            'default_station_id' => $stationGrill->id,
            'name' => 'Sanduiç me Proshutë & Gjalpë Tartufi',
            'slug' => 'sanduic-me-proshute-dhe-gjalpe-tartufi',
            'description' => 'Proshutë e tharë e cilësisë së lartë, djathë i shkrirë Fontina, gjalpë me tartuf të zi dhe rukolë e freskët në bukë sourdough.',
            'base_price' => 6.80,
            'image_url' => 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&h=400&fit=crop',
            'estimated_prep_minutes' => 12,
            'is_available' => true,
            'sort_order' => 1,
        ]);

        // Modifikuesit për Artikullin 1
        $groupBread = OptionGroup::create([
            'product_id' => $prodProsciutto->id,
            'name' => 'Zgjedhja e Bukës Artizanale',
            'min_selection' => 1,
            'max_selection' => 1,
            'is_required' => true,
            'sort_order' => 1,
        ]);

        $optRusticWhite = OptionChoice::create([
            'option_group_id' => $groupBread->id,
            'name' => 'Bukë e Bardhë Fshati Sourdough',
            'additional_price' => 0.00,
            'is_available' => true,
            'sort_order' => 1,
        ]);

        OptionChoice::create([
            'option_group_id' => $groupBread->id,
            'name' => 'Bukë Thekre me 7 Farëra',
            'additional_price' => 0.50,
            'is_available' => true,
            'sort_order' => 2,
        ]);

        OptionChoice::create([
            'option_group_id' => $groupBread->id,
            'name' => 'Kulipeshk Artizanal Pa Gluten',
            'additional_price' => 1.20,
            'is_available' => true,
            'sort_order' => 3,
        ]);

        $groupExtras = OptionGroup::create([
            'product_id' => $prodProsciutto->id,
            'name' => 'Shtesa Speciale',
            'min_selection' => 0,
            'max_selection' => 3,
            'is_required' => false,
            'sort_order' => 2,
        ]);

        $optExtraCheese = OptionChoice::create([
            'option_group_id' => $groupExtras->id,
            'name' => 'Dopjo Djathë i Shkrirë Fontina',
            'additional_price' => 1.20,
            'is_available' => true,
            'sort_order' => 1,
        ]);

        $optTruffleMayo = OptionChoice::create([
            'option_group_id' => $groupExtras->id,
            'name' => 'Salcë Aioli me Tartuf të Zi',
            'additional_price' => 0.80,
            'is_available' => true,
            'sort_order' => 2,
        ]);

        // Artikulli 2: Sallatë Burrata
        $prodBurrata = Product::create([
            'menu_category_id' => $menuCatBowls->id,
            'default_station_id' => $stationSalad->id,
            'name' => 'Pjatë me Djathë Burrata & Pesto Fëstëku',
            'slug' => 'pjate-me-djathe-burrata-pesto-festeku',
            'description' => 'Djathë i butë kremor Burrata, domate të vogla qershi, kinoa krokante, gjethe të freskëta dhe pesto artizanale me fëstëk.',
            'base_price' => 7.50,
            'image_url' => 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&h=400&fit=crop',
            'estimated_prep_minutes' => 10,
            'is_available' => true,
            'sort_order' => 2,
        ]);

        // Artikulli 3: Kafe e Ftohtë
        $prodColdBrew = Product::create([
            'menu_category_id' => $menuCatDrinks->id,
            'default_station_id' => $stationBeverage->id,
            'name' => 'Kafe e Ftohtë Tonike me Aromë Agrumesh',
            'slug' => 'kafe-e-ftohte-tonike-me-arome-agrumesh',
            'description' => 'Kafe etiopiane e infuzuar ngadalë për 18 orë, e shërbyer me ujë tonik mesdhetar dhe portokall të kuq.',
            'base_price' => 3.20,
            'image_url' => 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&h=400&fit=crop',
            'estimated_prep_minutes' => 5,
            'is_available' => true,
            'sort_order' => 3,
        ]);

        // 10. Porosi Testuese me Kod QR dhe Rrjedhë të Gjendjes
        $order1 = Order::create([
            'order_number' => 'GE-' . strtoupper(Str::random(8)),
            'customer_id' => $customer->id,
            'branch_id' => $branchCenter->id,
            'status' => 'ready_for_pickup',
            'scheduled_pickup_at' => Carbon::now()->addMinutes(15),
            'customer_note' => 'Ju lutem paketoni me kujdes për marrje dhe shtoni peceta shtesë.',
            'subtotal' => 8.80,
            'tax_amount' => 0.00,
            'total_price' => 8.80,
            'payment_status' => 'pending',
        ]);

        $orderItem1 = OrderItem::create([
            'order_id' => $order1->id,
            'product_id' => $prodProsciutto->id,
            'station_id' => $stationGrill->id,
            'product_name_snapshot' => $prodProsciutto->name,
            'unit_price_snapshot' => 6.80,
            'quantity' => 1,
            'line_total' => 8.80,
            'item_status' => 'ready',
        ]);

        OrderItemOption::create([
            'order_item_id' => $orderItem1->id,
            'option_choice_id' => $optRusticWhite->id,
            'option_group_name_snapshot' => 'Zgjedhja e Bukës Artizanale',
            'option_choice_name_snapshot' => $optRusticWhite->name,
            'additional_price_snapshot' => 0.00,
        ]);

        OrderItemOption::create([
            'order_item_id' => $orderItem1->id,
            'option_choice_id' => $optExtraCheese->id,
            'option_group_name_snapshot' => 'Shtesa Speciale',
            'option_choice_name_snapshot' => $optExtraCheese->name,
            'additional_price_snapshot' => 1.20,
        ]);

        OrderItemOption::create([
            'order_item_id' => $orderItem1->id,
            'option_choice_id' => $optTruffleMayo->id,
            'option_group_name_snapshot' => 'Shtesa Speciale',
            'option_choice_name_snapshot' => $optTruffleMayo->name,
            'additional_price_snapshot' => 0.80,
        ]);

        // Historiku i Gjendjes së Porosisë
        OrderStatusHistory::create([
            'order_id' => $order1->id,
            'from_status' => null,
            'to_status' => 'pending',
            'changed_by_user_id' => $customer->id,
            'reason_or_notes' => 'Klienti e vendosi porosinë online përmes platformës.',
            'created_at' => Carbon::now()->subMinutes(25),
        ]);

        OrderStatusHistory::create([
            'order_id' => $order1->id,
            'from_status' => 'pending',
            'to_status' => 'confirmed',
            'changed_by_user_id' => $managerCenter->id,
            'reason_or_notes' => 'Porosia u konfirmua pas verifikimit automatik të kapacitetit të kuzhinës.',
            'created_at' => Carbon::now()->subMinutes(23),
        ]);

        OrderStatusHistory::create([
            'order_id' => $order1->id,
            'from_status' => 'confirmed',
            'to_status' => 'in_preparation',
            'changed_by_user_id' => $kitchenGrill->id,
            'reason_or_notes' => 'Shefi filloi përgatitjen e biletës në stacionin e skarës.',
            'created_at' => Carbon::now()->subMinutes(18),
        ]);

        OrderStatusHistory::create([
            'order_id' => $order1->id,
            'from_status' => 'in_preparation',
            'to_status' => 'ready_for_pickup',
            'changed_by_user_id' => $kitchenGrill->id,
            'reason_or_notes' => 'Porosia u paketua dhe u vendos në kabinetin e ngrohtë #3 për marrje.',
            'created_at' => Carbon::now()->subMinutes(3),
        ]);

        // Historiku i Kohës së Përgatitjes
        ReadyTimeHistory::create([
            'order_id' => $order1->id,
            'original_estimated_minutes' => 20,
            'revised_estimated_minutes' => 20,
            'estimated_ready_at' => Carbon::now()->subMinutes(5),
            'actual_ready_at' => Carbon::now()->subMinutes(3),
            'updated_by_user_id' => $kitchenGrill->id,
        ]);

        // Çelësi Kriptografik me Kod QR (Pickup Token)
        $tokenRaw = Str::random(32);
        PickupToken::create([
            'order_id' => $order1->id,
            'token_hash' => hash('sha256', $tokenRaw),
            'short_code' => strtoupper(substr($tokenRaw, 0, 6)),
            'qr_payload' => json_encode([
                'order_id' => $order1->id,
                'order_number' => $order1->order_number,
                'customer' => $customer->name,
                'token' => $tokenRaw,
                'issued_at' => now()->toIso8601String(),
            ]),
            'expires_at' => Carbon::now()->addHours(2),
            'is_redeemed' => false,
        ]);

        // Njoftimi për Klientin
        Notification::create([
            'user_id' => $customer->id,
            'title' => 'Porosia Juaj është Gati për Marrje!',
            'message' => 'Porosia ' . $order1->order_number . ' është gati në Tartine Qendër. Paraqisni kodin tuaj QR në sportel.',
            'type' => 'order_ready',
            'payload' => ['order_id' => $order1->id, 'order_number' => $order1->order_number],
            'is_read' => false,
        ]);

        // Regjistri i Auditimit
        AuditLog::create([
            'user_id' => $customer->id,
            'action' => 'order.created',
            'entity_type' => 'App\Models\Order',
            'entity_id' => $order1->id,
            'old_values' => null,
            'new_values' => ['order_number' => $order1->order_number, 'total_price' => 8.80],
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
        ]);
    }
}
