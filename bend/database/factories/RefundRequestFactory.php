<?php

namespace Database\Factories;

use App\Models\RefundRequest;
use App\Models\Patient;
use App\Models\Appointment;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;

class RefundRequestFactory extends Factory
{
    protected $model = RefundRequest::class;

    public function definition(): array
    {
        return [
            'patient_id' => Patient::factory(),
            'appointment_id' => Appointment::factory(),
            'payment_id' => Payment::factory(),
            'original_amount' => 1500,
            'cancellation_fee' => 0,
            'refund_amount' => 1500,
            'reason' => 'Cancelled by clinic',
            'status' => RefundRequest::STATUS_PENDING,
            'requested_at' => now(),
            'deadline_at' => now()->addDays(7),
        ];
    }
}

