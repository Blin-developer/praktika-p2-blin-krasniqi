<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('products')->onDelete('restrict');
            $table->foreignId('station_id')->nullable()->constrained('stations')->onDelete('set null');
            $table->string('product_name_snapshot');
            $table->decimal('unit_price_snapshot', 10, 2);
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('line_total', 10, 2);
            $table->enum('item_status', ['pending', 'preparing', 'ready'])->default('pending');
            $table->timestamps();

            $table->index('order_id');
            $table->index('product_id');
            $table->index('station_id');
            $table->index('item_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};

