<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('financial_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique();
            $table->string('value', 255);
            $table->string('description', 255)->nullable();
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });

        DB::table('financial_settings')->insert([
            [
                'key' => 'default_commission_rate',
                'value' => '15.00',
                'description' => 'Komisioni standard i platformës TASTIO (%)',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'default_courier_base_fee',
                'value' => '1.50',
                'description' => 'Kompensimi bazë i korrierit për dërgesë (EUR)',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        Schema::create('restaurant_commissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained('orders')->onDelete('cascade');
            $table->foreignId('restaurant_id')->constrained('restaurants')->onDelete('cascade');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->decimal('gross_subtotal', 12, 2);
            $table->decimal('commission_rate', 5, 2);
            $table->decimal('commission_amount', 12, 2);
            $table->decimal('restaurant_net_earnings', 12, 2);
            $table->string('status', 30)->default('earned'); // earned | reversed | pending
            $table->string('notes', 255)->nullable();
            $table->timestamp('earned_at')->nullable();
            $table->timestamp('reversed_at')->nullable();
            $table->timestamps();

            $table->index(['restaurant_id', 'status']);
            $table->index(['branch_id', 'status']);
            $table->index('created_at');
        });

        Schema::create('courier_earnings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_id')->unique()->constrained('deliveries')->onDelete('cascade');
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');
            $table->foreignId('courier_id')->constrained('couriers')->onDelete('cascade');
            $table->decimal('base_fee', 10, 2);
            $table->decimal('bonus_amount', 10, 2)->default(0.00);
            $table->decimal('total_amount', 10, 2);
            $table->string('currency', 3)->default('EUR');
            $table->string('status', 30)->default('available'); // pending | available | paid | cancelled
            $table->timestamp('paid_at')->nullable();
            $table->string('notes', 255)->nullable();
            $table->timestamps();

            $table->index(['courier_id', 'status']);
            $table->index('created_at');
        });

        Schema::create('refunds', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 64)->unique();
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');
            $table->foreignId('payment_id')->constrained('payments')->onDelete('cascade');
            $table->foreignId('restaurant_id')->constrained('restaurants')->onDelete('cascade');
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('EUR');
            $table->string('type', 20)->default('full'); // full | partial
            $table->string('status', 30)->default('completed'); // pending | completed | rejected
            $table->string('reason', 500);
            $table->string('admin_notes', 500)->nullable();
            $table->boolean('is_simulated')->default(true);
            $table->foreignId('requested_by_user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'status']);
            $table->index(['restaurant_id', 'status']);
        });

        Schema::create('restaurant_payouts', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 64)->unique();
            $table->foreignId('restaurant_id')->constrained('restaurants')->onDelete('cascade');
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('EUR');
            $table->string('status', 30)->default('pending'); // pending | completed | cancelled
            $table->boolean('is_simulated')->default(true);
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('completed_by_user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            $table->index(['restaurant_id', 'status']);
            $table->index('created_at');
        });

        Schema::create('financial_adjustments', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 64)->unique();
            $table->foreignId('restaurant_id')->nullable()->constrained('restaurants')->onDelete('cascade');
            $table->foreignId('courier_id')->nullable()->constrained('couriers')->onDelete('cascade');
            $table->foreignId('order_id')->nullable()->constrained('orders')->onDelete('set null');
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('EUR');
            $table->string('reason', 500);
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index('restaurant_id');
            $table->index('courier_id');
        });

        Schema::create('financial_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 64)->unique();
            $table->foreignId('order_id')->nullable()->constrained('orders')->onDelete('set null');
            $table->foreignId('payment_id')->nullable()->constrained('payments')->onDelete('set null');
            $table->foreignId('restaurant_id')->nullable()->constrained('restaurants')->onDelete('set null');
            $table->foreignId('branch_id')->nullable()->constrained('branches')->onDelete('set null');
            $table->foreignId('customer_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('courier_id')->nullable()->constrained('couriers')->onDelete('set null');
            $table->foreignId('refund_id')->nullable()->constrained('refunds')->onDelete('set null');
            $table->foreignId('payout_id')->nullable()->constrained('restaurant_payouts')->onDelete('set null');
            $table->string('type', 50); // customer_payment | cod_collection | restaurant_commission | refund | restaurant_payout | courier_earning | financial_adjustment
            $table->string('payment_method', 50)->nullable();
            $table->string('status', 30)->default('pending'); // pending | successful | failed | cancelled | refunded | partially_refunded
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('EUR');
            $table->string('description', 255);
            $table->string('event_key', 160)->nullable()->unique();
            $table->json('metadata')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index('order_id');
            $table->index('restaurant_id');
            $table->index('branch_id');
            $table->index('courier_id');
            $table->index('type');
            $table->index('status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('financial_transactions');
        Schema::dropIfExists('financial_adjustments');
        Schema::dropIfExists('restaurant_payouts');
        Schema::dropIfExists('refunds');
        Schema::dropIfExists('courier_earnings');
        Schema::dropIfExists('restaurant_commissions');
        Schema::dropIfExists('financial_settings');
    }
};
