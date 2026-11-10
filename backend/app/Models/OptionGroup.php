<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OptionGroup extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'name',
        'min_selection',
        'max_selection',
        'is_required',
        'sort_order',
    ];

    protected $casts = [
        'min_selection' => 'integer',
        'max_selection' => 'integer',
        'is_required' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function choices()
    {
        return $this->hasMany(OptionChoice::class)->orderBy('sort_order');
    }
}

