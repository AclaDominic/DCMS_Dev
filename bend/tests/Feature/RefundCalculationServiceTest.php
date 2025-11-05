<?php

namespace Tests\Feature;

use App\Models\Service;
use App\Models\Appointment;
use App\Models\Payment;
use App\Models\RefundSetting;
use App\Services\RefundCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Carbon\Carbon;

class RefundCalculationServiceTest extends TestCase
{
    use RefreshDatabase;

    protected RefundCalculationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new RefundCalculationService();
        
        // Create default refund settings
        RefundSetting::create([
            'cancellation_deadline_hours' => 24,
            'monthly_cancellation_limit' => 3,
            'create_zero_refund_request' => false,
            'reminder_days' => 5,
        ]);
    }

    public function test_calculates_full_refund_when_cancelled_within_deadline()
    {
        $service = Service::factory()->create(['price' => 1500.00]);
        
        // Set appointment to 25+ hours from now to be within 24-hour deadline
        $futureDate = Carbon::now()->addHours(25);
        $appointment = Appointment::factory()->create([
            'service_id' => $service->id,
            'date' => $futureDate->format('Y-m-d'),
            'time_slot' => $futureDate->format('H:i') . '-15:00', // Use the future time
        ]);
        
        $payment = Payment::factory()->create([
            'appointment_id' => $appointment->id,
            'amount_due' => 1500.00,
            'amount_paid' => 1500.00,
        ]);
        
        $result = $this->service->calculateRefundAmount($appointment, $payment);
        
        $this->assertEquals(1500.00, $result['original_amount']);
        $this->assertEquals(0.00, $result['cancellation_fee']);
        $this->assertEquals(1500.00, $result['refund_amount']);
    }

    public function test_calculates_partial_refund_when_cancelled_after_deadline_with_service_fee()
    {
        $service = Service::factory()->create([
            'price' => 2000.00,
            'cancellation_fee' => 400.00,
        ]);
        
        $appointment = Appointment::factory()->create([
            'service_id' => $service->id,
            'date' => Carbon::today()->format('Y-m-d'), // Today - past deadline
        ]);
        
        $payment = Payment::factory()->create([
            'appointment_id' => $appointment->id,
            'amount_due' => 2000.00,
            'amount_paid' => 2000.00,
        ]);
        
        $result = $this->service->calculateRefundAmount($appointment, $payment);
        
        $this->assertEquals(2000.00, $result['original_amount']);
        $this->assertEquals(400.00, $result['cancellation_fee']);
        $this->assertEquals(1600.00, $result['refund_amount']);
    }

    public function test_calculates_partial_refund_with_default_20_percent_fee_when_no_service_fee()
    {
        $service = Service::factory()->create([
            'price' => 1000.00,
            'cancellation_fee' => null, // No cancellation fee set
        ]);
        
        $appointment = Appointment::factory()->create([
            'service_id' => $service->id,
            'date' => Carbon::today()->format('Y-m-d'), // Today - past deadline
        ]);
        
        $payment = Payment::factory()->create([
            'appointment_id' => $appointment->id,
            'amount_due' => 1000.00,
            'amount_paid' => 1000.00,
        ]);
        
        $result = $this->service->calculateRefundAmount($appointment, $payment);
        
        $this->assertEquals(1000.00, $result['original_amount']);
        $this->assertEquals(200.00, $result['cancellation_fee']); // 20% of 1000
        $this->assertEquals(800.00, $result['refund_amount']);
    }

    public function test_respects_cancellation_deadline_hours_setting()
    {
        // Update setting to 48 hours
        RefundSetting::first()->update(['cancellation_deadline_hours' => 48]);
        
        $service = Service::factory()->create(['price' => 1500.00]);
        
        // Appointment in 49 hours - within 48-hour deadline (deadline is 49 - 48 = 1 hour from now)
        $futureDate = Carbon::now()->addHours(49);
        $appointment = Appointment::factory()->create([
            'service_id' => $service->id,
            'date' => $futureDate->format('Y-m-d'),
            'time_slot' => $futureDate->format('H:i') . '-15:00', // Use the future time
        ]);
        
        $payment = Payment::factory()->create([
            'appointment_id' => $appointment->id,
            'amount_due' => 1500.00,
            'amount_paid' => 1500.00,
        ]);
        
        $result = $this->service->calculateRefundAmount($appointment, $payment);
        
        // Should still be full refund since within 48-hour deadline
        $this->assertEquals(0.00, $result['cancellation_fee']);
        $this->assertEquals(1500.00, $result['refund_amount']);
    }

    public function test_zero_refund_amount_when_cancellation_fee_equals_payment()
    {
        $service = Service::factory()->create([
            'price' => 1000.00,
            'cancellation_fee' => 1000.00, // Cancellation fee equals payment
        ]);
        
        $appointment = Appointment::factory()->create([
            'service_id' => $service->id,
            'date' => Carbon::today()->format('Y-m-d'), // Past deadline
        ]);
        
        $payment = Payment::factory()->create([
            'appointment_id' => $appointment->id,
            'amount_due' => 1000.00,
            'amount_paid' => 1000.00,
        ]);
        
        $result = $this->service->calculateRefundAmount($appointment, $payment);
        
        $this->assertEquals(1000.00, $result['original_amount']);
        $this->assertEquals(1000.00, $result['cancellation_fee']);
        $this->assertEquals(0.00, $result['refund_amount']);
    }

    public function test_uses_amount_paid_if_available_otherwise_amount_due()
    {
        $service = Service::factory()->create(['price' => 1500.00]);
        
        $appointment = Appointment::factory()->create([
            'service_id' => $service->id,
            'date' => Carbon::tomorrow()->format('Y-m-d'),
        ]);
        
        // Payment with amount_paid
        $payment1 = Payment::factory()->create([
            'appointment_id' => $appointment->id,
            'amount_due' => 1500.00,
            'amount_paid' => 1400.00, // Partial payment
        ]);
        
        $result1 = $this->service->calculateRefundAmount($appointment, $payment1);
        $this->assertEquals(1400.00, $result1['original_amount']);
        
        // Payment without amount_paid (uses amount_due)
        $payment2 = Payment::factory()->create([
            'appointment_id' => $appointment->id,
            'amount_due' => 1500.00,
            'amount_paid' => 0,
        ]);
        
        $result2 = $this->service->calculateRefundAmount($appointment, $payment2);
        $this->assertEquals(1500.00, $result2['original_amount']);
    }
}

