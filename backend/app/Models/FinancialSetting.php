<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FinancialSetting extends Model
{
    protected $fillable = ['key', 'value', 'description', 'updated_by_user_id'];

    public static function getValue(string $key, string $default): string
    {
        $row = self::where('key', $key)->first();
        return $row ? (string) $row->value : $default;
    }

    public static function setValue(string $key, string $value, ?int $userId = null, ?string $description = null): self
    {
        return self::updateOrCreate(
            ['key' => $key],
            array_filter([
                'value' => $value,
                'updated_by_user_id' => $userId,
                'description' => $description,
            ], fn ($v) => $v !== null)
        );
    }
}
