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
    ];

    protected $casts = [
        'slot_date' => 'date',
        'max_capacity' => 'integer',
        'current_booked_count' => 'integer',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function isAvailable(): bool
    {
        return $this->current_booked_count < $this->max_capacity;
    }
}

