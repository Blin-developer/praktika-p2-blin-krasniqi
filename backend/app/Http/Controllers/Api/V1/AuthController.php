<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Regjistrim i përdoruesit të ri (Klient ose Pronar Restoranti).
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'confirmed', Password::min(8)],
            'phone' => ['nullable', 'string', 'max:50'],
            'role' => ['nullable', 'string', 'in:customer,owner'],
        ], [
            'name.required' => 'Emri është i detyrueshëm.',
            'email.required' => 'Adresa e emailit është e detyrueshme.',
            'email.email' => 'Adresa e emailit nuk është e vlefshme.',
            'email.unique' => 'Kjo adresë emaili është tashmë e regjistruar.',
            'password.required' => 'Fjalëkalimi është i detyrueshëm.',
            'password.min' => 'Fjalëkalimi duhet të ketë të paktën 8 karaktere.',
            'password.confirmed' => 'Konfirmimi i fjalëkalimit nuk përputhet.',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'] ?? null,
            'role' => $validated['role'] ?? 'customer',
            'email_verified_at' => now(),
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'mesazh' => 'Llogaria u krijua me sukses.',
            'perdoruesi' => [
                'id' => $user->id,
                'emri' => $user->name,
                'email' => $user->email,
                'telefoni' => $user->phone,
                'roli' => $user->role,
            ],
            'token' => $token,
            // backward compat keys
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
            ],
            'message' => 'Llogaria u krijua me sukses.',
        ], 201);
    }

    /**
     * Autentifikim i përdoruesit dhe lëshim i tokenës Sanctum.
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ], [
            'email.required' => 'Adresa e emailit është e detyrueshme.',
            'email.email' => 'Adresa e emailit nuk është e vlefshme.',
            'password.required' => 'Fjalëkalimi është i detyrueshëm.',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Kredencialet e dhëna nuk përputhen me të dhënat tona.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        // Ngarko anëtarësimet e stafit me degën dhe stacionin nëse staf/menaxher
        $user->load(['staffMemberships.branch', 'staffMemberships.assignedStation']);

        return response()->json([
            'mesazh' => 'Kyçja u realizua me sukses.',
            'perdoruesi' => [
                'id' => $user->id,
                'emri' => $user->name,
                'email' => $user->email,
                'telefoni' => $user->phone,
                'roli' => $user->role,
                'anetaresime' => $user->staffMemberships,
            ],
            'token' => $token,
            // backward compat keys for JS client
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
                'memberships' => $user->staffMemberships,
            ],
            'message' => 'Kyçja u realizua me sukses.',
        ]);
    }

    /**
     * Ktheje profilin e përdoruesit të autentifikuar.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load(['staffMemberships.branch', 'staffMemberships.assignedStation']);

        return response()->json([
            'perdoruesi' => [
                'id' => $user->id,
                'emri' => $user->name,
                'email' => $user->email,
                'telefoni' => $user->phone,
                'roli' => $user->role,
                'anetaresime' => $user->staffMemberships,
            ],
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
                'memberships' => $user->staffMemberships,
            ],
        ]);
    }

    /**
     * Fshi tokenin aktual dhe çkyç përdoruesin.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'mesazh' => 'Çkyçja u realizua me sukses.',
            'message' => 'Çkyçja u realizua me sukses.',
        ]);
    }
}
