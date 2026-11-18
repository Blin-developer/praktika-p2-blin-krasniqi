<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('track_stock')->default(false)->after('is_available');
            $table->integer('stock_quantity')->nullable()->after('track_stock');
            $table->boolean('is_out_of_stock')->default(false)->after('stock_quantity');
            $table->string('temporary_unavailable_reason')->nullable()->after('is_out_of_stock');

            $table->index('is_out_of_stock');
            $table->index('track_stock');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['is_out_of_stock']);
            $table->dropIndex(['track_stock']);
            $table->dropColumn([
                'track_stock',
                'stock_quantity',
                'is_out_of_stock',
                'temporary_unavailable_reason',
            ]);
        });
    }
};
