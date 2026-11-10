<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('menu_category_id')->constrained('menu_categories')->onDelete('cascade');
            $table->foreignId('default_station_id')->nullable()->constrained('stations')->onDelete('set null');
            $table->string('name');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->decimal('base_price', 10, 2);
            $table->string('image_url', 500)->nullable();
            $table->unsignedInteger('estimated_prep_minutes')->default(15);
            $table->boolean('is_available')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('menu_category_id');
            $table->index('is_available');
            $table->index('default_station_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};

