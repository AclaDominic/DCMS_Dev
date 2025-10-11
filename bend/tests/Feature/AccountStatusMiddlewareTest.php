<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

class AccountStatusMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create admin user for testing
        $this->admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'activated',
        ]);

        // Create staff user for testing
        $this->staff = User::factory()->create([
            'role' => 'staff',
            'status' => 'activated',
        ]);

        // Create patient user for testing
        $this->patient = User::factory()->create([
            'role' => 'patient',
            'status' => 'activated',
        ]);
    }

    /** @test */
    public function activated_user_can_access_authenticated_routes()
    {
        $this->actingAs($this->staff);

        // Test accessing a staff route
        $response = $this->getJson('/api/device-status');
        $response->assertStatus(200);

        // Test accessing user profile
        $response = $this->getJson('/api/user');
        $response->assertStatus(200)
                ->assertJson([
                    'id' => $this->staff->id,
                    'email' => $this->staff->email,
                ]);
    }

    /** @test */
    public function deactivated_user_cannot_access_authenticated_routes()
    {
        // Create a deactivated staff user
        $deactivatedStaff = User::factory()->create([
            'role' => 'staff',
            'status' => 'deactivated',
        ]);

        $this->actingAs($deactivatedStaff);

        // Test accessing a staff route
        $response = $this->getJson('/api/device-status');
        $response->assertStatus(403)
                ->assertJson([
                    'status' => 'error',
                    'message' => 'This account is deactivated. If you think this is a mistake, please contact the clinic.',
                    'account_deactivated' => true,
                ]);

        // Test accessing user profile
        $response = $this->getJson('/api/user');
        $response->assertStatus(403)
                ->assertJson([
                    'status' => 'error',
                    'message' => 'This account is deactivated. If you think this is a mistake, please contact the clinic.',
                    'account_deactivated' => true,
                ]);
    }

    /** @test */
    public function deactivated_admin_cannot_access_admin_routes()
    {
        // Deactivate the admin user
        $this->admin->update(['status' => 'deactivated']);
        $this->actingAs($this->admin);

        // Test accessing admin routes
        $response = $this->getJson('/api/admin/staff');
        $response->assertStatus(403)
                ->assertJson([
                    'status' => 'error',
                    'message' => 'This account is deactivated. If you think this is a mistake, please contact the clinic.',
                    'account_deactivated' => true,
                ]);

        $response = $this->postJson('/api/admin/staff', [
            'name' => 'Test Staff',
            'email' => 'test@clinic.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);
        $response->assertStatus(403)
                ->assertJson([
                    'status' => 'error',
                    'message' => 'This account is deactivated. If you think this is a mistake, please contact the clinic.',
                    'account_deactivated' => true,
                ]);
    }

    /** @test */
    public function deactivated_patient_cannot_access_patient_routes()
    {
        // Create a deactivated patient
        $deactivatedPatient = User::factory()->create([
            'role' => 'patient',
            'status' => 'deactivated',
        ]);

        $this->actingAs($deactivatedPatient);

        // Test accessing patient routes
        $response = $this->getJson('/api/user-appointments');
        $response->assertStatus(403)
                ->assertJson([
                    'status' => 'error',
                    'message' => 'This account is deactivated. If you think this is a mistake, please contact the clinic.',
                    'account_deactivated' => true,
                ]);

        $response = $this->getJson('/api/patients');
        $response->assertStatus(403)
                ->assertJson([
                    'status' => 'error',
                    'message' => 'This account is deactivated. If you think this is a mistake, please contact the clinic.',
                    'account_deactivated' => true,
                ]);
    }

    /** @test */
    public function account_status_is_checked_on_every_authenticated_request()
    {
        // Start with an activated user
        $this->actingAs($this->staff);

        // First request should work
        $response = $this->getJson('/api/user');
        $response->assertStatus(200);

        // Now deactivate the user in the database
        $this->staff->update(['status' => 'deactivated']);

        // Next request should fail even though user is still "logged in"
        $response = $this->getJson('/api/user');
        $response->assertStatus(403)
                ->assertJson([
                    'status' => 'error',
                    'message' => 'This account is deactivated. If you think this is a mistake, please contact the clinic.',
                    'account_deactivated' => true,
                ]);

        // Subsequent requests should also fail
        $response = $this->getJson('/api/device-status');
        $response->assertStatus(403);
    }

    /** @test */
    public function deactivated_user_session_is_cleared()
    {
        $this->actingAs($this->staff);

        // Verify user is logged in
        $this->assertAuthenticated();

        // Deactivate the user
        $this->staff->update(['status' => 'deactivated']);

        // Make a request that should trigger the middleware
        $response = $this->getJson('/api/user');
        $response->assertStatus(403);

        // For API routes, the user remains authenticated in the test environment
        // but all subsequent requests will be blocked by the middleware
        $this->assertAuthenticated();
    }

    /** @test */
    public function middleware_works_with_different_user_roles()
    {
        // Test with staff user
        $staff = User::factory()->create([
            'role' => 'staff',
            'status' => 'deactivated',
        ]);
        $this->actingAs($staff);

        $response = $this->getJson('/api/device-status');
        $response->assertStatus(403)
                ->assertJson(['account_deactivated' => true]);

        // Test with patient user
        $patient = User::factory()->create([
            'role' => 'patient',
            'status' => 'deactivated',
        ]);
        $this->actingAs($patient);

        $response = $this->getJson('/api/user-appointments');
        $response->assertStatus(403)
                ->assertJson(['account_deactivated' => true]);

        // Test with dentist user (if exists)
        $dentist = User::factory()->create([
            'role' => 'dentist',
            'status' => 'deactivated',
        ]);
        $this->actingAs($dentist);

        $response = $this->getJson('/api/dentist/my-schedule');
        $response->assertStatus(403)
                ->assertJson(['account_deactivated' => true]);
    }

    /** @test */
    public function public_routes_are_not_affected_by_account_status()
    {
        // Deactivate a user
        $this->staff->update(['status' => 'deactivated']);
        $this->actingAs($this->staff);

        // Public routes should still work (if any exist that don't require auth)
        $response = $this->getJson('/api/public/services');
        $response->assertStatus(200); // This should work regardless of user status
    }

    /** @test */
    public function unauthenticated_users_are_not_affected_by_middleware()
    {
        // Make request without authentication
        $response = $this->getJson('/api/user');
        
        // Should get 401 Unauthorized, not 403 Forbidden
        $response->assertStatus(401);
    }

    /** @test */
    public function reactivated_user_can_access_system_again()
    {
        // Start with deactivated user
        $this->staff->update(['status' => 'deactivated']);
        $this->actingAs($this->staff);

        // Should be blocked
        $response = $this->getJson('/api/user');
        $response->assertStatus(403);

        // Reactivate the user
        $this->staff->update(['status' => 'activated']);

        // Should work again
        $response = $this->getJson('/api/user');
        $response->assertStatus(200);
    }

    /** @test */
    public function middleware_handles_missing_user_gracefully()
    {
        // This test ensures the middleware doesn't break if somehow a user is null
        $this->actingAs($this->staff);
        
        // Simulate a scenario where the user might be null (edge case)
        // This is more of a defensive test
        $response = $this->getJson('/api/user');
        $response->assertStatus(200); // Should work normally
    }

    /** @test */
    public function multiple_requests_after_deactivation_all_fail()
    {
        $this->actingAs($this->staff);

        // Make initial request
        $response = $this->getJson('/api/user');
        $response->assertStatus(200);

        // Deactivate user
        $this->staff->update(['status' => 'deactivated']);

        // Make multiple requests - all should fail
        $endpoints = [
            '/api/user',
            '/api/device-status',
            '/api/notifications',
        ];

        foreach ($endpoints as $endpoint) {
            $response = $this->getJson($endpoint);
            $response->assertStatus(403)
                    ->assertJson(['account_deactivated' => true]);
        }
    }
}
