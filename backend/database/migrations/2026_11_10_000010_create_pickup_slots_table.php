<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pickup_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->date('slot_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedInteger('max_capacity')->default(6);
            $table->unsignedInteger('current_booked_count')->default(0);
            $table->timestamps();

            $table->unique(['branch_id', 'slot_date', 'start_time'], 'unique_branch_slot');
            $table->index(['branch_id', 'slot_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pickup_slots');
    }
};

