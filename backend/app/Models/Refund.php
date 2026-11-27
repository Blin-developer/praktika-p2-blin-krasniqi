<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Refund extends Model
{
    use HasFactory;

    protected $fillable = [
        'reference',
        'order_id',
        'payment_id',
        'restaurant_id',
        'amount',
        'currency',
        'type',
        'status',
        'reason',
        'admin_notes',
        'is_simulated',
        'requested_by_user_id',
        'approved_by_user_id',
        'processed_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'is_simulated' => 'boolean',
        'processed_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }

    public function restaurant()
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function requestedBy()
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }
}
