<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Payment;
use App\Models\RefundRequest;
use App\Models\RefundSetting;
use Illuminate\Support\Collection;
use App\Services\RefundCalculationService;
use App\Services\NotificationService as SystemNotificationService;
use App\Services\SystemLogService;

class AppointmentCancellationService
{
    public function __construct(
        private readonly RefundCalculationService $refundCalculationService

    ) {
    }

    /**
     * Cancel an appointment and handle downstream effects (refunds, logging, notifications).
     *
     * @param  Appointment  $appointment
     * @param  array{
     *     reason?: string,
     *     requested_cancellation_reason?: ?string,
     *     default_cancellation_reason?: string,
     *     treatment_adjustment_notes?: ?string,
     *     actor_role?: string,
     *     actor_id?: ?int,
     *     actor_name?: ?string,
     *     notify?: bool
     * }  $options
     * @return array{appointment: Appointment, refund_request_created: bool, refund_request?: ?RefundRequest}
     */
    public function cancel(Appointment $appointment, array $options = []): array
    {
        $reason = $options['reason'] ?? 'Cancelled';
        $requestedCancellationReason = $options['requested_cancellation_reason'] ?? null;
        $defaultCancellationReason = $options['default_cancellation_reason'] ?? Appointment::CANCELLATION_REASON_OTHER;
        $treatmentAdjustmentNotes = $options['treatment_adjustment_notes'] ?? null;
        $actorRole = $options['actor_role'] ?? 'system';
        $actorId = $options['actor_id'] ?? null;
        $actorName = $options['actor_name'] ?? 'System';
        $shouldNotify = $options['notify'] ?? true;
        $wasPaid = $appointment->payment_status === Payment::STATUS_PAID;

        $appointment->status = 'cancelled';
        $appointment->notes = $reason;
        $appointment->canceled_at = now();
        $appointment->cancellation_reason = $requestedCancellationReason ?? $defaultCancellationReason;
        $appointment->treatment_adjustment_notes = $treatmentAdjustmentNotes;

        if (!$wasPaid) {
            $appointment->payment_status = Payment::STATUS_UNPAID;
        }

        $appointment->save();

        $refundRequestCreated = false;
        $refundRequest = null;

        if ($appointment->payment_method === 'maya') {
            if ($wasPaid) {
                $refundCreated = $this->createRefundRequestForPaidMaya($appointment, $reason, $actorRole, $actorId);
                $refundRequestCreated = $refundCreated['created'];
                $refundRequest = $refundCreated['refund_request'];
            } else {
                $this->cancelOutstandingMayaPayments($appointment);
            }
        }

        if ($shouldNotify) {
            SystemNotificationService::notifyAppointmentStatusChange($appointment, 'cancelled');
        }

        $logType = $actorRole === 'admin' ? 'canceled_by_admin' : ($actorRole === 'patient' ? 'canceled_by_patient' : 'canceled_by_system');
        $logMessage = match ($actorRole) {
            'admin' => "Admin {$actorName} canceled appointment #{$appointment->id}",
            'patient' => 'Patient canceled their appointment #' . $appointment->id,
            default => "System canceled appointment #{$appointment->id}",
        };

        SystemLogService::logAppointment(
            $logType,
            $appointment->id,
            $logMessage,
            [
                'appointment_id' => $appointment->id,
                'patient_id' => $appointment->patient_id,
                'service_id' => $appointment->service_id,
                'date' => $appointment->date,
                'time_slot' => $appointment->time_slot,
                'cancelled_by' => $actorRole,
            ]
        );

        return [
            'appointment' => $appointment,
            'refund_request_created' => $refundRequestCreated,
            'refund_request' => $refundRequest,
        ];
    }

    /**
     * @return array{created: bool, refund_request: ?RefundRequest}
     */
    private function createRefundRequestForPaidMaya(Appointment $appointment, string $reason, string $actorRole, ?int $actorId): array
    {
        $mayaPayment = Payment::where('appointment_id', $appointment->id)
            ->where('method', 'maya')
            ->where('status', Payment::STATUS_PAID)
            ->first();

        if (!$mayaPayment) {
            return ['created' => false, 'refund_request' => null];
        }

        $refundData = $this->refundCalculationService->calculateRefundAmount($appointment, $mayaPayment);
        $settings = RefundSetting::getSettings();

        if ($refundData['refund_amount'] <= 0 && !$settings->create_zero_refund_request) {
            return ['created' => false, 'refund_request' => null];
        }

        $refundRequest = RefundRequest::create([
            'patient_id' => $appointment->patient_id,
            'appointment_id' => $appointment->id,
            'payment_id' => $mayaPayment->id,
            'original_amount' => $refundData['original_amount'],
            'cancellation_fee' => $refundData['cancellation_fee'],
            'refund_amount' => $refundData['refund_amount'],
            'reason' => $reason,
            'status' => RefundRequest::STATUS_PENDING,
            'requested_at' => now(),
        ]);

        SystemLogService::logRefund(
            'created',
            $refundRequest->id,
            'Refund request created for appointment #' . $appointment->id . ' (' . $reason . ')',
            [
                'refund_request_id' => $refundRequest->id,
                'appointment_id' => $appointment->id,
                'payment_id' => $mayaPayment->id,
                'patient_id' => $appointment->patient_id,
                'original_amount' => $refundData['original_amount'],
                'cancellation_fee' => $refundData['cancellation_fee'],
                'refund_amount' => $refundData['refund_amount'],
                'reason' => $reason,
                'cancelled_by' => $actorRole,
                'cancelled_by_user_id' => $actorId,
            ]
        );

        return ['created' => true, 'refund_request' => $refundRequest];
    }

    private function cancelOutstandingMayaPayments(Appointment $appointment): void
    {
        $mayaPayments = Payment::where('appointment_id', $appointment->id)
            ->where('method', 'maya')
            ->whereIn('status', [Payment::STATUS_UNPAID, Payment::STATUS_AWAITING_PAYMENT])
            ->get();

        $this->markPaymentsCancelled($mayaPayments);
    }

    private function markPaymentsCancelled(Collection $payments): void
    {
        $now = now();

        foreach ($payments as $payment) {
            $payment->update([
                'status' => Payment::STATUS_CANCELLED,
                'cancelled_at' => $now,
            ]);
        }
    }
}

