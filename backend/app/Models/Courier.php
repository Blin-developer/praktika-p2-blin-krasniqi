<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Courier extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'branch_id',
        'vehicle_type',
        'license_plate',
        'availability_status',
        'is_active',
        'current_latitude',
        'current_longitude',
        'last_location_at',
        'max_concurrent_deliveries',
        'total_deliveries',
        'successful_deliveries',
        'failed_deliveries',
        'rating_avg',
        'notes',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'current_latitude' => 'float',
        'current_longitude' => 'float',
        'last_location_at' => 'datetime',
        'max_concurrent_deliveries' => 'integer',
        'total_deliveries' => 'integer',
        'successful_deliveries' => 'integer',
        'failed_deliveries' => 'integer',
        'rating_avg' => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function deliveries()
    {
        return $this->hasMany(Delivery::class);
    }

    public function activeDeliveries()
    {
        return $this->hasMany(Delivery::class)->whereIn('status', [
            'assigned',
            'accepted',
            'heading_to_restaurant',
            'arrived_at_restaurant',
            'picked_up',
            'heading_to_customer',
            'arrived_at_customer',
        ]);
    }

    public function locations()
    {
        return $this->hasMany(CourierLocation::class);
    }
}
