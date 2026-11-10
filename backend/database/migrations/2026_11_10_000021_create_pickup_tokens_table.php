<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pickup_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');
            $table->string('token_hash', 64)->unique();
            $table->string('short_code', 20)->index();
            $table->text('qr_payload');
            $table->timestamp('expires_at');
            $table->boolean('is_redeemed')->default(false);
            $table->timestamp('redeemed_at')->nullable();
            $table->foreignId('redeemed_by_user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index('order_id');
            $table->index('is_redeemed');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pickup_tokens');
    }
};

