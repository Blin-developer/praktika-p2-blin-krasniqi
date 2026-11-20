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
        'is_temporarily_closed',
        'paused_until',
        'pause_reason',
        'busy_mode',
        'default_prep_time_minutes',
        'current_prep_time_minutes',
        'slot_interval_minutes',
        'max_orders_per_slot',
        'max_delivery_per_slot',
        'max_pickup_per_slot',
        'max_kitchen_workload_minutes',
        'order_lead_time_minutes',
        'max_advance_days',
        'accepts_delivery',
        'accepts_pickup',
        'timezone',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_temporarily_closed' => 'boolean',
        'paused_until' => 'datetime',
        'busy_mode' => 'boolean',
        'accepts_delivery' => 'boolean',
        'accepts_pickup' => 'boolean',
        'current_prep_time_minutes' => 'integer',
        'default_prep_time_minutes' => 'integer',
        'slot_interval_minutes' => 'integer',
        'max_orders_per_slot' => 'integer',
        'max_delivery_per_slot' => 'integer',
        'max_pickup_per_slot' => 'integer',
        'max_kitchen_workload_minutes' => 'integer',
        'order_lead_time_minutes' => 'integer',
        'max_advance_days' => 'integer',
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
        return $this->hasMany(OpeningHour::class)->orderBy('sort_order')->orderBy('open_time');
    }

    public function specialOpeningHours()
    {
        return $this->hasMany(SpecialOpeningHour::class)->orderBy('date');
    }

    public function capacityOverrides()
    {
        return $this->hasMany(BranchCapacityOverride::class);
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
     * Merr kohën efektive të përgatitjes për degën.
     */
    public function effectivePrepTime(): int
    {
        if ($this->busy_mode && $this->current_prep_time_minutes) {
            return (int) $this->current_prep_time_minutes;
        }

        if ($this->current_prep_time_minutes) {
            return (int) $this->current_prep_time_minutes;
        }

        return (int) ($this->default_prep_time_minutes ?: 20);
    }

    /**
     * Përditëson gjendjen e pauzimit të përkohshëm nëse afati ka kaluar.
     */
    public function syncTemporaryClosureState(): void
    {
        if ($this->is_temporarily_closed && $this->paused_until && $this->paused_until->isPast()) {
            $this->update([
                'is_temporarily_closed' => false,
                'paused_until' => null,
                'pause_reason' => null,
            ]);
            $this->is_temporarily_closed = false;
            $this->paused_until = null;
            $this->pause_reason = null;
        }
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
