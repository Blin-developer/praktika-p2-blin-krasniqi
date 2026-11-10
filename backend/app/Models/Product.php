<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'menu_category_id',
        'default_station_id',
        'name',
        'slug',
        'description',
        'base_price',
        'image_url',
        'estimated_prep_minutes',
        'is_available',
        'sort_order',
    ];

    protected $casts = [
        'base_price' => 'decimal:2',
        'is_available' => 'boolean',
    ];

    public function menuCategory()
    {
        return $this->belongsTo(MenuCategory::class);
    }

    public function defaultStation()
    {
        return $this->belongsTo(Station::class, 'default_station_id');
    }

    public function optionGroups()
    {
        return $this->hasMany(OptionGroup::class);
    }
}
