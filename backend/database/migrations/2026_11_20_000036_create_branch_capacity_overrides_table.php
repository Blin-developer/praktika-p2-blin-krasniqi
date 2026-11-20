<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('branch_capacity_overrides', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->date('date')->nullable(); // Për data specifike (prioritet më i lartë)
            $table->unsignedTinyInteger('day_of_week')->nullable(); // 0 = E Diel, ..., 6 = E Shtunë (për ditë fikse jave)
            $table->unsignedInteger('max_orders_per_slot')->nullable();
            $table->unsignedInteger('max_delivery_per_slot')->nullable();
            $table->unsignedInteger('max_pickup_per_slot')->nullable();
            $table->unsignedInteger('max_kitchen_workload_minutes')->nullable();
            $table->boolean('is_closed')->default(false);
            $table->string('reason')->nullable();
            $table->timestamps();

            $table->index(['branch_id', 'date']);
            $table->index(['branch_id', 'day_of_week']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('branch_capacity_overrides');
    }
};
