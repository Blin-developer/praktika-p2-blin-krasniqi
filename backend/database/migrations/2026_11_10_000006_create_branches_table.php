<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained('restaurants')->onDelete('cascade');
            $table->string('name');
            $table->string('address');
            $table->string('city', 100)->default('Pristina');
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->string('phone', 50);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('default_prep_time_minutes')->default(25);
            $table->unsignedInteger('slot_interval_minutes')->default(15);
            $table->unsignedInteger('max_orders_per_slot')->default(6);
            $table->timestamps();

            $table->index('restaurant_id');
            $table->index('is_active');
            $table->index(['latitude', 'longitude']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('branches');
    }
};

