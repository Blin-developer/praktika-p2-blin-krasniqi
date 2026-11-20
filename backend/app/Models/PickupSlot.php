<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PickupSlot extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'slot_date',
        'start_time',
        'end_time',
        'max_capacity',
        'current_booked_count',
        'max_delivery_capacity',
        'booked_delivery_count',
        'max_pickup_capacity',
        'booked_pickup_count',
        'total_prep_time_minutes',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'slot_date' => 'date',
        'max_capacity' => 'integer',
        'current_booked_count' => 'integer',
        'max_delivery_capacity' => 'integer',
        'booked_delivery_count' => 'integer',
        'max_pickup_capacity' => 'integer',
        'booked_pickup_count' => 'integer',
        'total_prep_time_minutes' => 'integer',
        'is_active' => 'boolean',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'time_slot_id');
    }

    public function isAvailable(): bool
    {
        return $this->is_active && ($this->current_booked_count < $this->max_capacity);
    }

    public function remainingCapacity(): int
    {
        return max(0, $this->max_capacity - $this->current_booked_count);
    }

    public function remainingDeliveryCapacity(): int
    {
        if ($this->max_delivery_capacity === null) {
            return $this->remainingCapacity();
        }
        return max(0, min($this->remainingCapacity(), $this->max_delivery_capacity - $this->booked_delivery_count));
    }

    public function remainingPickupCapacity(): int
    {
        if ($this->max_pickup_capacity === null) {
            return $this->remainingCapacity();
        }
        return max(0, min($this->remainingCapacity(), $this->max_pickup_capacity - $this->booked_pickup_count));
    }

    public function isAvailableFor(string $orderType = 'all', int $prepTime = 0, ?int $maxWorkload = null): bool
    {
        if (!$this->is_active) {
            return false;
        }

        if ($this->remainingCapacity() <= 0) {
            return false;
        }

        if ($orderType === 'delivery') {
            if ($this->max_delivery_capacity !== null && $this->booked_delivery_count >= $this->max_delivery_capacity) {
                return false;
            }
        } elseif ($orderType === 'pickup') {
            if ($this->max_pickup_capacity !== null && $this->booked_pickup_count >= $this->max_pickup_capacity) {
                return false;
            }
        }

        if ($maxWorkload !== null && $prepTime > 0) {
            if (($this->total_prep_time_minutes + $prepTime) > $maxWorkload) {
                return false;
            }
        }

        return true;
    }
}
