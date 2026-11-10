<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PickupToken extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'token_hash',
        'short_code',
        'qr_payload',
        'expires_at',
        'is_redeemed',
        'redeemed_at',
        'redeemed_by_user_id',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'is_redeemed' => 'boolean',
        'redeemed_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function redeemedBy()
    {
        return $this->belongsTo(User::class, 'redeemed_by_user_id');
    }
}

