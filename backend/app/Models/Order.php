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
        'status',
        'scheduled_pickup_at',
        'customer_note',
        'subtotal',
        'tax_amount',
        'total_price',
        'payment_status',
    ];

    protected $casts = [
        'scheduled_pickup_at' => 'datetime',
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_price' => 'decimal:2',
    ];

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
