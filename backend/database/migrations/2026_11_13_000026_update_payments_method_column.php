<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Modify payments.method to VARCHAR(50) to support 'cash_on_delivery', 'card', etc.
        DB::statement("ALTER TABLE payments MODIFY COLUMN method VARCHAR(50) NOT NULL DEFAULT 'cash_on_delivery'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE payments MODIFY COLUMN method ENUM('cash_at_pickup', 'pos_terminal_at_pickup') NOT NULL");
    }
};

