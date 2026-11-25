<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('couriers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->onDelete('cascade');
            $table->foreignId('branch_id')->nullable()->constrained('branches')->onDelete('set null');
            $table->enum('vehicle_type', ['bicycle', 'scooter', 'car', 'on_foot'])->default('scooter');
            $table->string('license_plate', 50)->nullable();
            $table->enum('availability_status', ['available', 'busy', 'offline'])->default('offline');
            $table->boolean('is_active')->default(true);
            $table->decimal('current_latitude', 10, 7)->nullable();
            $table->decimal('current_longitude', 10, 7)->nullable();
            $table->timestamp('last_location_at')->nullable();
            $table->unsignedTinyInteger('max_concurrent_deliveries')->default(2);
            $table->unsignedInteger('total_deliveries')->default(0);
            $table->unsignedInteger('successful_deliveries')->default(0);
            $table->unsignedInteger('failed_deliveries')->default(0);
            $table->decimal('rating_avg', 3, 2)->default(5.00);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('availability_status');
            $table->index('is_active');
            $table->index('branch_id');
        });

        Schema::create('delivery_zones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->string('name', 120);
            $table->string('city', 80)->default('Prishtinë');
            $table->string('description', 255)->nullable();
            $table->decimal('delivery_fee', 8, 2)->default(1.50);
            $table->decimal('min_order_amount', 8, 2)->default(0.00);
            $table->unsignedSmallInteger('estimated_delivery_minutes')->default(30);
            $table->decimal('max_distance_km', 6, 2)->nullable();
            $table->decimal('center_latitude', 10, 7)->nullable();
            $table->decimal('center_longitude', 10, 7)->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('branch_id');
            $table->index('is_active');
            $table->index('city');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_zones');
        Schema::dropIfExists('couriers');
    }
};
