<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'product_id',
        'station_id',
        'product_name_snapshot',
        'unit_price_snapshot',
        'quantity',
        'line_total',
        'item_status',
    ];

    protected $casts = [
        'unit_price_snapshot' => 'decimal:2',
        'line_total' => 'decimal:2',
        'quantity' => 'integer',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function station()
    {
        return $this->belongsTo(Station::class);
    }

    public function options()
    {
        return $this->hasMany(OrderItemOption::class);
    }
}

