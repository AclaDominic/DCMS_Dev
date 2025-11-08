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
use App\Services\RefundCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;
use Carbon\Carbon;

class RefundFlowTest extends TestCase
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

        Mail::fake();
        }
    }

    /**
     * Scenario 1: Admin Cancellation with Close Appointment Date
     * - Create Maya payment appointment
     * - Approve appointment
     * - Set appointment date to today (within cancellation deadline)
     * - Admin cancels appointment
     * - Verify refund request is created with full refund (cancellation_fee = 0)
     * - Verify refund amount = original amount
     * - Test refund approval workflow
     * - Test marking refund as processed
     * - Verify payment status updates
     */
    public function test_admin_cancellation_with_close_appointment_date()
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'activated',
            'email' => 'admin@gmail.com',
        ]);
        
        $patientUser = User::factory()->create([
            'role' => 'patient',
            'email' => 'juan.patient@gmail.com',
        ]);
        $patient = Patient::factory()->create(['user_id' => $patientUser->id]);
        
        $service = Service::factory()->create(['price' => 1500.00]);
        
        $futureDate = Carbon::now()->addHours(25);
        $appointment = Appointment::factory()->create([
            'patient_id' => $patient->id,
            'service_id' => $service->id,
            'date' => $futureDate->format('Y-m-d'),
            'time_slot' => $futureDate->format('H:i') . '-15:00',
            'status' => 'pending',
            'payment_method' => 'maya',
            'payment_status' => 'unpaid',
        ]);
        
        $payment = Payment::factory()->create([
            'appointment_id' => $appointment->id,
            'method' => 'maya',
            'status' => Payment::STATUS_PAID,
            'amount_due' => 1500.00,
            'amount_paid' => 1500.00,
            'paid_at' => now(),
        ]);
        
        $this->actingAs($admin)->postJson("/api/appointments/{$appointment->id}/approve");
        
        $appointment->update(['payment_status' => 'paid']);
        
        $response = $this->actingAs($admin)->postJson("/api/appointment/{$appointment->id}/cancel");
        
        $response->assertStatus(200);
        $response->assertJson(['message' => 'Appointment canceled.']);
        
        $appointment->refresh();
        $this->assertEquals(Appointment::CANCELLATION_REASON_ADMIN_CANCELLATION, $appointment->cancellation_reason);
        
        $refundRequest = RefundRequest::where('appointment_id', $appointment->id)->first();
        $this->assertNotNull($refundRequest);
        
        $this->assertEquals(1500.00, $refundRequest->original_amount);
        $this->assertEquals(0.00, $refundRequest->cancellation_fee);
        $this->assertEquals(1500.00, $refundRequest->refund_amount);
        $this->assertEquals(RefundRequest::STATUS_PENDING, $refundRequest->status);
        $this->assertEquals('Cancelled by admin', $refundRequest->reason);
        
        $this->assertNotNull($refundRequest->deadline_at);
        $this->assertInstanceOf(\Carbon\Carbon::class, $refundRequest->deadline_at);
        
        $approveResponse = $this->actingAs($admin)->postJson("/api/admin/refund-requests/{$refundRequest->id}/approve", [
            'admin_notes' => 'Approved for full refund',
        ]);
        
        $approveResponse->assertStatus(200);
        $refundRequest->refresh();
        $this->assertEquals(RefundRequest::STATUS_APPROVED, $refundRequest->status);
        $this->assertNotNull($refundRequest->approved_at);
        
        $processResponse = $this->actingAs($admin)->postJson("/api/admin/refund-requests/{$refundRequest->id}/process", [
            'admin_notes' => 'Refund processed manually',
        ]);
        
        $processResponse->assertStatus(200);
        $refundRequest->refresh();
        $this->assertEquals(RefundRequest::STATUS_PROCESSED, $refundRequest->status);
        $this->assertNotNull($refundRequest->processed_at);
        $this->assertEquals($admin->id, $refundRequest->processed_by);

        $completeResponse = $this->actingAs($admin)->postJson("/api/admin/refund-requests/{$refundRequest->id}/complete", [
            'admin_notes' => 'Patient confirmed receipt',
        ]);

        $completeResponse->assertStatus(200);
        $refundRequest->refresh();
        $this->assertEquals(RefundRequest::STATUS_COMPLETED, $refundRequest->status);
        $this->assertNotNull($refundRequest->completed_at);
        
        $payment->refresh();
        $this->assertEquals(Payment::STATUS_REFUNDED, $payment->status);
        $this->assertNotNull($payment->refunded_at);
    }

    /**
     * Scenario 2a: Patient Cancellation within Deadline (should get full refund)
     */
    public function test_patient_cancellation_within_deadline_full_refund()
    {
        $patientUser = User::factory()->create([
            'role' => 'patient',
            'email' => 'juan.patient@gmail.com',
        ]);
        $patient = Patient::factory()->create(['user_id' => $patientUser->id]);
        
        $service = Service::factory()->create(['price' => 2000.00]);
        
        $futureDate = Carbon::now()->addHours(25);
        $appointment = Appointment::factory()->create([
            'patient_id' => $patient->id,
            'service_id' => $service->id,
            'date' => $futureDate->format('Y-m-d'),
            'time_slot' => $futureDate->format('H:i') . '-15:00',
            'status' => 'approved',
            'payment_method' => 'maya',
            'payment_status' => 'paid',
        ]);
        
        $payment = Payment::factory()->create([
            'appointment_id' => $appointment->id,
            'method' => 'maya',
            'status' => Payment::STATUS_PAID,
            'amount_due' => 2000.00,
            'amount_paid' => 2000.00,
            'paid_at' => now(),
        ]);
        
        $response = $this->actingAs($patientUser)->postJson("/api/appointment/{$appointment->id}/cancel");
        
        $response->assertStatus(200);
        
        $appointment->refresh();
        $this->assertEquals(Appointment::CANCELLATION_REASON_PATIENT_REQUEST, $appointment->cancellation_reason);
        
        $refundRequest = RefundRequest::where('appointment_id', $appointment->id)->first();
        $this->assertNotNull($refundRequest);
        $this->assertEquals(2000.00, $refundRequest->original_amount);
        $this->assertEquals(0.00, $refundRequest->cancellation_fee);
        $this->assertEquals(2000.00, $refundRequest->refund_amount);
        $this->assertEquals('Cancelled by patient', $refundRequest->reason);
        
        $this->assertNotNull($refundRequest->deadline_at);
    }

    /**
     * Scenario 2b: Patient Cancellation after Deadline (should have cancellation fee)
     */
    public function test_patient_cancellation_after_deadline_partial_refund()
    {
        $patientUser = User::factory()->create([
            'role' => 'patient',
            'email' => 'juan.patient@gmail.com',
        ]);
        $patient = Patient::factory()->create(['user_id' => $patientUser->id]);
        
        $service = Service::factory()->create([
            'price' => 2000.00,
            'cancellation_fee' => 400.00,
        ]);
        
        $appointment = Appointment::factory()->create([
            'patient_id' => $patient->id,
            'service_id' => $service->id,
            'date' => Carbon::today()->format('Y-m-d'),
            'status' => 'approved',
            'payment_method' => 'maya',
            'payment_status' => 'paid',
        ]);
        
        $payment = Payment::factory()->create([
            'appointment_id' => $appointment->id,
            'method' => 'maya',
            'status' => Payment::STATUS_PAID,
            'amount_due' => 2000.00,
            'amount_paid' => 2000.00,
            'paid_at' => now(),
        ]);
        
        $response = $this->actingAs($patientUser)->postJson("/api/appointment/{$appointment->id}/cancel");
        
        $response->assertStatus(200);
        
        $appointment->refresh();
        $this->assertEquals(Appointment::CANCELLATION_REASON_PATIENT_REQUEST, $appointment->cancellation_reason);
        
        $refundRequest = RefundRequest::where('appointment_id', $appointment->id)->first();
        $this->assertNotNull($refundRequest);
        $this->assertEquals(2000.00, $refundRequest->original_amount);
        $this->assertEquals(400.00, $refundRequest->cancellation_fee);
        $this->assertEquals(1600.00, $refundRequest->refund_amount);
        
        $this->assertNotNull($refundRequest->deadline_at);
        
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'activated',
            'email' => 'admin@gmail.com',
        ]);
        
        $approveResponse = $this->actingAs($admin)->postJson("/api/admin/refund-requests/{$refundRequest->id}/approve");
        $approveResponse->assertStatus(200);
        $refundRequest->refresh();
        $this->assertEquals(RefundRequest::STATUS_APPROVED, $refundRequest->status);
        
        $this->actingAs($admin)->postJson("/api/admin/refund-requests/{$refundRequest->id}/process");
        $refundRequest->refresh();
        $this->assertEquals(RefundRequest::STATUS_PROCESSED, $refundRequest->status);
        
        $payment->refresh();
        $this->assertEquals(Payment::STATUS_REFUNDED, $payment->status);
    }

    /**
     * Scenario 3: Clinic Cancellation creates full refund regardless of deadline
     */
    public function test_clinic_cancellation_creates_full_refund_regardless_of_deadline()
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'activated',
            'email' => 'admin@gmail.com',
        ]);
        
        $patientUser = User::factory()->create([
            'role' => 'patient',
            'email' => 'juan.patient@gmail.com',
        ]);
        $patient = Patient::factory()->create(['user_id' => $patientUser->id]);
        
        $service = Service::factory()->create([
            'price' => 2000.00,
            'cancellation_fee' => 400.00,
        ]);
        
        $appointment = Appointment::factory()->create([
            'patient_id' => $patient->id,
            'service_id' => $service->id,
            'date' => Carbon::today()->format('Y-m-d'),
            'status' => 'approved',
            'payment_method' => 'maya',
            'payment_status' => 'paid',
        ]);
        
        $payment = Payment::factory()->create([
            'appointment_id' => $appointment->id,
            'method' => 'maya',
            'status' => Payment::STATUS_PAID,
            'amount_due' => 2000.00,
            'amount_paid' => 2000.00,
            'paid_at' => now(),
        ]);
        
        $response = $this->actingAs($admin)->postJson("/api/appointment/{$appointment->id}/cancel", [
            'cancellation_reason' => Appointment::CANCELLATION_REASON_CLINIC_CANCELLATION,
        ]);
        
        $response->assertStatus(200);
        
        $appointment->refresh();
        $this->assertEquals(Appointment::CANCELLATION_REASON_CLINIC_CANCELLATION, $appointment->cancellation_reason);
        
        $refundRequest = RefundRequest::where('appointment_id', $appointment->id)->first();
        $this->assertNotNull($refundRequest);
        $this->assertEquals(2000.00, $refundRequest->original_amount);
        $this->assertEquals(0.00, $refundRequest->cancellation_fee);
        $this->assertEquals(2000.00, $refundRequest->refund_amount);
        
        $this->assertNotNull($refundRequest->deadline_at);
    }

    public function test_clinic_closure_creates_refund_request_for_paid_maya_appointments(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'activated',
            'email' => 'admin@gmail.com',
        ]);

        $patientUser = User::factory()->create([
            'role' => 'patient',
            'email' => 'juan.patient@gmail.com',
        ]);
        $patient = Patient::factory()->create(['user_id' => $patientUser->id]);

        $service = Service::factory()->create(['price' => 1800.00]);

        $closureDate = Carbon::now()->addDays(3)->toDateString();

        $appointment = Appointment::factory()->create([
            'patient_id' => $patient->id,
            'service_id' => $service->id,
            'date' => $closureDate,
            'time_slot' => '09:00-09:30',
            'status' => 'approved',
            'payment_method' => 'maya',
            'payment_status' => Payment::STATUS_PAID,
        ]);

        Payment::factory()->create([
            'appointment_id' => $appointment->id,
            'method' => 'maya',
            'status' => Payment::STATUS_PAID,
            'amount_due' => 1800.00,
            'amount_paid' => 1800.00,
            'paid_at' => now(),
        ]);

        $response = $this->actingAs($admin)->putJson("/api/clinic-calendar/{$closureDate}/closure", [
            'closed' => true,
            'message' => 'Typhoon signal level 3',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'message' => 'Clinic closure updated.',
            'auto_rejected' => 1,
            'refund_requests_created' => 1,
        ]);

        $appointment->refresh();

        $this->assertEquals('cancelled', $appointment->status);
        $this->assertEquals(Appointment::CANCELLATION_REASON_CLINIC_CANCELLATION, $appointment->cancellation_reason);
        $this->assertStringContainsString('Auto-cancelled due to clinic closure', $appointment->notes);
        $this->assertEquals(Payment::STATUS_PAID, $appointment->payment_status);

        $refundRequest = RefundRequest::where('appointment_id', $appointment->id)->first();

        $this->assertNotNull($refundRequest);
        $this->assertEquals(1800.00, $refundRequest->original_amount);
        $this->assertEquals(0.00, $refundRequest->cancellation_fee);
        $this->assertEquals(1800.00, $refundRequest->refund_amount);
        $this->assertEquals('Auto-cancelled due to clinic closure ' . $closureDate . ' — Typhoon signal level 3', $refundRequest->reason);
        $this->assertEquals(RefundRequest::STATUS_PENDING, $refundRequest->status);
    }
}

