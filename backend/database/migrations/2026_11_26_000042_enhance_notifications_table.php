<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            if (!Schema::hasColumn('notifications', 'event_key')) {
                $table->string('event_key', 140)->nullable()->after('type');
            }
            if (!Schema::hasColumn('notifications', 'action_url')) {
                $table->string('action_url', 255)->nullable()->after('payload');
            }
            if (!Schema::hasColumn('notifications', 'branch_id')) {
                $table->unsignedBigInteger('branch_id')->nullable()->after('user_id');
            }
            if (!Schema::hasColumn('notifications', 'read_at')) {
                $table->timestamp('read_at')->nullable()->after('is_read');
            }

            $table->index(['user_id', 'is_read', 'created_at'], 'notifications_user_read_created_idx');
            $table->index(['user_id', 'event_key'], 'notifications_user_event_key_idx');
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex('notifications_user_read_created_idx');
            $table->dropIndex('notifications_user_event_key_idx');

            $cols = array_filter(['event_key', 'action_url', 'branch_id', 'read_at'], fn ($c) => Schema::hasColumn('notifications', $c));
            if (!empty($cols)) {
                $table->dropColumn($cols);
            }
        });
    }
};
