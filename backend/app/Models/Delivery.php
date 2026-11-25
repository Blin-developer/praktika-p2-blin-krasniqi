<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Delivery extends Model
{
    use HasFactory;

    public const ACTIVE_STATUSES = [
        'pending_assignment',
        'assigned',
        'accepted',
        'heading_to_restaurant',
        'arrived_at_restaurant',
        'picked_up',
        'heading_to_customer',
        'arrived_at_customer',
    ];

    public const TERMINAL_STATUSES = [
        'delivered',
        'failed',
        'cancelled',
    ];

    protected $fillable = [
        'order_id',
        'branch_id',
        'courier_id',
        'delivery_zone_id',
        'status',
        'priority',
        'delivery_fee',
        'pickup_address',
        'pickup_latitude',
        'pickup_longitude',
        'dropoff_address',
        'dropoff_latitude',
        'dropoff_longitude',
        'delivery_instructions',
        'estimated_delivery_at',
        'assigned_at',
        'assignment_expires_at',
        'accepted_at',
        'arrived_at_restaurant_at',
        'picked_up_at',
        'arrived_at_customer_at',
        'delivered_at',
        'failed_at',
        'cancelled_at',
        'delivery_notes',
        'proof_photo_path',
        'proof_recipient_name',
        'failure_reason',
        'incident_type',
        'rejection_count',
        'last_rejected_by_courier_id',
    ];

    protected $casts = [
        'delivery_fee' => 'decimal:2',
        'pickup_latitude' => 'float',
        'pickup_longitude' => 'float',
        'dropoff_latitude' => 'float',
        'dropoff_longitude' => 'float',
        'estimated_delivery_at' => 'datetime',
        'assigned_at' => 'datetime',
        'assignment_expires_at' => 'datetime',
        'accepted_at' => 'datetime',
        'arrived_at_restaurant_at' => 'datetime',
        'picked_up_at' => 'datetime',
        'arrived_at_customer_at' => 'datetime',
        'delivered_at' => 'datetime',
        'failed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'rejection_count' => 'integer',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function courier()
    {
        return $this->belongsTo(Courier::class);
    }

    public function deliveryZone()
    {
        return $this->belongsTo(DeliveryZone::class);
    }

    public function statusHistory()
    {
        return $this->hasMany(DeliveryStatusHistory::class)->orderBy('created_at', 'desc');
    }

    public function locations()
    {
        return $this->hasMany(CourierLocation::class)->orderBy('recorded_at', 'desc');
    }
}
