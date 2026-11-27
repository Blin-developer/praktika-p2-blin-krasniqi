<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RestaurantPayout extends Model
{
    use HasFactory;

    protected $fillable = [
        'reference',
        'restaurant_id',
        'amount',
        'currency',
        'status',
        'is_simulated',
        'notes',
        'created_by_user_id',
        'completed_by_user_id',
        'completed_at',
        'cancelled_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'is_simulated' => 'boolean',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function restaurant()
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function completedBy()
    {
        return $this->belongsTo(User::class, 'completed_by_user_id');
    }
}
