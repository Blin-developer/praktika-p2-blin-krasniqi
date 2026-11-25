<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Shto rolin 'courier' në enum-in e tabelës users (MySQL InnoDB)
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('customer', 'kitchen_staff', 'branch_manager', 'cashier', 'owner', 'super_admin', 'courier') NOT NULL DEFAULT 'customer'");

        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'avatar_url')) {
                $table->string('avatar_url', 500)->nullable()->after('phone');
            }
            if (!Schema::hasColumn('users', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('role');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'avatar_url')) {
                $table->dropColumn('avatar_url');
            }
            if (Schema::hasColumn('users', 'is_active')) {
                $table->dropColumn('is_active');
            }
        });

        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('customer', 'kitchen_staff', 'branch_manager', 'cashier', 'owner', 'super_admin') NOT NULL DEFAULT 'customer'");
    }
};
