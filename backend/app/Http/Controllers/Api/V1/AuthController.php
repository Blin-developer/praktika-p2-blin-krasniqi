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
     * Regjistrim i përdoruesit të ri publik (Gjithmonë rol 'customer').
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'first_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', Password::min(8)],
            'password_confirmation' => ['nullable', 'string'],
            'phone' => ['nullable', 'string', 'max:50'],
        ], [
            'email.required' => 'Adresa e emailit është e detyrueshme.',
            'email.email' => 'Adresa e emailit nuk është e vlefshme.',
            'email.unique' => 'Kjo adresë emaili është tashmë e regjistruar.',
            'password.required' => 'Fjalëkalimi është i detyrueshëm.',
            'password.min' => 'Fjalëkalimi duhet të ketë të paktën 8 karaktere.',
        ]);

        if ($request->has('password_confirmation') && $request->password !== $request->password_confirmation) {
            throw ValidationException::withMessages([
                'password_confirmation' => ['Konfirmimi i fjalëkalimit nuk përputhet.'],
            ]);
        }

        $fullName = trim(($request->first_name ?? '') . ' ' . ($request->last_name ?? ''));
        if (empty($fullName)) {
            $fullName = $request->name ?? '';
        }
        if (empty($fullName)) {
            throw ValidationException::withMessages([
                'name' => ['Emri dhe mbiemri janë të detyrueshëm.'],
            ]);
        }

        // Rregull sigurie i patjetërsueshëm: Regjistrimet publike marrin VETËM rolin 'customer'
        $user = User::create([
            'name' => $fullName,
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'] ?? null,
            'role' => 'customer',
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
     * Kërkesë për rikuperim fjalëkalimi ("Ke harruar fjalëkalimin?").
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ], [
            'email.required' => 'Adresa e emailit është e detyrueshme.',
            'email.email' => 'Adresa e emailit nuk është e vlefshme.',
        ]);

        return response()->json([
            'mesazh' => 'Nëse ekziston një llogari me këtë email, keni pranuar udhëzimet për rivendosjen e fjalëkalimit.',
            'message' => 'Instructions for password recovery have been sent if account exists.',
            'success' => true
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
     * Përditëso të dhënat e profilit të përdoruesit (Emri dhe Telefoni).
     * Roli dhe privilegjet mbrohen rreptësisht dhe nuk mund të ndryshohen nga ky funksion.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
        ], [
            'name.required' => 'Emri është i detyrueshëm.',
            'name.max' => 'Emri nuk mund të jetë më i gjatë se 255 karaktere.',
        ]);

        $user->name = trim($validated['name']);
        if ($request->has('phone')) {
            $user->phone = $validated['phone'];
        }
        $user->save();

        return response()->json([
            'mesazh' => 'Profili u përditësua me sukses.',
            'message' => 'Profile updated successfully.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
                'memberships' => $user->staffMemberships,
            ],
            'perdoruesi' => [
                'id' => $user->id,
                'emri' => $user->name,
                'email' => $user->email,
                'telefoni' => $user->phone,
                'roli' => $user->role,
                'anetaresime' => $user->staffMemberships,
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
