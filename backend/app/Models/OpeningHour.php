<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OpeningHour extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'day_of_week',
        'open_time',
        'close_time',
        'is_closed',
        'label',
        'is_overnight',
        'sort_order',
    ];

    protected $casts = [
        'day_of_week' => 'integer',
        'is_closed' => 'boolean',
        'is_overnight' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}

