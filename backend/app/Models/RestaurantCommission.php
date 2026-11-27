<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RestaurantCommission extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'restaurant_id',
        'branch_id',
        'gross_subtotal',
        'commission_rate',
        'commission_amount',
        'restaurant_net_earnings',
        'status',
        'notes',
        'earned_at',
        'reversed_at',
    ];

    protected $casts = [
        'gross_subtotal' => 'decimal:2',
        'commission_rate' => 'decimal:2',
        'commission_amount' => 'decimal:2',
        'restaurant_net_earnings' => 'decimal:2',
        'earned_at' => 'datetime',
        'reversed_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function restaurant()
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
