<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_item_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_item_id')->constrained('order_items')->onDelete('cascade');
            $table->foreignId('option_choice_id')->nullable()->constrained('option_choices')->onDelete('set null');
            $table->string('option_group_name_snapshot');
            $table->string('option_choice_name_snapshot');
            $table->decimal('additional_price_snapshot', 10, 2)->default(0.00);
            $table->timestamps();

            $table->index('order_item_id');
            $table->index('option_choice_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_item_options');
    }
};

