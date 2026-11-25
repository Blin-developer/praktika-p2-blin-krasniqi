<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained('orders')->onDelete('cascade');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('restrict');
            $table->foreignId('courier_id')->nullable()->constrained('couriers')->onDelete('set null');
            $table->foreignId('delivery_zone_id')->nullable()->constrained('delivery_zones')->onDelete('set null');
            $table->enum('status', [
                'pending_assignment',
                'assigned',
                'accepted',
                'heading_to_restaurant',
                'arrived_at_restaurant',
                'picked_up',
                'heading_to_customer',
                'arrived_at_customer',
                'delivered',
                'failed',
                'cancelled'
            ])->default('pending_assignment');
            $table->enum('priority', ['normal', 'high', 'urgent'])->default('normal');
            $table->decimal('delivery_fee', 8, 2)->default(1.50);
            $table->string('pickup_address', 255)->nullable();
            $table->decimal('pickup_latitude', 10, 7)->nullable();
            $table->decimal('pickup_longitude', 10, 7)->nullable();
            $table->text('dropoff_address')->nullable();
            $table->decimal('dropoff_latitude', 10, 7)->nullable();
            $table->decimal('dropoff_longitude', 10, 7)->nullable();
            $table->text('delivery_instructions')->nullable();
            $table->timestamp('estimated_delivery_at')->nullable();
            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('assignment_expires_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('arrived_at_restaurant_at')->nullable();
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('arrived_at_customer_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('delivery_notes')->nullable();
            $table->string('proof_photo_path', 500)->nullable();
            $table->string('proof_recipient_name', 150)->nullable();
            $table->string('failure_reason', 500)->nullable();
            $table->string('incident_type', 80)->nullable();
            $table->unsignedSmallInteger('rejection_count')->default(0);
            $table->foreignId('last_rejected_by_courier_id')->nullable()->constrained('couriers')->onDelete('set null');
            $table->timestamps();

            $table->index('status');
            $table->index('courier_id');
            $table->index('branch_id');
            $table->index('priority');
            $table->index('assignment_expires_at');
        });

        Schema::create('delivery_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_id')->constrained('deliveries')->onDelete('cascade');
            $table->string('from_status', 50)->nullable();
            $table->string('to_status', 50);
            $table->foreignId('changed_by_user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('actor_role', 40)->nullable();
            $table->text('notes')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('delivery_id');
            $table->index('to_status');
        });

        Schema::create('courier_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('courier_id')->constrained('couriers')->onDelete('cascade');
            $table->foreignId('delivery_id')->nullable()->constrained('deliveries')->onDelete('set null');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->decimal('accuracy_meters', 8, 2)->nullable();
            $table->timestamp('recorded_at')->useCurrent();

            $table->index('courier_id');
            $table->index('delivery_id');
            $table->index('recorded_at');
        });

        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'delivery_zone_id')) {
                $table->foreignId('delivery_zone_id')->nullable()->after('branch_id')->constrained('delivery_zones')->onDelete('set null');
            }
            if (!Schema::hasColumn('orders', 'delivery_latitude')) {
                $table->decimal('delivery_latitude', 10, 7)->nullable()->after('delivery_address');
            }
            if (!Schema::hasColumn('orders', 'delivery_longitude')) {
                $table->decimal('delivery_longitude', 10, 7)->nullable()->after('delivery_latitude');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'delivery_zone_id')) {
                $table->dropForeign(['delivery_zone_id']);
                $table->dropColumn('delivery_zone_id');
            }
            if (Schema::hasColumn('orders', 'delivery_latitude')) {
                $table->dropColumn('delivery_latitude');
            }
            if (Schema::hasColumn('orders', 'delivery_longitude')) {
                $table->dropColumn('delivery_longitude');
            }
        });

        Schema::dropIfExists('courier_locations');
        Schema::dropIfExists('delivery_status_histories');
        Schema::dropIfExists('deliveries');
    }
};
