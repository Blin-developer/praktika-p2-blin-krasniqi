<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CourierLocation extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'courier_id',
        'delivery_id',
        'latitude',
        'longitude',
        'accuracy_meters',
        'recorded_at',
    ];

    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
        'accuracy_meters' => 'float',
        'recorded_at' => 'datetime',
    ];

    public function courier()
    {
        return $this->belongsTo(Courier::class);
    }

    public function delivery()
    {
        return $this->belongsTo(Delivery::class);
    }
}
