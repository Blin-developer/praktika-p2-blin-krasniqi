<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    use HasFactory;

    protected $fillable = [
        'restaurant_id',
        'name',
        'address',
        'city',
        'latitude',
        'longitude',
        'phone',
        'is_active',
        'default_prep_time_minutes',
        'slot_interval_minutes',
        'max_orders_per_slot',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
    ];

    public function restaurant()
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function staffMemberships()
    {
        return $this->hasMany(StaffMembership::class);
    }

    public function stations()
    {
        return $this->hasMany(Station::class);
    }

    public function openingHours()
    {
        return $this->hasMany(OpeningHour::class);
    }

    public function pickupSlots()
    {
        return $this->hasMany(PickupSlot::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    /**
     * Determine if branch is currently open for orders.
     */
    public function isOpenNow(): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $now = now();
        $dayOfWeek = $now->dayOfWeek; // 0 = Sunday, 1 = Monday, etc.
        $currentTime = $now->format('H:i:s');

        // Check if opening hours relation is loaded or query
        $todayHours = $this->relationLoaded('openingHours')
            ? $this->openingHours->firstWhere('day_of_week', $dayOfWeek)
            : $this->openingHours()->where('day_of_week', $dayOfWeek)->first();

        if (!$todayHours || $todayHours->is_closed) {
            return false;
        }

        return $currentTime >= $todayHours->open_time && $currentTime <= $todayHours->close_time;
    }
}
