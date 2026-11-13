<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\BusinessCategory;
use App\Models\MenuCategory;
use App\Models\Product;
use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CatalogMenuSeeder extends Seeder
{
    public function run(): void
    {
        $owner = User::where('role', 'owner')->first() ?? User::first();
        $ownerId = $owner ? $owner->id : 1;

        // Lista e restoranteve të katalogut
        $restaurantsData = [
            'proper-pizza-prishtine' => [
                'name' => 'Proper Pizza Prishtinë',
                'description' => 'Pica tradicionale napolitane me brumë të thartë natyral të fermentuar 48 orë dhe përbërës të importuar nga Italia.',
                'logo_url' => 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&auto=format&fit=crop&q=80',
                'banner_url' => 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=800&auto=format&fit=crop&q=80',
                'branch_name' => 'Proper Pizza Qendër (Bulevardi)',
                'branch_address' => 'Bulevardi Nënë Tereza, Nr. 18',
            ],
            'tartine-artisan-deli' => [
                'name' => 'Tartine Artisan Deli & Pasta',
                'description' => 'Pasta italiane me vezë të punuara në çast, salca tartufi, sanduiçë me bukë fshati dhe pije organike.',
                'logo_url' => 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=200&auto=format&fit=crop&q=80',
                'banner_url' => 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&auto=format&fit=crop&q=80',
                'branch_name' => 'Tartine Qendër (Bulevardi Nënë Tereza)',
                'branch_address' => 'Bulevardi Nënë Tereza, Nr. 42',
            ],
            'smash-burger-bar' => [
                'name' => 'Smash Burger Bar',
                'description' => 'Burgera artizanalë me mish viçi Black Angus të pjekur në skarë të nxehtë, patate të freskëta dhe salca shtëpie.',
                'logo_url' => 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&auto=format&fit=crop&q=80',
                'banner_url' => 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop&q=80',
                'branch_name' => 'Smash Burger Qendër',
                'branch_address' => 'Rruga Fehmi Agani, Nr. 12',
            ],
            'sushico-tirana' => [
                'name' => 'Sushi Co Prishtinë',
                'description' => 'Rolls të freskëta sushi me salmon norvegjez, karkaleca tempura dhe specialitete autentike japoneze.',
                'logo_url' => 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=200&auto=format&fit=crop&q=80',
                'banner_url' => 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=800&auto=format&fit=crop&q=80',
                'branch_name' => 'Sushi Co Prishtinë',
                'branch_address' => 'Rruga Rexhep Luci, Nr. 5',
            ],
            'taverna-tirona-grill' => [
                'name' => 'Taverna Tradicionale & Grill',
                'description' => 'Mish viçi vendor i pjekur në prush druri, samun të ngrohtë, tava dheu dhe pjata tradicionale shqiptare.',
                'logo_url' => 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200&auto=format&fit=crop&q=80',
                'banner_url' => 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
                'branch_name' => 'Taverna Tradicionale Dega 1',
                'branch_address' => 'Rruga Garibaldi, Nr. 22',
            ],
            'pasticeri-reka' => [
                'name' => 'Pasticeri Reka & Desserts',
                'description' => 'Cheesecake San Sebastian, tiramisu me mascarpone italiane dhe ëmbëlsira artizanale të përgatitura çdo ditë.',
                'logo_url' => 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=200&auto=format&fit=crop&q=80',
                'banner_url' => 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80',
                'branch_name' => 'Pasticeri Reka Qendër',
                'branch_address' => 'Bulevardi Bill Clinton, Nr. 30',
            ],
        ];

        $restaurantMap = [];
        $branchMap = [];

        foreach ($restaurantsData as $slug => $data) {
            $restaurant = Restaurant::firstOrCreate(
                ['slug' => $slug],
                [
                    'name' => $data['name'],
                    'description' => $data['description'],
                    'logo_url' => $data['logo_url'],
                    'banner_url' => $data['banner_url'],
                    'status' => 'active',
                    'owner_user_id' => $ownerId,
                ]
            );
            $restaurantMap[$slug] = $restaurant;

            $branch = Branch::firstOrCreate(
                ['restaurant_id' => $restaurant->id],
                [
                    'name' => $data['branch_name'],
                    'address' => $data['branch_address'],
                    'city' => 'Prishtinë',
                    'latitude' => 42.662914,
                    'longitude' => 21.165503,
                    'phone' => '+38344111999',
                    'is_active' => true,
                    'default_prep_time_minutes' => 20,
                    'slot_interval_minutes' => 15,
                    'max_orders_per_slot' => 10,
                ]
            );
            $branchMap[$slug] = $branch;
        }

        // Sigurohuni që Tartine ekzistuese të ketë qasje
        $tartineOriginal = Restaurant::where('slug', 'tartine-deli-furre-artizanale')->first();
        if ($tartineOriginal) {
            $tartineBranch = Branch::where('restaurant_id', $tartineOriginal->id)->first();
            if ($tartineBranch) {
                $restaurantMap['tartine-deli-furre-artizanale'] = $tartineOriginal;
                $branchMap['tartine-deli-furre-artizanale'] = $tartineBranch;
            }
        }

        // Të gjitha produktet nga katalogu
        $catalogProducts = [
            // Pica
            [
                'code' => 'p1',
                'name' => 'Pica Margherita Napolitane',
                'restaurant_slug' => 'proper-pizza-prishtine',
                'category_name' => 'Pica Napolitane',
                'description' => 'Salcë domatesh San Marzano, mozzarella fior di latte, borzilok i freskët dhe vaj ulliri ekstra i virgjër.',
                'price' => 5.50,
                'image_url' => 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&auto=format&fit=crop&q=80',
            ],
            [
                'code' => 'p2',
                'name' => 'Pica Pepperoni Diavola',
                'restaurant_slug' => 'proper-pizza-prishtine',
                'category_name' => 'Pica Napolitane',
                'description' => 'Mozzarella e shkrirë, sallam pikant italian pepperoni, salcë domatesh të freskëta dhe rigon organik.',
                'price' => 6.80,
                'image_url' => 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&auto=format&fit=crop&q=80',
            ],
            [
                'code' => 'p3',
                'name' => 'Pica Capricciosa Rustica',
                'restaurant_slug' => 'proper-pizza-prishtine',
                'category_name' => 'Pica Napolitane',
                'description' => 'Proshutë pule artizanale, kërpudha të freskëta champignon, ullinj kalamata dhe djathë mozzarella.',
                'price' => 6.50,
                'image_url' => 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
            ],
            [
                'code' => 'p4',
                'name' => 'Pica Quattro Formaggi',
                'restaurant_slug' => 'tartine-artisan-deli',
                'category_name' => 'Pica Artizanale',
                'description' => 'Kombinim i pasur me mozzarella, gorgonzola kremoze, parmigiano reggiano dhe djathë fontina të shkrirë.',
                'price' => 7.20,
                'image_url' => 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=600&auto=format&fit=crop&q=80',
            ],
            [
                'code' => 'p5',
                'name' => 'Pica me Proshutë Krudo & Tartuf',
                'restaurant_slug' => 'tartine-artisan-deli',
                'category_name' => 'Pica Artizanale',
                'description' => 'Krem tartufi të zi, proshutë e tharë krudo, gjethe rukole të egër dhe thela parmixhani.',
                'price' => 8.50,
                'image_url' => 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80',
            ],
            [
                'code' => 'p6',
                'name' => 'Pica Burrata & Pesto Borziloku',
                'restaurant_slug' => 'tartine-artisan-deli',
                'category_name' => 'Pica Artizanale',
                'description' => 'Brumë i fermentuar 48 orë, pesto xhenoveze, domate qershizë të konfikuara dhe djathë i plotë Burrata në qendër.',
                'price' => 8.90,
                'image_url' => 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&auto=format&fit=crop&q=80',
            ],
            // Burgera
            [
                'code' => 'b1',
                'name' => 'Smash Burger Classic',
                'restaurant_slug' => 'smash-burger-bar',
                'category_name' => 'Smash Burger',
                'description' => 'Dy qofte viçi të freskët të shtypura krokante, dyfish cheddar amerikan, salcë sekrete dhe kastravecë turshi në brioche.',
                'price' => 5.80,
                'image_url' => 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
            ],
            [
                'code' => 'b2',
                'name' => 'Truffle & Mushroom Burger',
                'restaurant_slug' => 'smash-burger-bar',
                'category_name' => 'Smash Burger',
                'description' => 'Mish viçi Black Angus, kërpudha pylli të karamelizuara me hudhër, majonezë me tartuf dhe djathë zviceran.',
                'price' => 7.50,
                'image_url' => 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80',
            ],
            [
                'code' => 'b3',
                'name' => 'Bacon Double Cheese Burger',
                'restaurant_slug' => 'smash-burger-bar',
                'category_name' => 'Smash Burger',
                'description' => 'Dy qofte 120g mish viçi, proshutë viçi e thekur krokante, djathë cheddar i dyfishtë dhe salcë BBQ e tymosur.',
                'price' => 6.90,
                'image_url' => 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80',
            ],
            [
                'code' => 'b4',
                'name' => 'Crispy Buttermilk Chicken Burger',
                'restaurant_slug' => 'smash-burger-bar',
                'category_name' => 'Smash Burger',
                'description' => 'Kofshë pule e butë e marinuar në dhallë me panim super krokant, sallatë lakre coleslaw dhe salcë pikante me mjaltë.',
                'price' => 5.50,
                'image_url' => 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=600&auto=format&fit=crop&q=80',
            ],
            // Sushi
            [
                'code' => 's1',
                'name' => 'Salmon Philadelphia Roll (8 copë)',
                'restaurant_slug' => 'sushico-tirana',
                'category_name' => 'Sushi Rolls',
                'description' => 'Salmon i freskët norvegjez sashimi, krem djathi philadelphia, avokado hass dhe susam i thekur.',
                'price' => 7.90,
                'image_url' => 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop&q=80',
            ],
            [
                'code' => 's2',
                'name' => 'Dragon Roll me Karkalec Tempura',
                'restaurant_slug' => 'sushico-tirana',
                'category_name' => 'Sushi Rolls',
                'description' => 'Karkaleca të skuqur në tempura brenda, avokado e prerë hollë sipër, vezë peshku masago dhe salcë unagi.',
                'price' => 9.80,
                'image_url' => 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=600&auto=format&fit=crop&q=80',
            ],
            [
                'code' => 's3',
                'name' => 'Spicy Tuna Roll (8 copë)',
                'restaurant_slug' => 'sushico-tirana',
                'category_name' => 'Sushi Rolls',
                'description' => 'Ton i kuq i prerë imët me majonezë pikante japoneze, kastravec krokant dhe thekon tempura.',
                'price' => 8.50,
                'image_url' => 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80',
            ],
            // Pasta
            [
                'code' => 'pa1',
                'name' => 'Tagliatelle al Tartufo di Norcia',
                'restaurant_slug' => 'tartine-artisan-deli',
                'category_name' => 'Pasta Italiane',
                'description' => 'Pasta e freskët me vezë e përgatitur me dorë, gjalpë tartufi të zi, krem parmigiano reggiano 24-mujor.',
                'price' => 7.80,
                'image_url' => 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80',
            ],
            [
                'code' => 'pa2',
                'name' => 'Spaghetti alla Carbonara Autentike',
                'restaurant_slug' => 'tartine-artisan-deli',
                'category_name' => 'Pasta Italiane',
                'description' => 'Guanciale krokante e thekur, të verdha veze të freskëta, djathë pecorino romano dhe piper i zi i bluar në çast.',
                'price' => 6.90,
                'image_url' => 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&auto=format&fit=crop&q=80',
            ],
            [
                'code' => 'pa3',
                'name' => 'Lasagna Tradicionale Bolognese',
                'restaurant_slug' => 'tartine-artisan-deli',
                'category_name' => 'Pasta Italiane',
                'description' => 'Shtresa të buta paste të freskët, ragù viçi me zierje të ngadaltë 6 orë, beshamel i kadifenjtë dhe parmigiano.',
                'price' => 7.20,
                'image_url' => 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=600&auto=format&fit=crop&q=80',
            ],
            // Zgarë
            [
                'code' => 'g1',
                'name' => 'Qebapa Tradicionalë me Samun (10 copë)',
                'restaurant_slug' => 'taverna-tirona-grill',
                'category_name' => 'Specialitete Skare',
                'description' => 'Mish viçi vendor i pastër i pjekur me prush pishe, qepë e freskët, kajmak fshati dhe samun i ngrohtë me fara.',
                'price' => 5.00,
                'image_url' => 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80',
            ],
            [
                'code' => 'g2',
                'name' => 'Mix Skare Tastio (Për 2 Persona)',
                'restaurant_slug' => 'taverna-tirona-grill',
                'category_name' => 'Specialitete Skare',
                'description' => 'Qebapa, pleskavicë e mbushur me djathë, suxhuk shtëpie, fileto pule në zgarë dhe patate të pjekura me erëza.',
                'price' => 13.50,
                'image_url' => 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
            ],
            [
                'code' => 'g3',
                'name' => 'Pleskavicë Sharri me Kaçkavall',
                'restaurant_slug' => 'taverna-tirona-grill',
                'category_name' => 'Specialitete Skare',
                'description' => 'Mish viçi cilësor i mbushur bujarisht me djathë kaçkavall të shkrirë, i shërbyer me ajvar dhe patate shtëpie.',
                'price' => 6.50,
                'image_url' => 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=600&auto=format&fit=crop&q=80',
            ],
            // Fast Food
            [
                'code' => 'ff1',
                'name' => 'Crispy Chicken Tenders & Fries (6 copë)',
                'restaurant_slug' => 'smash-burger-bar',
                'category_name' => 'Fast Food Krokant',
                'description' => 'Fileto të freskëta pule me panim ekstra krokant, patate të skuqura dhe dy salca zgjedhjeje.',
                'price' => 5.20,
                'image_url' => 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=600&auto=format&fit=crop&q=80',
            ],
            [
                'code' => 'ff2',
                'name' => 'Loaded Cheese & Bacon Fries',
                'restaurant_slug' => 'smash-burger-bar',
                'category_name' => 'Fast Food Krokant',
                'description' => 'Patate krokante të mbuluara me krem djathi cheddar të nxehtë, proshutë krokante dhe qepë të njoma.',
                'price' => 3.80,
                'image_url' => 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80',
            ],
            // Ëmbëlsira
            [
                'code' => 'e1',
                'name' => 'San Sebastian Cheesecake me Çokollatë Belge',
                'restaurant_slug' => 'pasticeri-reka',
                'category_name' => 'Ëmbëlsira Artizanale',
                'description' => 'Cheesecake bask me kore të karamelizuar dhe zemër kremoze, i spërkatur me çokollatë të ngrohtë qumështi.',
                'price' => 4.50,
                'image_url' => 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80',
            ],
            [
                'code' => 'e2',
                'name' => 'Tiramisu Tradicionale me Mascarpone',
                'restaurant_slug' => 'pasticeri-reka',
                'category_name' => 'Ëmbëlsira Artizanale',
                'description' => 'Biskota savoiardi italiane të zhytura në espresso të fortë, krem i lehtë mascarpone dhe kakao e zezë cilësore.',
                'price' => 4.20,
                'image_url' => 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
            ],
            // Pije
            [
                'code' => 'd1',
                'name' => 'Iced Caramel Macchiato Artizanal',
                'restaurant_slug' => 'tartine-artisan-deli',
                'category_name' => 'Kafe & Pije',
                'description' => 'Espresso e freskët e ftohur, qumësht i plotë kremoz, akull dhe shurup karameli i përgatitur vetë.',
                'price' => 2.80,
                'image_url' => 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
            ],
            [
                'code' => 'd2',
                'name' => 'Lëng Portokalli & Karote i Sapo Shtrydhur',
                'restaurant_slug' => 'tartine-artisan-deli',
                'category_name' => 'Kafe & Pije',
                'description' => '100% fruta natyrale të shtrydhura në çast pa sheqer të shtuar dhe pa konservues.',
                'price' => 2.50,
                'image_url' => 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
            ],
        ];

        foreach ($catalogProducts as $p) {
            $restaurant = $restaurantMap[$p['restaurant_slug']] ?? Restaurant::first();
            if (!$restaurant) continue;

            $category = MenuCategory::firstOrCreate(
                [
                    'restaurant_id' => $restaurant->id,
                    'name' => $p['category_name'],
                ],
                [
                    'description' => $p['category_name'],
                    'sort_order' => 1,
                    'is_active' => true,
                ]
            );

            // Kërko nëse ekziston sipas emrit ose kodit
            $product = Product::where('name', $p['name'])
                ->orWhere('slug', $p['code'])
                ->first();

            if (!$product) {
                Product::create([
                    'menu_category_id' => $category->id,
                    'name' => $p['name'],
                    'slug' => $p['code'], // vendosim kodin p1, p2 ose slug për kërkim të menjëhershëm
                    'description' => $p['description'],
                    'base_price' => $p['price'],
                    'image_url' => $p['image_url'],
                    'estimated_prep_minutes' => 20,
                    'is_available' => true,
                    'sort_order' => 1,
                ]);
            } else {
                // Sigurohuni që çmimi dhe kodi janë të përditësuara
                $product->update([
                    'slug' => $p['code'],
                    'base_price' => $p['price'],
                    'is_available' => true,
                ]);
            }
        }
    }
}
