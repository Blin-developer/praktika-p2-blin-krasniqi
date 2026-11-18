<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('opening_hours', function (Blueprint $table) {
            $table->string('label', 100)->nullable()->after('is_closed');
            $table->boolean('is_overnight')->default(false)->after('label');
            $table->unsignedTinyInteger('sort_order')->default(0)->after('is_overnight');
        });
    }

    public function down(): void
    {
        Schema::table('opening_hours', function (Blueprint $table) {
            $table->dropColumn([
                'label',
                'is_overnight',
                'sort_order',
            ]);
        });
    }
};
