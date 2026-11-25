<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DeliveryZone extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'name',
        'city',
        'description',
        'delivery_fee',
        'min_order_amount',
        'estimated_delivery_minutes',
        'max_distance_km',
        'center_latitude',
        'center_longitude',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'delivery_fee' => 'decimal:2',
        'min_order_amount' => 'decimal:2',
        'estimated_delivery_minutes' => 'integer',
        'max_distance_km' => 'decimal:2',
        'center_latitude' => 'float',
        'center_longitude' => 'float',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function deliveries()
    {
        return $this->hasMany(Delivery::class);
    }
}
