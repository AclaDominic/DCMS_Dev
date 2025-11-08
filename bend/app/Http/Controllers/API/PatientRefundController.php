<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\RefundRequest;
use App\Models\Appointment;
use App\Models\Payment;
use Illuminate\Http\Request;
use App\Services\SystemLogService;

class PatientRefundController extends Controller
{
    public function pendingClaims(Request $request)
    {
        $user = $request->user()->load('patient');

        if (!$user->patient) {
            return response()->json([
                'data' => [],
            ]);
        }

        $refunds = RefundRequest::with(['appointment.service', 'payment'])
            ->where('patient_id', $user->patient->id)
            ->where('status', RefundRequest::STATUS_PROCESSED)
            ->whereNull('patient_confirmed_at')
            ->orderByDesc('processed_at')
            ->get()
            ->map(function (RefundRequest $refund) {
                return [
                    'id' => $refund->id,
                    'refund_amount' => (float) $refund->refund_amount,
                    'deadline_at' => optional($refund->deadline_at)?->toIso8601String(),
                    'formatted_deadline' => optional($refund->deadline_at)?->format('M d, Y'),
                    'pickup_notified_at' => optional($refund->pickup_notified_at)?->toIso8601String(),
                    'patient_confirmed_at' => optional($refund->patient_confirmed_at)?->toIso8601String(),
                    'service_name' => optional(optional($refund->appointment)->service)->name,
                    'appointment_id' => $refund->appointment_id,
                    'reference_no' => optional($refund->appointment)->reference_code,
                    'payment_method' => optional($refund->payment)->method,
                    'status' => $refund->status,
                    'days_until_deadline' => $refund->daysUntilDeadline(),
                ];
            });

        return response()->json([
            'data' => $refunds,
        ]);
    }

    public function confirm(Request $request, $id)
    {
        $user = $request->user()->load('patient');

        if (!$user->patient) {
            return response()->json(['message' => 'User is not linked to a patient profile.'], 403);
        }

        $refundRequest = RefundRequest::where('patient_id', $user->patient->id)
            ->where('status', RefundRequest::STATUS_PROCESSED)
            ->where('id', $id)
            ->firstOrFail();

        if ($refundRequest->isPatientConfirmed()) {
            return response()->json([
                'message' => 'Refund already confirmed.',
            ], 422);
        }

        $refundRequest->markPatientConfirmed();

        if ($refundRequest->payment_id) {
            $payment = Payment::find($refundRequest->payment_id);
            if ($payment && $payment->status !== Payment::STATUS_REFUNDED) {
                $payment->markRefunded($refundRequest->processed_by);
            }
        }

        if ($refundRequest->appointment_id) {
            $appointment = Appointment::find($refundRequest->appointment_id);
            if ($appointment && $appointment->payment_status !== Payment::STATUS_REFUNDED) {
                $appointment->forceFill([
                    'payment_status' => Payment::STATUS_REFUNDED,
                ])->save();
            }
        }

        SystemLogService::logRefund(
            'patient_confirmed',
            $refundRequest->id,
            'Patient confirmed refund #' . $refundRequest->id,
            [
                'refund_request_id' => $refundRequest->id,
                'patient_id' => $refundRequest->patient_id,
                'appointment_id' => $refundRequest->appointment_id,
            ]
        );

        return response()->json([
            'message' => 'Refund confirmed.',
        ]);
    }
}

