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
        'track_stock',
        'stock_quantity',
        'is_out_of_stock',
        'temporary_unavailable_reason',
        'sort_order',
    ];

    protected $casts = [
        'base_price' => 'decimal:2',
        'is_available' => 'boolean',
        'track_stock' => 'boolean',
        'stock_quantity' => 'integer',
        'is_out_of_stock' => 'boolean',
        'estimated_prep_minutes' => 'integer',
    ];

    /**
     * Kontrollon nëse produkti mund të porositet aktualisht.
     */
    public function isOrderable(): bool
    {
        if (!$this->is_available || $this->is_out_of_stock) {
            return false;
        }

        if ($this->track_stock && $this->stock_quantity !== null && $this->stock_quantity <= 0) {
            return false;
        }

        return true;
    }

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
