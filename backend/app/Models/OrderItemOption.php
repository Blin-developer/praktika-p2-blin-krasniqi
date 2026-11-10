<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderItemOption extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_item_id',
        'option_choice_id',
        'option_group_name_snapshot',
        'option_choice_name_snapshot',
        'additional_price_snapshot',
    ];

    protected $casts = [
        'additional_price_snapshot' => 'decimal:2',
    ];

    public function orderItem()
    {
        return $this->belongsTo(OrderItem::class);
    }

    public function optionChoice()
    {
        return $this->belongsTo(OptionChoice::class);
    }
}

