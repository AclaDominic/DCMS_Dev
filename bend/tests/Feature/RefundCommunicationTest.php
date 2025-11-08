<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\ClinicWeeklySchedule;
use App\Models\Notification;
use App\Models\NotificationTarget;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\RefundRequest;
use App\Models\RefundSetting;
use App\Models\Service;
use App\Models\SystemLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class RefundCommunicationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        RefundSetting::create([
            'cancellation_deadline_hours' => 24,
            'monthly_cancellation_limit' => 3,
            'create_zero_refund_request' => false,
            'reminder_days' => 5,
        ]);

        for ($day = 1; $day <= 5; $day++) {
            ClinicWeeklySchedule::create([
                'weekday' => $day,
                'is_open' => true,
                'open_time' => '08:00',
                'close_time' => '17:00',
            ]);
        }
    }

    public function test_processing_refund_sends_ready_notification_and_marks_statuses(): void
    {
        Mail::fake();

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
        $service = Service::factory()->create();
        $appointment = Appointment::factory()->create([
            'patient_id' => $patient->id,
            'service_id' => $service->id,
            'payment_method' => 'maya',
            'payment_status' => Payment::STATUS_PAID,
            'status' => 'approved',
        ]);

        $payment = Payment::factory()->create([
            'appointment_id' => $appointment->id,
            'method' => 'maya',
            'status' => Payment::STATUS_PAID,
            'amount_due' => 1500,
            'amount_paid' => 1500,
            'paid_at' => now(),
        ]);

        $refund = RefundRequest::factory()->create([
            'patient_id' => $patient->id,
            'appointment_id' => $appointment->id,
            'payment_id' => $payment->id,
            'status' => RefundRequest::STATUS_APPROVED,
            'requested_at' => now()->subDays(3),
            'deadline_at' => now()->addDays(5),
            'refund_amount' => 1500,
        ]);

        $response = $this->actingAs($admin)->postJson("/api/admin/refund-requests/{$refund->id}/process");
        $response->assertStatus(200);

        $refund->refresh();
        $payment->refresh();
        $appointment->refresh();

        $this->assertEquals(RefundRequest::STATUS_PROCESSED, $refund->status);
        $this->assertNotNull($refund->pickup_notified_at);
        $this->assertNull($refund->pickup_reminder_sent_at);
        $this->assertEquals(Payment::STATUS_REFUNDED, $payment->status);
        $this->assertEquals(Payment::STATUS_REFUNDED, $appointment->payment_status);

        $notification = Notification::where('type', 'refund_ready')->first();
        $this->assertNotNull($notification);

        $target = NotificationTarget::where('notification_id', $notification->id)
            ->where('user_id', $patientUser->id)
            ->first();
        $this->assertNotNull($target);

        $log = SystemLog::where('category', 'refund')
            ->where('action', 'pickup_notified')
            ->where('subject_id', $refund->id)
            ->first();
        $this->assertNotNull($log);
    }

    public function test_patient_pending_claims_filters_out_confirmed_refunds(): void
    {
        $patientUser = User::factory()->create([
            'role' => 'patient',
            'email' => 'juan.patient@gmail.com',
        ]);
        $patient = Patient::factory()->create(['user_id' => $patientUser->id]);
        $service = Service::factory()->create();
        $appointment = Appointment::factory()->create([
            'patient_id' => $patient->id,
            'service_id' => $service->id,
            'payment_method' => 'maya',
            'payment_status' => Payment::STATUS_REFUNDED,
            'status' => 'cancelled',
        ]);

        $payment = Payment::factory()->create([
            'appointment_id' => $appointment->id,
            'method' => 'maya',
            'status' => Payment::STATUS_REFUNDED,
        ]);

        $unconfirmed = RefundRequest::factory()->create([
            'patient_id' => $patient->id,
            'appointment_id' => $appointment->id,
            'payment_id' => $payment->id,
            'status' => RefundRequest::STATUS_PROCESSED,
            'refund_amount' => 1200,
            'deadline_at' => now()->addDays(3),
        ]);

        RefundRequest::factory()->create([
            'patient_id' => $patient->id,
            'appointment_id' => $appointment->id,
            'payment_id' => $payment->id,
            'status' => RefundRequest::STATUS_PROCESSED,
            'refund_amount' => 800,
            'deadline_at' => now()->addDays(2),
            'patient_confirmed_at' => now()->subDay(),
        ]);

        $response = $this->actingAs($patientUser)->getJson('/api/refunds/pending-claims');
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals($unconfirmed->id, $data[0]['id']);
    }

    public function test_patient_can_confirm_refund(): void
    {
        $patientUser = User::factory()->create([
            'role' => 'patient',
            'email' => 'juan.patient@gmail.com',
        ]);
        $patient = Patient::factory()->create(['user_id' => $patientUser->id]);
        $service = Service::factory()->create();
        $appointment = Appointment::factory()->create([
            'patient_id' => $patient->id,
            'service_id' => $service->id,
            'payment_method' => 'maya',
            'payment_status' => Payment::STATUS_REFUNDED,
            'status' => 'cancelled',
        ]);

        $payment = Payment::factory()->create([
            'appointment_id' => $appointment->id,
            'method' => 'maya',
            'status' => Payment::STATUS_REFUNDED,
        ]);

        $refund = RefundRequest::factory()->create([
            'patient_id' => $patient->id,
            'appointment_id' => $appointment->id,
            'payment_id' => $payment->id,
            'status' => RefundRequest::STATUS_PROCESSED,
            'refund_amount' => 1800,
            'deadline_at' => now()->addDays(2),
        ]);

        $response = $this->actingAs($patientUser)->postJson("/api/refunds/{$refund->id}/confirm");
        $response->assertStatus(200);

        $refund->refresh();
        $payment->refresh();
        $appointment->refresh();

        $this->assertNotNull($refund->patient_confirmed_at);
        $this->assertEquals(Payment::STATUS_REFUNDED, $payment->status);
        $this->assertEquals(Payment::STATUS_REFUNDED, $appointment->payment_status);

        $log = SystemLog::where('category', 'refund')
            ->where('action', 'patient_confirmed')
            ->where('subject_id', $refund->id)
            ->first();
        $this->assertNotNull($log);
    }

    public function test_extend_deadline_validates_and_sends_notification(): void
    {
        Mail::fake();
        Notification::query()->delete();
        NotificationTarget::query()->delete();

        Carbon::setTestNow(Carbon::parse('2025-01-02 10:00:00'));

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
        $service = Service::factory()->create();
        $appointment = Appointment::factory()->create([
            'patient_id' => $patient->id,
            'service_id' => $service->id,
            'payment_method' => 'maya',
            'payment_status' => Payment::STATUS_PAID,
            'status' => 'approved',
            'date' => '2025-01-10',
        ]);

        $payment = Payment::factory()->create([
            'appointment_id' => $appointment->id,
            'method' => 'maya',
            'status' => Payment::STATUS_PAID,
            'amount_due' => 2000,
            'amount_paid' => 2000,
            'paid_at' => now(),
        ]);

        $refund = RefundRequest::factory()->create([
            'patient_id' => $patient->id,
            'appointment_id' => $appointment->id,
            'payment_id' => $payment->id,
            'status' => RefundRequest::STATUS_PROCESSED,
            'requested_at' => Carbon::parse('2025-01-02 09:00:00'),
            'deadline_at' => Carbon::parse('2025-01-13 17:00:00'),
            'refund_amount' => 2000,
        ]);

        $minimumDeadline = $refund->minimumExtendDeadline()->toDateString();

        $invalidResponse = $this->actingAs($admin)->postJson(
            "/api/admin/refund-requests/{$refund->id}/extend-deadline",
            [
                'new_deadline' => Carbon::parse($minimumDeadline)->subDay()->toDateString(),
                'reason' => 'Need more time',
            ]
        );
        $invalidResponse->assertStatus(422);

        $newDeadline = $refund->deadline_at->copy()->addDays(3)->toDateString();

        $validResponse = $this->actingAs($admin)->postJson(
            "/api/admin/refund-requests/{$refund->id}/extend-deadline",
            [
                'new_deadline' => $newDeadline,
                'reason' => 'Patient requested extension',
            ]
        );
        $validResponse->assertStatus(200);

        $refund->refresh();

        $this->assertEquals($newDeadline, $refund->deadline_at->toDateString());
        $this->assertNotNull($refund->deadline_extended_at);
        $this->assertEquals($admin->id, $refund->deadline_extended_by);
        $this->assertEquals('Patient requested extension', $refund->deadline_extension_reason);

        $notification = Notification::where('type', 'refund_deadline_extended')->first();
        $this->assertNotNull($notification);

        $target = NotificationTarget::where('notification_id', $notification->id)
            ->where('user_id', $patientUser->id)
            ->first();
        $this->assertNotNull($target);

        $log = SystemLog::where('category', 'refund')
            ->where('action', 'deadline_extended')
            ->where('subject_id', $refund->id)
            ->first();
        $this->assertNotNull($log);

        Carbon::setTestNow();
    }
}

