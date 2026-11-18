<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SpecialOpeningHour extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'date',
        'open_time',
        'close_time',
        'is_closed',
        'reason_or_occasion',
    ];

    protected $casts = [
        'date' => 'date',
        'is_closed' => 'boolean',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
