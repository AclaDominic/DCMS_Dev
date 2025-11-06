<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Payment;
use App\Models\RefundSetting;
use Carbon\Carbon;

class RefundCalculationService
{
    /**
     * Calculate refund amount based on appointment cancellation
     * 
     * @param Appointment $appointment
     * @param Payment $payment
     * @return array ['original_amount' => float, 'cancellation_fee' => float, 'refund_amount' => float]
     */
    public function calculateRefundAmount(Appointment $appointment, Payment $payment): array
    {
        $settings = RefundSetting::getSettings();
        $originalAmount = (float) $payment->amount_paid ?: (float) $payment->amount_due;
        
        // Check if cancelled within deadline
        // Deadline: appointment date/time minus cancellation_deadline_hours
        // If cancelled BEFORE the deadline, no fee. If cancelled AFTER the deadline, apply fee.
        $appointmentDateTime = Carbon::parse($appointment->date)->startOfDay();
        
        // If appointment has a time_slot, use it to get the exact appointment time
        if ($appointment->time_slot) {
            $timeParts = explode('-', $appointment->time_slot);
            if (count($timeParts) > 0) {
                $timeStr = trim($timeParts[0]);
                if (preg_match('/^(\d{2}):(\d{2})/', $timeStr, $matches)) {
                    $appointmentDateTime->setTime((int)$matches[1], (int)$matches[2], 0);
                }
            }
        }
        
        $deadlineDateTime = $appointmentDateTime->copy()->subHours($settings->cancellation_deadline_hours);
        $now = Carbon::now();
        
        $cancellationFee = 0;
        
        // Policy 4.1: Refunds are only applicable for services not rendered due to clinic cancellation or medical contraindication
        // If cancellation reason is clinic_cancellation or medical_contraindication, no cancellation fee
        $isEligibleForFullRefund = in_array($appointment->cancellation_reason, [
            Appointment::CANCELLATION_REASON_CLINIC_CANCELLATION,
            Appointment::CANCELLATION_REASON_MEDICAL_CONTRAINDICATION
        ]);
        
        if ($isEligibleForFullRefund) {
            // No cancellation fee for clinic cancellation or medical contraindication
            $cancellationFee = 0;
        } elseif ($now->greaterThanOrEqualTo($deadlineDateTime)) {
            // If cancelled AFTER deadline (now is past the deadline), apply cancellation fee
            // Get cancellation fee from service if available
            if ($appointment->service && $appointment->service->cancellation_fee) {
                $cancellationFee = (float) $appointment->service->cancellation_fee;
            } else {
                // Default: 20% of original amount
                $cancellationFee = $originalAmount * 0.20;
            }
        }
        // If cancelled BEFORE deadline, no fee (cancellationFee remains 0)
        
        $refundAmount = max(0, $originalAmount - $cancellationFee);
        
        return [
            'original_amount' => round($originalAmount, 2),
            'cancellation_fee' => round($cancellationFee, 2),
            'refund_amount' => round($refundAmount, 2),
        ];
    }
}

