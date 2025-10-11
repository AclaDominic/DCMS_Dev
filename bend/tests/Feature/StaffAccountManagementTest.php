<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

class StaffAccountManagementTest extends TestCase
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
    }

    /** @test */
    public function admin_can_create_staff_account()
    {
        $this->actingAs($this->admin);

        $staffData = [
            'name' => 'John Doe',
            'email' => 'john@clinic.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ];

        $response = $this->postJson('/api/admin/staff', $staffData);

        $response->assertStatus(200)
                ->assertJson([
                    'message' => 'Staff account created successfully.',
                ]);

        $this->assertDatabaseHas('users', [
            'name' => 'John Doe',
            'email' => 'john@clinic.com',
            'role' => 'staff',
            'status' => 'activated',
        ]);
    }

    /** @test */
    public function created_staff_account_has_activated_status_by_default()
    {
        $this->actingAs($this->admin);

        $staffData = [
            'name' => 'Jane Smith',
            'email' => 'jane@clinic.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ];

        $response = $this->postJson('/api/admin/staff', $staffData);

        $response->assertStatus(200);

        $staff = User::where('email', 'jane@clinic.com')->first();
        $this->assertEquals('activated', $staff->status);
        $this->assertTrue($staff->isActivated());
        $this->assertFalse($staff->isDeactivated());
    }

    /** @test */
    public function admin_can_view_staff_accounts_with_pagination()
    {
        $this->actingAs($this->admin);

        // Create multiple staff accounts
        User::factory()->count(15)->create([
            'role' => 'staff',
            'status' => 'activated',
        ]);

        $response = $this->getJson('/api/admin/staff');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        '*' => ['id', 'name', 'email', 'role', 'status', 'created_at']
                    ],
                    'current_page',
                    'last_page',
                    'per_page',
                    'total',
                ]);

        // Should have 10 items per page by default
        $this->assertCount(10, $response->json('data'));
    }

    /** @test */
    public function admin_can_search_staff_accounts()
    {
        $this->actingAs($this->admin);

        // Create staff with specific names
        User::factory()->create([
            'role' => 'staff',
            'name' => 'John Smith',
            'email' => 'john@clinic.com',
        ]);

        User::factory()->create([
            'role' => 'staff',
            'name' => 'Jane Doe',
            'email' => 'jane@clinic.com',
        ]);

        // Search by name
        $response = $this->getJson('/api/admin/staff?search=John');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('John Smith', $response->json('data.0.name'));

        // Search by email
        $response = $this->getJson('/api/admin/staff?search=jane@clinic.com');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('Jane Doe', $response->json('data.0.name'));
    }

    /** @test */
    public function admin_can_toggle_staff_account_status()
    {
        $this->actingAs($this->admin);

        // Create staff account
        $staff = User::factory()->create([
            'role' => 'staff',
            'status' => 'activated',
        ]);

        // Deactivate account
        $response = $this->postJson("/api/admin/staff/{$staff->id}/toggle-status");

        $response->assertStatus(200)
                ->assertJson([
                    'message' => 'Staff account deactivated successfully.',
                ]);

        $staff->refresh();
        $this->assertEquals('deactivated', $staff->status);
        $this->assertTrue($staff->isDeactivated());

        // Reactivate account
        $response = $this->postJson("/api/admin/staff/{$staff->id}/toggle-status");

        $response->assertStatus(200)
                ->assertJson([
                    'message' => 'Staff account activated successfully.',
                ]);

        $staff->refresh();
        $this->assertEquals('activated', $staff->status);
        $this->assertTrue($staff->isActivated());
    }

    /** @test */
    public function admin_can_view_specific_staff_account()
    {
        $this->actingAs($this->admin);

        $staff = User::factory()->create([
            'role' => 'staff',
            'status' => 'activated',
        ]);

        $response = $this->getJson("/api/admin/staff/{$staff->id}");

        $response->assertStatus(200)
                ->assertJson([
                    'id' => $staff->id,
                    'name' => $staff->name,
                    'email' => $staff->email,
                    'role' => 'staff',
                    'status' => 'activated',
                ]);
    }

    /** @test */
    public function deactivated_staff_cannot_login()
    {
        // Create deactivated staff account
        $staff = User::factory()->create([
            'role' => 'staff',
            'status' => 'deactivated',
            'password' => Hash::make('password123'),
        ]);

        $loginData = [
            'email' => $staff->email,
            'password' => 'password123',
        ];

        $response = $this->postJson('/api/login', $loginData);

        $response->assertStatus(403)
                ->assertJson([
                    'status' => 'error',
                    'message' => 'This account is deactivated. If you think this is a mistake, please contact the clinic.',
                ]);
    }

    /** @test */
    public function activated_staff_can_login_normally()
    {
        // Create activated staff account
        $staff = User::factory()->create([
            'role' => 'staff',
            'status' => 'activated',
            'password' => Hash::make('password123'),
        ]);

        $loginData = [
            'email' => $staff->email,
            'password' => 'password123',
        ];

        $response = $this->postJson('/api/login', $loginData);

        $response->assertStatus(200)
                ->assertJson([
                    'status' => 'success',
                    'message' => 'Login successful.',
                ]);
    }

    /** @test */
    public function non_admin_cannot_access_staff_management_endpoints()
    {
        $staff = User::factory()->create([
            'role' => 'staff',
            'status' => 'activated',
        ]);

        $this->actingAs($staff);

        // Try to create staff account
        $response = $this->postJson('/api/admin/staff', [
            'name' => 'Test Staff',
            'email' => 'test@clinic.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(403);

        // Try to view staff accounts
        $response = $this->getJson('/api/admin/staff');
        $response->assertStatus(403);

        // Try to toggle status
        $response = $this->postJson("/api/admin/staff/{$this->admin->id}/toggle-status");
        $response->assertStatus(403);
    }

    /** @test */
    public function staff_account_creation_requires_valid_data()
    {
        $this->actingAs($this->admin);

        // Test with missing name
        $response = $this->postJson('/api/admin/staff', [
            'email' => 'test@clinic.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['name']);

        // Test with invalid email
        $response = $this->postJson('/api/admin/staff', [
            'name' => 'Test Staff',
            'email' => 'invalid-email',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['email']);

        // Test with password mismatch
        $response = $this->postJson('/api/admin/staff', [
            'name' => 'Test Staff',
            'email' => 'test@clinic.com',
            'password' => 'password123',
            'password_confirmation' => 'different-password',
        ]);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['password']);
    }

    /** @test */
    public function cannot_create_duplicate_staff_email()
    {
        $this->actingAs($this->admin);

        // Create existing staff
        User::factory()->create([
            'role' => 'staff',
            'email' => 'existing@clinic.com',
        ]);

        // Try to create another staff with same email
        $response = $this->postJson('/api/admin/staff', [
            'name' => 'Another Staff',
            'email' => 'existing@clinic.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['email']);
    }
}
