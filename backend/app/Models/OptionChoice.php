<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OptionChoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'option_group_id',
        'name',
        'additional_price',
        'is_available',
        'sort_order',
    ];

    protected $casts = [
        'additional_price' => 'decimal:2',
        'is_available' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function optionGroup()
    {
        return $this->belongsTo(OptionGroup::class);
    }
}

