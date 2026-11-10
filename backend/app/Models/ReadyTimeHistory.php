<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReadyTimeHistory extends Model
{
    use HasFactory;

    protected $table = 'ready_time_history';

    protected $fillable = [
        'order_id',
        'original_estimated_minutes',
        'revised_estimated_minutes',
        'estimated_ready_at',
        'actual_ready_at',
        'updated_by_user_id',
    ];

    protected $casts = [
        'original_estimated_minutes' => 'integer',
        'revised_estimated_minutes' => 'integer',
        'estimated_ready_at' => 'datetime',
        'actual_ready_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by_user_id');
    }
}

