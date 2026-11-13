<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('order_type', 30)->default('delivery')->after('branch_id');
            $table->string('customer_name', 255)->nullable()->after('order_type');
            $table->string('customer_email', 255)->nullable()->after('customer_name');
            $table->string('customer_phone', 50)->nullable()->after('customer_email');
            $table->text('delivery_address')->nullable()->after('customer_phone');
            $table->decimal('delivery_fee', 10, 2)->default(1.50)->after('subtotal');
            $table->string('payment_method', 50)->default('cash_on_delivery')->after('payment_status');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'order_type',
                'customer_name',
                'customer_email',
                'customer_phone',
                'delivery_address',
                'delivery_fee',
                'payment_method'
            ]);
        });
    }
};

