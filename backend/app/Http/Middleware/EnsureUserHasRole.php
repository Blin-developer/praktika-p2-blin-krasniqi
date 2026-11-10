<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    /**
     * Trajto kërkesën hyrëse.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'mesazh' => 'Nuk jeni i autentifikuar.',
                'message' => 'Nuk jeni i autentifikuar.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        if (!in_array($user->role, $roles, true)) {
            return response()->json([
                'mesazh' => 'Qasja e ndaluar. Nuk keni leje të mjaftueshme për të hyrë në këtë burim.',
                'message' => 'Qasja e ndaluar. Nuk keni leje të mjaftueshme për të hyrë në këtë burim.',
                'roli_i_kerkuar' => $roles,
                'roli_juaj' => $user->role,
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
