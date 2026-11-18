<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        $frontendBase = rtrim(env('FRONTEND_URL', 'http://192.168.0.163:5173'), '/');
        $tokens = DB::table('pickup_tokens')->get();

        foreach ($tokens as $token) {
            $rawToken = '';
            $payload = (string) ($token->qr_payload ?? '');

            if (str_contains($payload, '?token=')) {
                parse_str(parse_url($payload, PHP_URL_QUERY) ?? '', $queryParams);
                $rawToken = $queryParams['token'] ?? '';
            } elseif (str_starts_with($payload, 'TASTIO:ORDER:')) {
                $parts = explode(':', $payload);
                $rawToken = end($parts) ?: '';
            }

            if (empty($rawToken)) {
                $rawToken = Str::random(40);
            }

            $validUrl = "{$frontendBase}/orders/{$token->order_id}/verify?token={$rawToken}";

            DB::table('pickup_tokens')
                ->where('id', $token->id)
                ->update([
                    'qr_payload' => $validUrl,
                    'token_hash' => hash('sha256', $rawToken),
                    'expires_at' => now()->addDays(30),
                ]);
        }
    }

    public function down(): void
    {
        // No-op
    }
};
