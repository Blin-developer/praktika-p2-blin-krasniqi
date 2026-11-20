<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BranchCapacityOverride extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'date',
        'day_of_week',
        'max_orders_per_slot',
        'max_delivery_per_slot',
        'max_pickup_per_slot',
        'max_kitchen_workload_minutes',
        'is_closed',
        'reason',
    ];

    protected $casts = [
        'date' => 'date',
        'day_of_week' => 'integer',
        'max_orders_per_slot' => 'integer',
        'max_delivery_per_slot' => 'integer',
        'max_pickup_per_slot' => 'integer',
        'max_kitchen_workload_minutes' => 'integer',
        'is_closed' => 'boolean',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
