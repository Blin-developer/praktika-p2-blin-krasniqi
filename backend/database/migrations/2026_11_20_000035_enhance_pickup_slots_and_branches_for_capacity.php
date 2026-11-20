<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Zgjerimi i tabelës branches për menaxhimin e avancuar të kapacitetit dhe sloteve
        Schema::table('branches', function (Blueprint $table) {
            $table->unsignedInteger('max_delivery_per_slot')->nullable()->after('max_orders_per_slot');
            $table->unsignedInteger('max_pickup_per_slot')->nullable()->after('max_delivery_per_slot');
            $table->unsignedInteger('max_kitchen_workload_minutes')->default(90)->after('max_pickup_per_slot');
            $table->unsignedInteger('order_lead_time_minutes')->default(20)->after('max_kitchen_workload_minutes');
            $table->unsignedInteger('max_advance_days')->default(7)->after('order_lead_time_minutes');
        });

        // 2. Zgjerimi i tabelës pickup_slots për të mbështetur kapacitetin e dërgesave dhe ngarkesën e kuzhinës
        Schema::table('pickup_slots', function (Blueprint $table) {
            $table->unsignedInteger('max_delivery_capacity')->nullable()->after('max_capacity');
            $table->unsignedInteger('booked_delivery_count')->default(0)->after('max_delivery_capacity');
            $table->unsignedInteger('max_pickup_capacity')->nullable()->after('booked_delivery_count');
            $table->unsignedInteger('booked_pickup_count')->default(0)->after('max_pickup_capacity');
            $table->unsignedInteger('total_prep_time_minutes')->default(0)->after('booked_pickup_count');
            $table->boolean('is_active')->default(true)->after('total_prep_time_minutes');
            $table->string('notes')->nullable()->after('is_active');
        });

        // 3. Zgjerimi i tabelës orders për porositë e planifikuara (Scheduled Orders)
        Schema::table('orders', function (Blueprint $table) {
            $table->boolean('is_scheduled')->default(false)->after('status');
            $table->dateTime('scheduled_for')->nullable()->after('is_scheduled');
            $table->foreignId('time_slot_id')->nullable()->constrained('pickup_slots')->onDelete('set null')->after('scheduled_for');
            $table->string('slot_start', 10)->nullable()->after('time_slot_id');
            $table->string('slot_end', 10)->nullable()->after('slot_start');
            $table->unsignedInteger('estimated_wait_time_minutes')->nullable()->after('estimated_prep_time_minutes');

            $table->index('is_scheduled');
            $table->index('scheduled_for');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['time_slot_id']);
            $table->dropIndex(['is_scheduled']);
            $table->dropIndex(['scheduled_for']);
            $table->dropColumn([
                'is_scheduled',
                'scheduled_for',
                'time_slot_id',
                'slot_start',
                'slot_end',
                'estimated_wait_time_minutes',
            ]);
        });

        Schema::table('pickup_slots', function (Blueprint $table) {
            $table->dropColumn([
                'max_delivery_capacity',
                'booked_delivery_count',
                'max_pickup_capacity',
                'booked_pickup_count',
                'total_prep_time_minutes',
                'is_active',
                'notes',
            ]);
        });

        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn([
                'max_delivery_per_slot',
                'max_pickup_per_slot',
                'max_kitchen_workload_minutes',
                'order_lead_time_minutes',
                'max_advance_days',
            ]);
        });
    }
};
