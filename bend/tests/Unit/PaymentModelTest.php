<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Models\Payment;
use App\Models\PatientVisit;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PaymentModelTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function payment_belongs_to_patient_visit()
    {
        $visit = PatientVisit::factory()->create();
        $payment = Payment::factory()->create([
            'patient_visit_id' => $visit->id,
            'appointment_id' => null,
        ]);

        $this->assertInstanceOf(PatientVisit::class, $payment->patientVisit);
        $this->assertEquals($visit->id, $payment->patientVisit->id);
    }

    /** @test */
    public function payment_belongs_to_appointment()
    {
        $appointment = Appointment::factory()->create();
        $payment = Payment::factory()->create([
            'appointment_id' => $appointment->id,
            'patient_visit_id' => null,
        ]);

        $this->assertInstanceOf(Appointment::class, $payment->appointment);
        $this->assertEquals($appointment->id, $payment->appointment->id);
    }

    /** @test */
    public function patient_visit_has_many_payments()
    {
        $visit = PatientVisit::factory()->create();
        
        $payment1 = Payment::factory()->create([
            'patient_visit_id' => $visit->id,
        ]);
        
        $payment2 = Payment::factory()->create([
            'patient_visit_id' => $visit->id,
        ]);

        $payments = $visit->payments;
        $this->assertCount(2, $payments);
        $this->assertTrue($payments->contains($payment1));
        $this->assertTrue($payments->contains($payment2));
    }

    /** @test */
    public function payment_status_constants_are_defined()
    {
        $this->assertEquals('unpaid', Payment::STATUS_UNPAID);
        $this->assertEquals('awaiting_payment', Payment::STATUS_AWAITING_PAYMENT);
        $this->assertEquals('paid', Payment::STATUS_PAID);
        $this->assertEquals('failed', Payment::STATUS_FAILED);
        $this->assertEquals('cancelled', Payment::STATUS_CANCELLED);
    }

    /** @test */
    public function payment_has_default_attributes()
    {
        $payment = new Payment();
        
        $this->assertEquals('PHP', $payment->currency);
        $this->assertEquals('unpaid', $payment->status);
    }

    /** @test */
    public function payment_can_be_marked_as_paid()
    {
        $payment = Payment::factory()->create([
            'status' => 'unpaid',
            'amount_due' => 1500.00,
            'amount_paid' => 0,
            'paid_at' => null,
        ]);

        $payment->markPaid();

        $this->assertEquals('paid', $payment->status);
        $this->assertEquals(1500.00, $payment->amount_paid);
        $this->assertNotNull($payment->paid_at);
    }

    /** @test */
    public function payment_can_be_marked_as_cancelled()
    {
        $payment = Payment::factory()->create([
            'status' => 'awaiting_payment',
            'cancelled_at' => null,
        ]);

        $payment->markCancelled();

        $this->assertEquals('cancelled', $payment->status);
        $this->assertNotNull($payment->cancelled_at);
    }

    /** @test */
    public function payment_can_be_marked_as_failed()
    {
        $payment = Payment::factory()->create([
            'status' => 'awaiting_payment',
        ]);

        $payment->markFailed();

        $this->assertEquals('failed', $payment->status);
    }

    /** @test */
    public function payment_is_paid_accessor_works_correctly()
    {
        $paidPayment = Payment::factory()->paid()->create();
        $unpaidPayment = Payment::factory()->create(['status' => 'unpaid']);

        $this->assertTrue($paidPayment->is_paid);
        $this->assertFalse($unpaidPayment->is_paid);
    }

    /** @test */
    public function payment_scopes_work_correctly()
    {
        // Create payments with different statuses
        $paidPayment = Payment::factory()->paid()->create();
        $unpaidPayment = Payment::factory()->create(['status' => 'unpaid']);
        $awaitingPayment = Payment::factory()->create(['status' => 'awaiting_payment']);

        // Test paid scope
        $paidPayments = Payment::paid()->get();
        $this->assertCount(1, $paidPayments);
        $this->assertTrue($paidPayments->contains($paidPayment));

        // Test unpaid scope
        $unpaidPayments = Payment::unpaid()->get();
        $this->assertCount(1, $unpaidPayments);
        $this->assertTrue($unpaidPayments->contains($unpaidPayment));

        // Test awaiting scope
        $awaitingPayments = Payment::awaiting()->get();
        $this->assertCount(1, $awaitingPayments);
        $this->assertTrue($awaitingPayments->contains($awaitingPayment));
    }

    /** @test */
    public function payment_casts_are_applied_correctly()
    {
        $payment = Payment::factory()->create([
            'amount_due' => '1500.50',
            'amount_paid' => '1500.50',
            'paid_at' => '2024-01-15 10:30:00',
            'cancelled_at' => null,
            'expires_at' => '2024-01-16 10:30:00',
            'webhook_last_payload' => ['test' => 'data'],
            'meta' => ['additional' => 'info'],
        ]);

        $this->assertIsString($payment->amount_due); // Laravel decimal casts return strings
        $this->assertIsString($payment->amount_paid);
        $this->assertInstanceOf(\Carbon\Carbon::class, $payment->paid_at);
        $this->assertNull($payment->cancelled_at);
        $this->assertInstanceOf(\Carbon\Carbon::class, $payment->expires_at);
        $this->assertIsArray($payment->webhook_last_payload);
        $this->assertIsArray($payment->meta);
    }

    /** @test */
    public function maya_payment_can_be_identified()
    {
        $mayaPayment = Payment::factory()->maya()->create();
        $cashPayment = Payment::factory()->cash()->create();
        $hmoPayment = Payment::factory()->hmo()->create();

        $this->assertEquals('maya', $mayaPayment->method);
        $this->assertEquals('cash', $cashPayment->method);
        $this->assertEquals('hmo', $hmoPayment->method);
    }

    /** @test */
    public function payment_reference_number_is_unique()
    {
        $payment1 = Payment::factory()->create(['reference_no' => 'REF-001']);
        
        $this->expectException(\Illuminate\Database\QueryException::class);
        
        Payment::factory()->create(['reference_no' => 'REF-001']);
    }

    /** @test */
    public function payment_can_have_maya_specific_fields()
    {
        $payment = Payment::factory()->maya()->create([
            'maya_checkout_id' => 'checkout-123',
            'maya_payment_id' => 'payment-456',
            'rrn' => 'RRN-789',
            'auth_code' => 'AUTH-ABC',
            'redirect_url' => 'https://maya.com/checkout/123',
        ]);

        $this->assertEquals('checkout-123', $payment->maya_checkout_id);
        $this->assertEquals('payment-456', $payment->maya_payment_id);
        $this->assertEquals('RRN-789', $payment->rrn);
        $this->assertEquals('AUTH-ABC', $payment->auth_code);
        $this->assertEquals('https://maya.com/checkout/123', $payment->redirect_url);
    }

    /** @test */
    public function payment_can_calculate_total_amounts()
    {
        $visit = PatientVisit::factory()->create();
        
        // Create multiple payments for the same visit
        Payment::factory()->create([
            'patient_visit_id' => $visit->id,
            'amount_due' => 1000.00,
            'amount_paid' => 1000.00,
        ]);
        
        Payment::factory()->create([
            'patient_visit_id' => $visit->id,
            'amount_due' => 500.00,
            'amount_paid' => 500.00,
        ]);

        $totalPaid = $visit->payments->sum('amount_paid');
        $totalDue = $visit->payments->sum('amount_due');

        $this->assertEquals(1500.00, $totalPaid);
        $this->assertEquals(1500.00, $totalDue);
    }

    /** @test */
    public function payment_status_transitions_are_valid()
    {
        $payment = Payment::factory()->create(['status' => 'unpaid']);
        
        // Unpaid -> Awaiting Payment
        $payment->update(['status' => 'awaiting_payment']);
        $this->assertEquals('awaiting_payment', $payment->status);
        
        // Awaiting Payment -> Paid
        $payment->markPaid();
        $this->assertEquals('paid', $payment->status);
        
        // Reset to awaiting and test failure
        $payment->update(['status' => 'awaiting_payment', 'paid_at' => null]);
        $payment->markFailed();
        $this->assertEquals('failed', $payment->status);
        
        // Reset to awaiting and test cancellation
        $payment->update(['status' => 'awaiting_payment', 'cancelled_at' => null]);
        $payment->markCancelled();
        $this->assertEquals('cancelled', $payment->status);
    }
}
