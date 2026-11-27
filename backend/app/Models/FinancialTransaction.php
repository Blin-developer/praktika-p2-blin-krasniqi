<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FinancialTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'reference',
        'order_id',
        'payment_id',
        'restaurant_id',
        'branch_id',
        'customer_id',
        'courier_id',
        'refund_id',
        'payout_id',
        'type',
        'payment_method',
        'status',
        'amount',
        'currency',
        'description',
        'event_key',
        'metadata',
        'completed_at',
        'created_by_user_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'metadata' => 'array',
        'completed_at' => 'datetime',
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

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function courier()
    {
        return $this->belongsTo(Courier::class);
    }

    public function refund()
    {
        return $this->belongsTo(Refund::class);
    }

    public function payout()
    {
        return $this->belongsTo(RestaurantPayout::class, 'payout_id');
    }
}
