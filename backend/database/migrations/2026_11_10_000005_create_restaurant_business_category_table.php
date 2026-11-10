<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('restaurant_business_category', function (Blueprint $table) {
            $table->foreignId('restaurant_id')->constrained('restaurants')->onDelete('cascade');
            $table->foreignId('business_category_id')->constrained('business_categories')->onDelete('cascade');
            $table->primary(['restaurant_id', 'business_category_id'], 'rest_biz_cat_primary');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restaurant_business_category');
    }
};

