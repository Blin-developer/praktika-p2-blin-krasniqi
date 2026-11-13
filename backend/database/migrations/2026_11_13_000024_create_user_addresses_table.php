<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('title')->default('Shtëpi'); // Shtëpi, Punë, Tjetër
            $table->string('city', 100)->default('Prishtinë');
            $table->string('street', 255);
            $table->string('building', 100)->nullable();
            $table->string('floor', 50)->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index('user_id');
            $table->index('is_default');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_addresses');
    }
};

