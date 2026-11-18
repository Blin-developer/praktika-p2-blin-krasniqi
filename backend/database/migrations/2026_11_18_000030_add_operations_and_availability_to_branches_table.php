<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->boolean('is_temporarily_closed')->default(false)->after('is_active');
            $table->timestamp('paused_until')->nullable()->after('is_temporarily_closed');
            $table->string('pause_reason')->nullable()->after('paused_until');
            $table->boolean('busy_mode')->default(false)->after('pause_reason');
            $table->unsignedInteger('current_prep_time_minutes')->nullable()->after('default_prep_time_minutes');
            $table->boolean('accepts_delivery')->default(true)->after('current_prep_time_minutes');
            $table->boolean('accepts_pickup')->default(true)->after('accepts_delivery');
            $table->string('timezone', 50)->default('Europe/Belgrade')->after('accepts_pickup');

            $table->index('is_temporarily_closed');
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropIndex(['is_temporarily_closed']);
            $table->dropColumn([
                'is_temporarily_closed',
                'paused_until',
                'pause_reason',
                'busy_mode',
                'current_prep_time_minutes',
                'accepts_delivery',
                'accepts_pickup',
                'timezone',
            ]);
        });
    }
};
