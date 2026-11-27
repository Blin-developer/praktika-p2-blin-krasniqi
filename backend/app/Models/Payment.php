<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'amount',
        'refunded_amount',
        'currency',
        'method',
        'status',
        'is_simulated',
        'simulation_outcome',
        'failure_reason',
        'processed_by_user_id',
        'transaction_reference',
        'paid_at',
        'cod_collected',
        'cod_collected_at',
        'cod_collected_by_user_id',
        'cod_collection_notes',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'refunded_amount' => 'decimal:2',
        'is_simulated' => 'boolean',
        'cod_collected' => 'boolean',
        'paid_at' => 'datetime',
        'cod_collected_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function processedBy()
    {
        return $this->belongsTo(User::class, 'processed_by_user_id');
    }

    public function codCollectedBy()
    {
        return $this->belongsTo(User::class, 'cod_collected_by_user_id');
    }

    public function refunds()
    {
        return $this->hasMany(Refund::class);
    }

    public function transactions()
    {
        return $this->hasMany(FinancialTransaction::class);
    }
}

