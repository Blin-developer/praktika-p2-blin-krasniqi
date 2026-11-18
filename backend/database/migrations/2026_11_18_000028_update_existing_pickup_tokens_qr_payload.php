<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        $tokens = DB::table('pickup_tokens')->get();

        foreach ($tokens as $token) {
            $payload = (string) $token->qr_payload;

            // Nëse nuk fillon me http/https, përditësoje në URL të vlefshme
            if (!str_starts_with($payload, 'http://') && !str_starts_with($payload, 'https://')) {
                $rawToken = Str::random(32);
                if (str_starts_with($payload, 'TASTIO:ORDER:')) {
                    $parts = explode(':', $payload);
                    $rawToken = end($parts) ?: $rawToken;
                }

                $validUrl = "https://tastio.com/orders/{$token->order_id}/verify?token={$rawToken}";

                DB::table('pickup_tokens')
                    ->where('id', $token->id)
                    ->update([
                        'qr_payload' => $validUrl,
                        'token_hash' => hash('sha256', $rawToken),
                    ]);
            }
        }
    }

    public function down(): void
    {
        // No-op
    }
};
