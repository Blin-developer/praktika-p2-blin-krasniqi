<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number', 50)->unique();
            $table->foreignId('customer_id')->constrained('users')->onDelete('restrict');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('restrict');
            $table->enum('status', [
                'pending',
                'confirmed',
                'in_preparation',
                'ready_for_pickup',
                'completed',
                'cancelled'
            ])->default('pending');
            $table->timestamp('scheduled_pickup_at')->nullable();
            $table->text('customer_note')->nullable();
            $table->decimal('subtotal', 10, 2);
            $table->decimal('tax_amount', 10, 2)->default(0.00);
            $table->decimal('total_price', 10, 2);
            $table->enum('payment_status', ['pending', 'paid', 'refunded'])->default('pending');
            $table->timestamps();

            $table->index('customer_id');
            $table->index('branch_id');
            $table->index('status');
            $table->index('payment_status');
            $table->index('scheduled_pickup_at');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};

