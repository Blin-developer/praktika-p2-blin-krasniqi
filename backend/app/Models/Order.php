<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_number',
        'customer_id',
        'branch_id',
        'order_type',
        'customer_name',
        'customer_email',
        'customer_phone',
        'delivery_address',
        'status',
        'is_scheduled',
        'scheduled_for',
        'time_slot_id',
        'slot_start',
        'slot_end',
        'scheduled_pickup_at',
        'estimated_prep_time_minutes',
        'estimated_wait_time_minutes',
        'customer_note',
        'subtotal',
        'delivery_fee',
        'tax_amount',
        'total_price',
        'payment_status',
        'payment_method',
    ];

    protected $casts = [
        'is_scheduled' => 'boolean',
        'scheduled_for' => 'datetime',
        'scheduled_pickup_at' => 'datetime',
        'estimated_prep_time_minutes' => 'integer',
        'estimated_wait_time_minutes' => 'integer',
        'subtotal' => 'decimal:2',
        'delivery_fee' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_price' => 'decimal:2',
    ];

    public function timeSlot()
    {
        return $this->belongsTo(PickupSlot::class, 'time_slot_id');
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function statusHistory()
    {
        return $this->hasMany(OrderStatusHistory::class);
    }

    public function readyTimeHistory()
    {
        return $this->hasMany(ReadyTimeHistory::class);
    }

    public function payment()
    {
        return $this->hasOne(Payment::class);
    }

    public function pickupToken()
    {
        return $this->hasOne(PickupToken::class);
    }
}
