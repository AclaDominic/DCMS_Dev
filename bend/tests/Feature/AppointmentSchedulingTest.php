<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\Appointment;
use App\Models\ClinicCalendar;
use App\Models\ClinicWeeklySchedule;
use App\Models\DentistSchedule;
use App\Models\Patient;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AppointmentSchedulingTest extends TestCase
{
    use RefreshDatabase;

    protected Carbon $bookingDate;
    protected Service $service;
    protected DentistSchedule $dentistA;
    protected DentistSchedule $dentistB;
    protected User $user;
    protected Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->bookingDate = Carbon::now()->addDays(2)->startOfDay();

        $this->setUpClinicSchedule($this->bookingDate);

        $this->dentistA = $this->createDentistSchedule('DENTA', 'Dentist A', $this->bookingDate);
        $this->dentistB = $this->createDentistSchedule('DENTB', 'Dentist B', $this->bookingDate);

        $this->service = Service::create([
            'name' => 'General Consultation',
            'description' => 'Basic check-up',
            'price' => 1000,
            'estimated_minutes' => 30,
            'per_teeth_service' => false,
            'is_special' => false,
            'is_excluded_from_analytics' => false,
            'per_tooth_minutes' => null,
        ]);

        $this->user = User::create([
            'name' => 'Test Patient',
            'email' => 'patient@example.test',
            'password' => Hash::make('password'),
            'role' => 'patient',
            'status' => 'activated',
            'email_verified_at' => now(),
        ]);
        $this->user->markEmailAsVerified();

        $this->patient = Patient::create([
            'user_id' => $this->user->id,
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'contact_number' => '09170000000',
            'is_linked' => true,
        ]);

        if ($activePolicyId = AppSetting::get('policy.active_history_id')) {
            $this->patient->update([
                'policy_history_id' => $activePolicyId,
                'policy_accepted_at' => now(),
            ]);
        }

        // Previous completed appointment with dentist A to establish preference.
        Appointment::create([
            'patient_id' => $this->patient->id,
            'service_id' => $this->service->id,
            'date' => $this->bookingDate->copy()->subDay()->toDateString(),
            'time_slot' => '10:00-10:30',
            'status' => 'completed',
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'reference_code' => Str::upper(Str::random(8)),
            'dentist_schedule_id' => $this->dentistA->id,
            'honor_preferred_dentist' => true,
        ]);
    }

    public function test_available_slots_excludes_busy_preferred_dentist_slot(): void
    {
        $this->createAppointmentForDentist($this->dentistA, '09:00-09:30');

        Sanctum::actingAs($this->user);

        $response = $this->getJson(sprintf(
            '/api/appointment/available-slots?date=%s&service_id=%d',
            $this->bookingDate->toDateString(),
            $this->service->id
        ));

        $this->assertSame(
            200,
            $response->status(),
            json_encode($response->json(), JSON_PRETTY_PRINT)
        );
        $payload = $response->json();

        $this->assertNotContains('09:00', $payload['slots']);
        $this->assertEquals($this->dentistA->id, $payload['metadata']['preferred_dentist_id']);
        $this->assertTrue($payload['metadata']['effective_honor_preferred_dentist']);
    }

    public function test_available_slots_allow_opt_out_when_preferred_dentist_is_busy(): void
    {
        $this->createAppointmentForDentist($this->dentistA, '09:00-09:30');

        Sanctum::actingAs($this->user);

        $response = $this->getJson(sprintf(
            '/api/appointment/available-slots?date=%s&service_id=%d&honor_preferred_dentist=0',
            $this->bookingDate->toDateString(),
            $this->service->id
        ));

        $this->assertSame(
            200,
            $response->status(),
            json_encode($response->json(), JSON_PRETTY_PRINT)
        );
        $payload = $response->json();

        $this->assertContains('09:00', $payload['slots']);
        $this->assertFalse($payload['metadata']['effective_honor_preferred_dentist']);
    }

    public function test_booking_assigns_preferred_dentist_when_honoring_preference(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson('/api/appointment', [
            'service_id' => $this->service->id,
            'date' => $this->bookingDate->toDateString(),
            'start_time' => '10:30',
            'payment_method' => 'cash',
        ]);

        $this->assertSame(
            201,
            $response->status(),
            json_encode($response->json(), JSON_PRETTY_PRINT)
        );

        $appointment = Appointment::latest()->first();
        $this->assertEquals($this->dentistA->id, $appointment->dentist_schedule_id);
        $this->assertTrue($appointment->honor_preferred_dentist);
    }

    public function test_booking_opt_out_assigns_alternate_dentist_when_available(): void
    {
        $this->createAppointmentForDentist($this->dentistA, '09:00-09:30');

        Sanctum::actingAs($this->user);

        $response = $this->postJson('/api/appointment', [
            'service_id' => $this->service->id,
            'date' => $this->bookingDate->toDateString(),
            'start_time' => '09:00',
            'payment_method' => 'cash',
            'honor_preferred_dentist' => false,
        ]);

        $this->assertSame(
            201,
            $response->status(),
            json_encode($response->json(), JSON_PRETTY_PRINT)
        );

        $appointment = Appointment::where('date', $this->bookingDate->toDateString())
            ->where('patient_id', $this->patient->id)
            ->where('time_slot', '09:00-09:30')
            ->latest()
            ->first();

        $this->assertNotNull($appointment);
        $this->assertFalse($appointment->honor_preferred_dentist);
        $this->assertEquals($this->dentistB->id, $appointment->dentist_schedule_id);
    }

    public function test_capacity_override_blocks_slot_even_with_multiple_dentists(): void
    {
        ClinicCalendar::create([
            'date' => $this->bookingDate->toDateString(),
            'is_open' => true,
            'open_time' => '09:00',
            'close_time' => '17:00',
            'max_per_block_override' => 1,
        ]);

        $this->createAppointmentForDentist($this->dentistA, '09:00-09:30');

        Sanctum::actingAs($this->user);

        $response = $this->getJson(sprintf(
            '/api/appointment/available-slots?date=%s&service_id=%d&honor_preferred_dentist=0',
            $this->bookingDate->toDateString(),
            $this->service->id
        ));

        $this->assertSame(
            200,
            $response->status(),
            json_encode($response->json(), JSON_PRETTY_PRINT)
        );
        $payload = $response->json();

        $this->assertNotContains('09:00', $payload['slots']);
    }

    public function test_available_services_metadata_includes_highlight_information(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->getJson(sprintf(
            '/api/appointment/available-services?date=%s&with_meta=1',
            $this->bookingDate->toDateString()
        ));

        $this->assertSame(
            200,
            $response->status(),
            json_encode($response->json(), JSON_PRETTY_PRINT)
        );
        $response->assertJsonStructure([
            'services',
            'metadata' => [
                'preferred_dentist',
                'preferred_dentist_present',
                'highlight_dates',
                'highlight_note',
            ],
        ]);

        $metadata = $response->json('metadata');

        $this->assertEquals($this->dentistA->id, $metadata['preferred_dentist']['id']);
        $this->assertIsArray($metadata['highlight_dates']);
        $this->assertNotEmpty($metadata['highlight_dates']);
    }

    protected function setUpClinicSchedule(Carbon $date): void
    {
        ClinicWeeklySchedule::create([
            'weekday' => $date->dayOfWeek,
            'is_open' => true,
            'open_time' => '09:00',
            'close_time' => '17:00',
        ]);
    }

    protected function createDentistSchedule(string $code, string $name, Carbon $date): DentistSchedule
    {
        $days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        $scheduleFlags = array_fill_keys($days, false);
        $scheduleFlags[strtolower($date->format('D'))] = true;

        return DentistSchedule::create(array_merge($scheduleFlags, [
            'dentist_code' => $code,
            'dentist_name' => $name,
            'employment_type' => 'full_time',
            'status' => 'active',
            'email' => strtolower($code) . '@example.test',
            'is_pseudonymous' => false,
        ]));
    }

    protected function createAppointmentForDentist(
        DentistSchedule $dentist,
        string $timeSlot,
        string $status = 'approved',
        ?Carbon $date = null,
        ?Patient $patient = null
    ): Appointment {
        $patient ??= Patient::create([
            'first_name' => 'Temp',
            'last_name' => Str::upper(Str::random(4)),
            'contact_number' => null,
            'is_linked' => false,
        ]);

        return Appointment::create([
            'patient_id' => $patient->id,
            'service_id' => $this->service->id,
            'date' => ($date ?? $this->bookingDate)->toDateString(),
            'time_slot' => $timeSlot,
            'status' => $status,
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'reference_code' => Str::upper(Str::random(8)),
            'dentist_schedule_id' => $dentist->id,
            'honor_preferred_dentist' => true,
        ]);
    }
}

