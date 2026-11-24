<?php

use App\Models\Branch;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Station;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Zgjerimi i tabelës orders për KDS (bumped_at, started_preparing_at, priority)
        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('bumped_at')->nullable()->after('status');
            $table->timestamp('started_preparing_at')->nullable()->after('bumped_at');
            $table->string('priority', 20)->default('normal')->after('started_preparing_at'); // normal, high, urgent

            $table->index('bumped_at');
            $table->index('priority');
        });

        // 2. Zgjerimi i tabelës order_items për KDS (started_at, completed_at)
        Schema::table('order_items', function (Blueprint $table) {
            $table->timestamp('started_at')->nullable()->after('item_status');
            $table->timestamp('completed_at')->nullable()->after('started_at');

            $table->index('started_at');
            $table->index('completed_at');
        });

        // 3. Sigurohemi që secila degë ka 4 stacionet standarde: GRILL, SALAD, DRINKS, PACKING
        $stationTemplates = [
            ['code' => 'GRILL', 'name' => 'Grill & Gatime të Ngrohta'],
            ['code' => 'SALAD', 'name' => 'Sallata & Të Ftohta'],
            ['code' => 'DRINKS', 'name' => 'Pije & Kafe'],
            ['code' => 'PACKING', 'name' => 'Paketim & Ekspedim'],
        ];

        foreach (Branch::all() as $branch) {
            foreach ($stationTemplates as $tmpl) {
                // Kontrollojmë edhe nëse ekziston me kod të vjetër BEVERAGE ose PACKAGING
                $existing = Station::where('branch_id', $branch->id)
                    ->where(function ($q) use ($tmpl) {
                        $q->where('code', $tmpl['code']);
                        if ($tmpl['code'] === 'DRINKS') {
                            $q->orWhere('code', 'BEVERAGE');
                        }
                        if ($tmpl['code'] === 'PACKING') {
                            $q->orWhere('code', 'PACKAGING');
                        }
                    })
                    ->first();

                if (!$existing) {
                    Station::create([
                        'branch_id' => $branch->id,
                        'name' => $tmpl['name'],
                        'code' => $tmpl['code'],
                        'is_active' => true,
                    ]);
                } else {
                    // Standardizojmë kodin tek DRINKS dhe PACKING
                    if (in_array($existing->code, ['BEVERAGE', 'PACKAGING'], true)) {
                        $existing->update(['code' => $tmpl['code']]);
                    }
                }
            }
        }

        // 4. Lidhja e produkteve me stacionet përkatëse sipas kategorisë
        $allProducts = Product::with('menuCategory.restaurant.branches')->get();
        foreach ($allProducts as $product) {
            $categoryName = strtolower($product->menuCategory?->name ?? '');
            $prodName = strtolower($product->name ?? '');
            $branch = $product->menuCategory?->restaurant?->branches?->first() ?? Branch::first();

            if (!$branch) continue;

            $stationCode = 'GRILL';
            if (str_contains($categoryName, 'pije') || str_contains($categoryName, 'kafe') || str_contains($categoryName, 'drink') || str_contains($categoryName, 'lëngje') || str_contains($prodName, 'kola') || str_contains($prodName, 'ujë')) {
                $stationCode = 'DRINKS';
            } elseif (str_contains($categoryName, 'sallat') || str_contains($categoryName, 'salad') || str_contains($categoryName, 'meze') || str_contains($prodName, 'sallat')) {
                $stationCode = 'SALAD';
            } elseif (str_contains($categoryName, 'ëmbëlsir') || str_contains($categoryName, 'desert') || str_contains($categoryName, 'bakery') || str_contains($categoryName, 'pasticeri')) {
                $stationCode = 'PACKING';
            }

            $station = Station::where('branch_id', $branch->id)->where('code', $stationCode)->first();
            if ($station) {
                $product->default_station_id = $station->id;
                $product->save();
            }
        }

        // 5. Përditësojmë artikujt ekzistues të porosive që nuk kishin stacion
        $itemsWithoutStation = OrderItem::with(['order.branch', 'product'])->whereNull('station_id')->get();
        foreach ($itemsWithoutStation as $item) {
            $branchId = $item->order?->branch_id ?? 1;
            $stationId = $item->product?->default_station_id;

            if (!$stationId) {
                $station = Station::where('branch_id', $branchId)->where('code', 'GRILL')->first();
                $stationId = $station?->id;
            }

            if ($stationId) {
                $item->station_id = $stationId;
                $item->save();
            }
        }
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropIndex(['started_at']);
            $table->dropIndex(['completed_at']);
            $table->dropColumn(['started_at', 'completed_at']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['bumped_at']);
            $table->dropIndex(['priority']);
            $table->dropColumn(['bumped_at', 'started_preparing_at', 'priority']);
        });
    }
};
