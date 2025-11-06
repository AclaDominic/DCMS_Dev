<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Patient;
use App\Models\Service;
use App\Models\Appointment;
use App\Models\Payment;
use App\Models\RefundRequest;
use App\Models\RefundSetting;
use App\Models\ClinicWeeklySchedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Carbon\Carbon;

class AppointmentCancellationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create default refund settings
        RefundSetting::create([
            'cancellation_deadline_hours' => 24,
            'monthly_cancellation_limit' => 3,
            'create_zero_refund_request' => false,
            'reminder_days' => 5,
        ]);
        
        // Create clinic weekly schedule (Monday-Friday open, weekends closed)
        // This is needed for deadline calculation in RefundRequest
        for ($day = 1; $day <= 5; $day++) { // Monday to Friday
            ClinicWeeklySchedule::create([
                'weekday' => $day,
                'is_open' => true,
                'open_time' => '08:00',
                'close_time' => '17:00',
            ]);
        }
    }

    public function test_cancel_endpoint_stores_cancellation_reason_and_notes()
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'activated',
        ]);
        
        $patientUser = User::factory()->create(['role' => 'patient']);
        $patient = Patient::factory()->create(['user_id' => $patientUser->id]);
        
        $service = Service::factory()->create(['price' => 1500.00]);
        
        $appointment = Appointment::factory()->create([
            'patient_id' => $patient->id,
            'service_id' => $service->id,
            'status' => 'pending',
            'payment_method' => 'maya',
            'payment_status' => 'unpaid',
        ]);
        
        $response = $this->actingAs($admin)->postJson("/api/appointment/{$appointment->id}/cancel", [
            'cancellation_reason' => Appointment::CANCELLATION_REASON_CLINIC_CANCELLATION,
            'treatment_adjustment_notes' => 'Clinic closed due to emergency',
        ]);
        
        $response->assertStatus(200);
        
        $appointment->refresh();
        $this->assertEquals(Appointment::CANCELLATION_REASON_CLINIC_CANCELLATION, $appointment->cancellation_reason);
        $this->assertEquals('Clinic closed due to emergency', $appointment->treatment_adjustment_notes);
    }

    public function test_reject_endpoint_stores_cancellation_reason_defaults_to_health_safety()
    {
        $staff = User::factory()->create([
            'role' => 'staff',
            'status' => 'activated',
        ]);
        
        // Create approved device for staff (required by EnsureDeviceIsApproved middleware)
        $fingerprint = hash('sha256', '127.0.0.1|Symfony');
        \DB::table('staff_device')->insert([
            'user_id' => $staff->id,
            'device_fingerprint' => $fingerprint,
            'is_approved' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        $patientUser = User::factory()->create(['role' => 'patient']);
        $patient = Patient::factory()->create(['user_id' => $patientUser->id]);
        
        $service = Service::factory()->create(['price' => 1500.00]);
        
        $appointment = Appointment::factory()->create([
            'patient_id' => $patient->id,
            'service_id' => $service->id,
            'status' => 'pending',
        ]);
        
        $response = $this->actingAs($staff)->postJson("/api/appointments/{$appointment->id}/reject", [
            'note' => 'Patient has health concerns',
        ]);
        
        $response->assertStatus(200);
        
        $appointment->refresh();
        $this->assertEquals(Appointment::CANCELLATION_REASON_HEALTH_SAFETY_CONCERN, $appointment->cancellation_reason);
    }

    public function test_reject_endpoint_stores_treatment_adjustment_notes()
    {
        $staff = User::factory()->create([
            'role' => 'staff',
            'status' => 'activated',
        ]);
        
        // Create approved device for staff (required by EnsureDeviceIsApproved middleware)
        $fingerprint = hash('sha256', '127.0.0.1|Symfony');
        \DB::table('staff_device')->insert([
            'user_id' => $staff->id,
            'device_fingerprint' => $fingerprint,
            'is_approved' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        $patientUser = User::factory()->create(['role' => 'patient']);
        $patient = Patient::factory()->create(['user_id' => $patientUser->id]);
        
        $service = Service::factory()->create(['price' => 1500.00]);
        
        $appointment = Appointment::factory()->create([
            'patient_id' => $patient->id,
            'service_id' => $service->id,
            'status' => 'pending',
        ]);
        
        $response = $this->actingAs($staff)->postJson("/api/appointments/{$appointment->id}/reject", [
            'note' => 'Medical contraindication',
            'cancellation_reason' => Appointment::CANCELLATION_REASON_MEDICAL_CONTRAINDICATION,
            'treatment_adjustment_notes' => 'Patient has active infection, treatment postponed',
        ]);
        
        $response->assertStatus(200);
        
        $appointment->refresh();
        $this->assertEquals(Appointment::CANCELLATION_REASON_MEDICAL_CONTRAINDICATION, $appointment->cancellation_reason);
        $this->assertEquals('Patient has active infection, treatment postponed', $appointment->treatment_adjustment_notes);
    }

    public function test_validation_rejects_invalid_cancellation_reason()
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'activated',
        ]);
        
        $patientUser = User::factory()->create(['role' => 'patient']);
        $patient = Patient::factory()->create(['user_id' => $patientUser->id]);
        
        $service = Service::factory()->create(['price' => 1500.00]);
        
        $appointment = Appointment::factory()->create([
            'patient_id' => $patient->id,
            'service_id' => $service->id,
            'status' => 'pending',
        ]);
        
        $response = $this->actingAs($admin)->postJson("/api/appointment/{$appointment->id}/cancel", [
            'cancellation_reason' => 'invalid_reason',
        ]);
        
        $response->assertStatus(422);
    }

    public function test_refund_request_creation_includes_deadline_at()
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'activated',
        ]);
        
        $patientUser = User::factory()->create(['role' => 'patient']);
        $patient = Patient::factory()->create(['user_id' => $patientUser->id]);
        
        $service = Service::factory()->create(['price' => 1500.00]);
        
        $futureDate = Carbon::now()->addHours(25);
        $appointment = Appointment::factory()->create([
            'patient_id' => $patient->id,
            'service_id' => $service->id,
            'date' => $futureDate->format('Y-m-d'),
            'status' => 'approved',
            'payment_method' => 'maya',
            'payment_status' => 'paid',
        ]);
        
        $payment = Payment::factory()->create([
            'appointment_id' => $appointment->id,
            'method' => 'maya',
            'status' => Payment::STATUS_PAID,
            'amount_due' => 1500.00,
            'amount_paid' => 1500.00,
            'paid_at' => now(),
        ]);
        
        $this->actingAs($admin)->postJson("/api/appointment/{$appointment->id}/cancel");
        
        $refundRequest = RefundRequest::where('appointment_id', $appointment->id)->first();
        $this->assertNotNull($refundRequest);
        $this->assertNotNull($refundRequest->deadline_at);
        $this->assertTrue($refundRequest->deadline_at->isAfter($refundRequest->requested_at));
    }

    public function test_cancel_with_clinic_cancellation_reason_stores_correctly()
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'activated',
        ]);
        
        $patientUser = User::factory()->create(['role' => 'patient']);
        $patient = Patient::factory()->create(['user_id' => $patientUser->id]);
        
        $service = Service::factory()->create(['price' => 1500.00]);
        
        $appointment = Appointment::factory()->create([
            'patient_id' => $patient->id,
            'service_id' => $service->id,
            'status' => 'pending',
        ]);
        
        $response = $this->actingAs($admin)->postJson("/api/appointment/{$appointment->id}/cancel", [
            'cancellation_reason' => Appointment::CANCELLATION_REASON_CLINIC_CANCELLATION,
            'treatment_adjustment_notes' => 'Clinic maintenance scheduled',
        ]);
        
        $response->assertStatus(200);
        
        $appointment->refresh();
        $this->assertEquals(Appointment::CANCELLATION_REASON_CLINIC_CANCELLATION, $appointment->cancellation_reason);
        $this->assertEquals('Clinic maintenance scheduled', $appointment->treatment_adjustment_notes);
        $this->assertEquals('cancelled', $appointment->status);
    }
}

