<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            if (!Schema::hasColumn('restaurants', 'commission_rate')) {
                $table->decimal('commission_rate', 5, 2)->nullable()->after('status');
            }
        });

        Schema::table('couriers', function (Blueprint $table) {
            if (!Schema::hasColumn('couriers', 'base_delivery_fee')) {
                $table->decimal('base_delivery_fee', 10, 2)->default(1.50)->after('max_concurrent_deliveries');
            }
        });

        Schema::table('payments', function (Blueprint $table) {
            if (!Schema::hasColumn('payments', 'currency')) {
                $table->string('currency', 3)->default('EUR')->after('amount');
            }
            if (!Schema::hasColumn('payments', 'is_simulated')) {
                $table->boolean('is_simulated')->default(true)->after('status');
            }
            if (!Schema::hasColumn('payments', 'simulation_outcome')) {
                $table->string('simulation_outcome', 50)->nullable()->after('is_simulated');
            }
            if (!Schema::hasColumn('payments', 'failure_reason')) {
                $table->string('failure_reason', 255)->nullable()->after('simulation_outcome');
            }
            if (!Schema::hasColumn('payments', 'cod_collected')) {
                $table->boolean('cod_collected')->default(false)->after('paid_at');
            }
            if (!Schema::hasColumn('payments', 'cod_collected_at')) {
                $table->timestamp('cod_collected_at')->nullable()->after('cod_collected');
            }
            if (!Schema::hasColumn('payments', 'cod_collected_by_user_id')) {
                $table->unsignedBigInteger('cod_collected_by_user_id')->nullable()->after('cod_collected_at');
            }
            if (!Schema::hasColumn('payments', 'cod_collection_notes')) {
                $table->string('cod_collection_notes', 255)->nullable()->after('cod_collected_by_user_id');
            }
            if (!Schema::hasColumn('payments', 'refunded_amount')) {
                $table->decimal('refunded_amount', 10, 2)->default(0.00)->after('amount');
            }
            if (!Schema::hasColumn('payments', 'metadata')) {
                $table->json('metadata')->nullable()->after('cod_collection_notes');
            }
        });
    }

    public function down(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            if (Schema::hasColumn('restaurants', 'commission_rate')) {
                $table->dropColumn('commission_rate');
            }
        });

        Schema::table('couriers', function (Blueprint $table) {
            if (Schema::hasColumn('couriers', 'base_delivery_fee')) {
                $table->dropColumn('base_delivery_fee');
            }
        });

        Schema::table('payments', function (Blueprint $table) {
            $cols = array_filter([
                'currency',
                'is_simulated',
                'simulation_outcome',
                'failure_reason',
                'cod_collected',
                'cod_collected_at',
                'cod_collected_by_user_id',
                'cod_collection_notes',
                'refunded_amount',
                'metadata',
            ], fn ($c) => Schema::hasColumn('payments', $c));
            if (!empty($cols)) {
                $table->dropColumn($cols);
            }
        });
    }
};
