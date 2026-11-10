<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_kontrolli_i_shendetit_kthen_ok(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'ok',
                'app' => 'Tastio API',
            ]);
    }

    public function test_klienti_mund_te_regjistrohet(): void
    {
        $payload = [
            'name' => 'Besnik Gashi',
            'email' => 'besnik@tastio.com',
            'password' => 'fjalekalim1234',
            'password_confirmation' => 'fjalekalim1234',
            'phone' => '+38344111222',
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'user' => ['id', 'name', 'email', 'phone', 'role'],
                'token',
            ])
            ->assertJson([
                'user' => [
                    'email' => 'besnik@tastio.com',
                    'role' => 'customer',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'besnik@tastio.com',
            'role' => 'customer',
        ]);
    }

    public function test_perdoruesi_mund_te_kyqet_me_kredenciale_te_sakta(): void
    {
        $user = User::factory()->create([
            'email' => 'test@tastio.com',
            'password' => bcrypt('fjalekalim123'),
            'role' => 'customer',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'test@tastio.com',
            'password' => 'fjalekalim123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'user',
                'token',
            ]);
    }

    public function test_perdoruesi_nuk_mund_te_kyqet_me_kredenciale_te_gabuara(): void
    {
        $user = User::factory()->create([
            'email' => 'test2@tastio.com',
            'password' => bcrypt('fjalekalim_i_sakte'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'test2@tastio.com',
            'password' => 'fjalekalim_i_gabuar',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_perdoruesi_autentifikuar_mund_te_lexoje_profilin_dhe_te_ckyqet(): void
    {
        $user = User::factory()->create([
            'role' => 'customer',
        ]);

        $token = $user->createToken('token_test')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJson([
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                ],
            ]);

        $ckyqjaResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/auth/logout');

        $ckyqjaResponse->assertStatus(200);
    }
}
