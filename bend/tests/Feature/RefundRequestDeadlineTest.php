<?php

namespace Tests\Feature;

use App\Models\RefundRequest;
use App\Models\RefundSetting;
use App\Models\ClinicWeeklySchedule;
use App\Models\ClinicCalendar;
use App\Services\ClinicDateResolverService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Carbon\Carbon;

class RefundRequestDeadlineTest extends TestCase
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
        
        // Create a basic weekly schedule (Monday-Friday open, weekends closed)
        for ($day = 1; $day <= 5; $day++) { // Monday to Friday
            ClinicWeeklySchedule::create([
                'weekday' => $day,
                'is_open' => true,
                'open_time' => '08:00',
                'close_time' => '17:00',
            ]);
        }
    }

    public function test_isOverdue_returns_true_when_deadline_passed()
    {
        $refundRequest = new RefundRequest();
        $refundRequest->deadline_at = Carbon::yesterday();
        
        $this->assertTrue($refundRequest->isOverdue());
    }

    public function test_isOverdue_returns_false_when_deadline_not_passed()
    {
        $refundRequest = new RefundRequest();
        $refundRequest->deadline_at = Carbon::tomorrow();
        
        $this->assertFalse($refundRequest->isOverdue());
    }

    public function test_isOverdue_returns_false_when_no_deadline()
    {
        $refundRequest = new RefundRequest();
        $refundRequest->deadline_at = null;
        
        $this->assertFalse($refundRequest->isOverdue());
    }

    public function test_calculateBusinessDaysDeadline_excludes_weekends()
    {
        $monday = Carbon::now();
        while ($monday->dayOfWeek !== Carbon::MONDAY) {
            $monday->addDay();
        }
        $monday->startOfDay();
        
        $deadline = RefundRequest::calculateBusinessDaysDeadline($monday, 5);
        
        $this->assertTrue($deadline->isAfter($monday));
        
        $resolver = app(ClinicDateResolverService::class);
        $snapshot = $resolver->resolve($deadline->toDateString());
        $this->assertTrue($snapshot['is_open'], "Deadline date should be a day when clinic is open");
        
        $this->assertTrue(
            $deadline->dayOfWeek >= Carbon::MONDAY && $deadline->dayOfWeek <= Carbon::FRIDAY,
            "Deadline should fall on a weekday"
        );
    }

    public function test_calculateBusinessDaysDeadline_excludes_closed_days()
    {
        $monday = Carbon::parse('2025-01-13');
        while ($monday->dayOfWeek !== Carbon::MONDAY) {
            $monday->addDay();
        }
        
        $wednesday = $monday->copy()->addDays(2);
        ClinicCalendar::create([
            'date' => $wednesday->format('Y-m-d'),
            'is_open' => false,
        ]);
        
        $deadline = RefundRequest::calculateBusinessDaysDeadline($monday, 3);
        
        $this->assertEquals(Carbon::THURSDAY, $deadline->dayOfWeek);
    }

    public function test_deadline_auto_calculation_on_refund_request_creation()
    {
        $patient = \App\Models\Patient::factory()->create();
        $requestedAt = Carbon::now();
        
        $refundRequest = RefundRequest::create([
            'patient_id' => $patient->id,
            'original_amount' => 1000.00,
            'cancellation_fee' => 0.00,
            'refund_amount' => 1000.00,
            'status' => RefundRequest::STATUS_PENDING,
            'requested_at' => $requestedAt,
        ]);
        
        $this->assertNotNull($refundRequest->deadline_at);
        $this->assertTrue($refundRequest->deadline_at->isAfter($requestedAt));
    }

    public function test_daysUntilDeadline_returns_correct_calendar_days()
    {
        $refundRequest = new RefundRequest();
        $refundRequest->deadline_at = Carbon::now()->addDays(5);
        $days = $refundRequest->daysUntilDeadline();
        $this->assertEquals(5, $days);
        
        $refundRequest->deadline_at = Carbon::now()->subDays(3);
        $days = $refundRequest->daysUntilDeadline();
        $this->assertEquals(-3, $days);
        
        $refundRequest->deadline_at = null;
        $days = $refundRequest->daysUntilDeadline();
        $this->assertEquals(0, $days);
    }

    public function test_calculateBusinessDaysDeadline_spans_multiple_weeks_with_closed_days()
    {
        $monday = Carbon::parse('2025-01-13');
        while ($monday->dayOfWeek !== Carbon::MONDAY) {
            $monday->addDay();
        }
        
        for ($i = 0; $i < 2; $i++) {
            $wednesday = $monday->copy()->addDays(2 + ($i * 7));
            ClinicCalendar::create([
                'date' => $wednesday->format('Y-m-d'),
                'is_open' => false,
            ]);
        }
        
        $deadline = RefundRequest::calculateBusinessDaysDeadline($monday, 10);
        
        $this->assertTrue($deadline->isAfter($monday));
        
        $this->assertNotEquals(Carbon::SATURDAY, $deadline->dayOfWeek);
        $this->assertNotEquals(Carbon::SUNDAY, $deadline->dayOfWeek);
    }
}

