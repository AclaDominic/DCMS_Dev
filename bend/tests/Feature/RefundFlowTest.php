<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Patient;
use App\Models\Service;
use App\Models\Appointment;
use App\Models\Payment;
use App\Models\RefundRequest;
use App\Models\RefundSetting;
use App\Services\RefundCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
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
        // Create admin user with activated status
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'activated',
        ]);
        
        // Create patient and user
        $patientUser = User::factory()->create(['role' => 'patient']);
        $patient = Patient::factory()->create(['user_id' => $patientUser->id]);
        
        // Create service
        $service = Service::factory()->create(['price' => 1500.00]);
        
        // Create appointment with Maya payment
        // Set appointment to 25+ hours from now to be within 24-hour deadline
        $futureDate = Carbon::now()->addHours(25);
        $appointment = Appointment::factory()->create([
            'patient_id' => $patient->id,
            'service_id' => $service->id,
            'date' => $futureDate->format('Y-m-d'),
            'time_slot' => $futureDate->format('H:i') . '-15:00', // Use the future time
            'status' => 'pending',
            'payment_method' => 'maya',
            'payment_status' => 'unpaid',
        ]);
        
        // Create Maya payment
        $payment = Payment::factory()->create([
            'appointment_id' => $appointment->id,
            'method' => 'maya',
            'status' => Payment::STATUS_PAID,
            'amount_due' => 1500.00,
            'amount_paid' => 1500.00,
            'paid_at' => now(),
        ]);
        
        // Approve appointment
        $this->actingAs($admin)->postJson("/api/appointments/{$appointment->id}/approve");
        
        // Update appointment payment status to paid
        $appointment->update(['payment_status' => 'paid']);
        
        // Admin cancels appointment
        $response = $this->actingAs($admin)->postJson("/api/appointment/{$appointment->id}/cancel");
        
        $response->assertStatus(200);
        $response->assertJson(['message' => 'Appointment canceled.']);
        
        // Verify refund request was created
        $refundRequest = RefundRequest::where('appointment_id', $appointment->id)->first();
        $this->assertNotNull($refundRequest);
        
        // Verify full refund (within deadline, cancellation_fee = 0)
        $this->assertEquals(1500.00, $refundRequest->original_amount);
        $this->assertEquals(0.00, $refundRequest->cancellation_fee);
        $this->assertEquals(1500.00, $refundRequest->refund_amount);
        $this->assertEquals(RefundRequest::STATUS_PENDING, $refundRequest->status);
        $this->assertEquals('Cancelled by admin', $refundRequest->reason);
        
        // Verify refund request exists
        $this->assertNotNull($refundRequest->id);
        
        // Test refund approval workflow
        $approveResponse = $this->actingAs($admin)->postJson("/api/admin/refund-requests/{$refundRequest->id}/approve", [
            'admin_notes' => 'Approved for full refund',
        ]);
        
        $approveResponse->assertStatus(200);
        $refundRequest->refresh();
        $this->assertEquals(RefundRequest::STATUS_APPROVED, $refundRequest->status);
        $this->assertNotNull($refundRequest->approved_at);
        
        // Test marking refund as processed
        $processResponse = $this->actingAs($admin)->postJson("/api/admin/refund-requests/{$refundRequest->id}/process", [
            'admin_notes' => 'Refund processed manually',
        ]);
        
        $processResponse->assertStatus(200);
        $refundRequest->refresh();
        $this->assertEquals(RefundRequest::STATUS_PROCESSED, $refundRequest->status);
        $this->assertNotNull($refundRequest->processed_at);
        $this->assertEquals($admin->id, $refundRequest->processed_by);
        
        // Verify payment status updated to refunded
        $payment->refresh();
        $this->assertEquals(Payment::STATUS_REFUNDED, $payment->status);
        $this->assertNotNull($payment->refunded_at);
    }

    /**
     * Scenario 2a: Patient Cancellation within Deadline (should get full refund)
     */
    public function test_patient_cancellation_within_deadline_full_refund()
    {
        // Create patient and user
        $patientUser = User::factory()->create(['role' => 'patient']);
        $patient = Patient::factory()->create(['user_id' => $patientUser->id]);
        
        // Create service
        $service = Service::factory()->create(['price' => 2000.00]);
        
        // Create appointment with date 25+ hours from now (within 24-hour deadline)
        $futureDate = Carbon::now()->addHours(25);
        $appointment = Appointment::factory()->create([
            'patient_id' => $patient->id,
            'service_id' => $service->id,
            'date' => $futureDate->format('Y-m-d'),
            'time_slot' => $futureDate->format('H:i') . '-15:00', // Use the future time
            'status' => 'approved',
            'payment_method' => 'maya',
            'payment_status' => 'paid',
        ]);
        
        // Create Maya payment
        $payment = Payment::factory()->create([
            'appointment_id' => $appointment->id,
            'method' => 'maya',
            'status' => Payment::STATUS_PAID,
            'amount_due' => 2000.00,
            'amount_paid' => 2000.00,
            'paid_at' => now(),
        ]);
        
        // Patient cancels appointment
        $response = $this->actingAs($patientUser)->postJson("/api/appointment/{$appointment->id}/cancel");
        
        $response->assertStatus(200);
        
        // Verify refund request was created with full refund
        $refundRequest = RefundRequest::where('appointment_id', $appointment->id)->first();
        $this->assertNotNull($refundRequest);
        $this->assertEquals(2000.00, $refundRequest->original_amount);
        $this->assertEquals(0.00, $refundRequest->cancellation_fee);
        $this->assertEquals(2000.00, $refundRequest->refund_amount);
        $this->assertEquals('Cancelled by patient', $refundRequest->reason);
    }

    /**
     * Scenario 2b: Patient Cancellation after Deadline (should have cancellation fee)
     */
    public function test_patient_cancellation_after_deadline_partial_refund()
    {
        // Create patient and user
        $patientUser = User::factory()->create(['role' => 'patient']);
        $patient = Patient::factory()->create(['user_id' => $patientUser->id]);
        
        // Create service with cancellation fee
        $service = Service::factory()->create([
            'price' => 2000.00,
            'cancellation_fee' => 400.00,
        ]);
        
        // Create appointment with date today (past deadline)
        $appointment = Appointment::factory()->create([
            'patient_id' => $patient->id,
            'service_id' => $service->id,
            'date' => Carbon::today()->format('Y-m-d'),
            'status' => 'approved',
            'payment_method' => 'maya',
            'payment_status' => 'paid',
        ]);
        
        // Create Maya payment
        $payment = Payment::factory()->create([
            'appointment_id' => $appointment->id,
            'method' => 'maya',
            'status' => Payment::STATUS_PAID,
            'amount_due' => 2000.00,
            'amount_paid' => 2000.00,
            'paid_at' => now(),
        ]);
        
        // Patient cancels appointment
        $response = $this->actingAs($patientUser)->postJson("/api/appointment/{$appointment->id}/cancel");
        
        $response->assertStatus(200);
        
        // Verify refund request was created with cancellation fee
        $refundRequest = RefundRequest::where('appointment_id', $appointment->id)->first();
        $this->assertNotNull($refundRequest);
        $this->assertEquals(2000.00, $refundRequest->original_amount);
        $this->assertEquals(400.00, $refundRequest->cancellation_fee);
        $this->assertEquals(1600.00, $refundRequest->refund_amount);
        
        // Test refund approval and processing workflow
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'activated',
        ]);
        
        // Approve refund
        $approveResponse = $this->actingAs($admin)->postJson("/api/admin/refund-requests/{$refundRequest->id}/approve");
        $approveResponse->assertStatus(200);
        $refundRequest->refresh();
        $this->assertEquals(RefundRequest::STATUS_APPROVED, $refundRequest->status);
        
        // Process refund
        $this->actingAs($admin)->postJson("/api/admin/refund-requests/{$refundRequest->id}/process");
        $refundRequest->refresh();
        $this->assertEquals(RefundRequest::STATUS_PROCESSED, $refundRequest->status);
        
        // Verify payment relationship
        $payment->refresh();
        $this->assertEquals(Payment::STATUS_REFUNDED, $payment->status);
    }
}

