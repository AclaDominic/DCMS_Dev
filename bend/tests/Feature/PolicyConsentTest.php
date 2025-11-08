<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\ClinicWeeklySchedule;
use App\Models\DentistSchedule;
use App\Models\Patient;
use App\Models\PolicyHistory;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PolicyConsentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Ensure clinic is open every day for appointment booking tests
        for ($day = 0; $day <= 6; $day++) {
            ClinicWeeklySchedule::create([
                'weekday' => $day,
                'is_open' => true,
                'open_time' => '08:00',
                'close_time' => '17:00',
            ]);
        }

        DentistSchedule::create([
            'dentist_name' => 'Dr. Policy',
            'employment_type' => 'full_time',
            'status' => 'active',
            'dentist_code' => 'D-001',
            'email' => 'dr.policy@example.com',
            'sun' => true,
            'mon' => true,
            'tue' => true,
            'wed' => true,
            'thu' => true,
            'fri' => true,
            'sat' => true,
        ]);
    }

    protected function createActivePolicy(?string $effectiveDate = null): PolicyHistory
    {
        $policy = PolicyHistory::create([
            'privacy_policy' => 'Privacy details',
            'terms_conditions' => 'Terms details',
            'effective_date' => $effectiveDate ?? now()->toDateString(),
            'contact_email' => 'policy@example.com',
            'contact_phone' => '09171234567',
            'created_by' => null,
        ]);

        AppSetting::set('policy.active_history_id', $policy->id);
        AppSetting::set('policy.privacy_policy', $policy->privacy_policy);
        AppSetting::set('policy.terms_conditions', $policy->terms_conditions);
        AppSetting::set('policy.effective_date', $policy->effective_date);
        AppSetting::set('policy.contact_email', $policy->contact_email);
        AppSetting::set('policy.contact_phone', $policy->contact_phone);

        return $policy;
    }

    public function test_patient_can_view_policy_consent_state(): void
    {
        $policy = $this->createActivePolicy();

        $user = User::factory()->create([
            'role' => 'patient',
            'status' => 'activated',
        ]);

        Patient::factory()->create([
            'user_id' => $user->id,
            'is_linked' => true,
            'policy_history_id' => null,
            'policy_accepted_at' => null,
        ]);

        $response = $this->actingAs($user)->getJson('/api/policy/consent');

        $response->assertOk()
            ->assertJson([
                'needs_acceptance' => true,
                'accepted_policy_id' => null,
            ])
            ->assertJsonPath('active_policy.id', $policy->id);
    }

    public function test_patient_can_accept_latest_policy(): void
    {
        $policy = $this->createActivePolicy();

        $user = User::factory()->create([
            'role' => 'patient',
            'status' => 'activated',
        ]);

        $patient = Patient::factory()->create([
            'user_id' => $user->id,
            'is_linked' => true,
            'policy_history_id' => null,
            'policy_accepted_at' => null,
        ]);

        $response = $this->actingAs($user)->postJson('/api/policy/consent/accept');

        $response->assertOk()
            ->assertJson([
                'message' => 'Policy accepted successfully.',
                'accepted_policy_id' => $policy->id,
            ]);

        $patient->refresh();
        $this->assertSame($policy->id, $patient->policy_history_id);
        $this->assertNotNull($patient->policy_accepted_at);
    }

    public function test_new_appointments_are_blocked_until_policy_is_accepted(): void
    {
        $this->createActivePolicy();

        $user = User::factory()->create([
            'role' => 'patient',
            'status' => 'activated',
        ]);

        $patient = Patient::factory()->create([
            'user_id' => $user->id,
            'is_linked' => true,
            'policy_history_id' => null,
            'policy_accepted_at' => null,
        ]);

        $service = Service::factory()->create();

        $date = Carbon::now()->addDays(2)->toDateString();

        $payload = [
            'service_id' => $service->id,
            'date' => $date,
            'start_time' => '09:00',
            'payment_method' => 'cash',
        ];

        $response = $this->actingAs($user)->postJson('/api/appointment', $payload);

        $response->assertStatus(409)
            ->assertJson([
                'policy_acceptance_required' => true,
            ]);

        $this->assertDatabaseCount('appointments', 0);

        // Accept policy and ensure booking succeeds
        $this->actingAs($user)->postJson('/api/policy/consent/accept')->assertOk();

        $responseAfterAccept = $this->actingAs($user)->postJson('/api/appointment', $payload);

        $responseAfterAccept->assertCreated()
            ->assertJson([
                'message' => 'Appointment booked.',
            ]);
    }

    public function test_patient_must_reaccept_after_policy_update(): void
    {
        $initialPolicy = $this->createActivePolicy(now()->toDateString());

        $user = User::factory()->create([
            'role' => 'patient',
            'status' => 'activated',
        ]);

        $patient = Patient::factory()->create([
            'user_id' => $user->id,
            'is_linked' => true,
            'policy_history_id' => null,
            'policy_accepted_at' => null,
        ]);

        $service = Service::factory()->create();
        $initialDate = Carbon::now()->addDays(3)->toDateString();
        $initialPayload = [
            'service_id' => $service->id,
            'date' => $initialDate,
            'start_time' => '10:00',
            'payment_method' => 'cash',
        ];
        $postUpdatePayload = [
            'service_id' => $service->id,
            'date' => Carbon::now()->addDays(4)->toDateString(),
            'start_time' => '11:00',
            'payment_method' => 'cash',
        ];

        // Accept the initial policy
        $this->actingAs($user)->postJson('/api/policy/consent/accept')->assertOk();
        $patient->refresh();
        $this->assertSame($initialPolicy->id, $patient->policy_history_id);

        // Booking should now succeed
        $this->actingAs($user)->postJson('/api/appointment', $initialPayload)->assertCreated();
        $this->assertDatabaseCount('appointments', 1);

        // Create a new active policy version
        $newPolicy = $this->createActivePolicy(now()->addDay()->toDateString());
        $patient->refresh();
        $this->assertSame($initialPolicy->id, $patient->policy_history_id);

        // Attempt another booking - should be blocked until the new policy is accepted
        $blockedResponse = $this->actingAs($user)->postJson('/api/appointment', $postUpdatePayload);
        $blockedResponse->assertStatus(409)
            ->assertJson([
                'policy_acceptance_required' => true,
            ]);

        // Accept the updated policy and try again
        $this->actingAs($user)->postJson('/api/policy/consent/accept')->assertOk();
        $patient->refresh();
        $this->assertSame($newPolicy->id, $patient->policy_history_id);

        $this->actingAs($user)->postJson('/api/appointment', $postUpdatePayload)->assertCreated();
        $this->assertDatabaseCount('appointments', 2);
    }
}


