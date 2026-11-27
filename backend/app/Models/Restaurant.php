<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Restaurant extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'logo_url',
        'banner_url',
        'status',
        'commission_rate',
        'owner_user_id',
    ];

    protected $casts = [
        'commission_rate' => 'decimal:2',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function branches()
    {
        return $this->hasMany(Branch::class);
    }

    public function menuCategories()
    {
        return $this->hasMany(MenuCategory::class);
    }

    public function businessCategories()
    {
        return $this->belongsToMany(BusinessCategory::class, 'restaurant_business_category');
    }

    public function commissions()
    {
        return $this->hasMany(RestaurantCommission::class);
    }

    public function payouts()
    {
        return $this->hasMany(RestaurantPayout::class);
    }
}
