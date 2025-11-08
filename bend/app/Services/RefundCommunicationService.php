<?php

namespace App\Services;

use App\Models\RefundRequest;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use App\Services\SystemLogService;

class RefundCommunicationService
{
    public static function sendReadyForPickup(RefundRequest $refundRequest): void
    {
        if ($refundRequest->pickup_notified_at) {
            return;
        }

        $refundRequest->loadMissing(['patient.user', 'appointment']);

        $patientUser = optional($refundRequest->patient)->user;
        if (!$patientUser) {
            Log::warning('Refund ready notification skipped - patient has no linked user', [
                'refund_request_id' => $refundRequest->id,
            ]);
            return;
        }

        self::dispatchPatientNotification(
            $patientUser,
            'refund_ready',
            'Refund ready for pickup',
            self::buildReadyNotificationBody($refundRequest),
            [
                'refund_request_id' => $refundRequest->id,
                'deadline_at' => optional($refundRequest->deadline_at)?->toDateString(),
                'refund_amount' => (float) $refundRequest->refund_amount,
            ]
        );

        self::sendMail(
            $patientUser,
            'Your refund is ready for pickup',
            'emails.refund_ready',
            self::buildEmailData($refundRequest)
        );

        $refundRequest->forceFill([
            'pickup_notified_at' => now(),
            'pickup_reminder_sent_at' => null,
        ])->save();

        SystemLogService::logRefund(
            'pickup_notified',
            $refundRequest->id,
            "Refund request #{$refundRequest->id} pickup instructions sent to patient.",
            [
                'refund_request_id' => $refundRequest->id,
                'deadline_at' => optional($refundRequest->deadline_at)?->toDateTimeString(),
                'refund_amount' => (float) $refundRequest->refund_amount,
            ]
        );
    }

    public static function sendDeadlineExtended(
        RefundRequest $refundRequest,
        Carbon $oldDeadline,
        Carbon $newDeadline,
        string $reason,
        User $actor
    ): void {
        $refundRequest->loadMissing(['patient.user']);
        $patientUser = optional($refundRequest->patient)->user;

        if ($patientUser) {
            self::dispatchPatientNotification(
                $patientUser,
                'refund_deadline_extended',
                'Refund deadline extended',
                "Your refund pickup deadline has been moved to {$newDeadline->format('M d, Y')}. Reason: {$reason}",
                [
                    'refund_request_id' => $refundRequest->id,
                    'old_deadline' => $oldDeadline->toDateString(),
                    'new_deadline' => $newDeadline->toDateString(),
                ]
            );

            self::sendMail(
                $patientUser,
                'Refund pickup deadline extended',
                'emails.refund_deadline_extended',
                self::buildEmailData($refundRequest, [
                    'old_deadline' => $oldDeadline,
                    'new_deadline' => $newDeadline,
                    'extension_reason' => $reason,
                    'actor' => $actor,
                ])
            );
        } else {
            Log::warning('Refund deadline extension email skipped - patient has no linked user', [
                'refund_request_id' => $refundRequest->id,
            ]);
        }

        SystemLogService::logRefund(
            'deadline_extended',
            $refundRequest->id,
            "Refund request #{$refundRequest->id} deadline extended from {$oldDeadline->toDateString()} to {$newDeadline->toDateString()}",
            [
                'refund_request_id' => $refundRequest->id,
                'old_deadline' => $oldDeadline->toDateTimeString(),
                'new_deadline' => $newDeadline->toDateTimeString(),
                'reason' => $reason,
                'actor_id' => $actor->id,
            ]
        );
    }

    public static function sendPickupReminder(RefundRequest $refundRequest): void
    {
        if ($refundRequest->pickup_reminder_sent_at) {
            return;
        }

        $refundRequest->loadMissing(['patient.user', 'appointment']);
        $patientUser = optional($refundRequest->patient)->user;
        if (!$patientUser) {
            Log::warning('Refund reminder skipped - patient has no linked user', [
                'refund_request_id' => $refundRequest->id,
            ]);
            return;
        }

        self::sendMail(
            $patientUser,
            'Reminder: Refund pickup deadline approaching',
            'emails.refund_deadline_reminder',
            self::buildEmailData($refundRequest)
        );

        $refundRequest->forceFill([
            'pickup_reminder_sent_at' => now(),
        ])->save();

        SystemLogService::logRefund(
            'pickup_reminder',
            $refundRequest->id,
            "Reminder sent for refund request #{$refundRequest->id} pickup deadline.",
            [
                'refund_request_id' => $refundRequest->id,
                'deadline_at' => optional($refundRequest->deadline_at)?->toDateTimeString(),
            ]
        );
    }

    protected static function buildReadyNotificationBody(RefundRequest $refundRequest): string
    {
        $deadline = optional($refundRequest->deadline_at)?->format('M d, Y');
        $amount = number_format((float) $refundRequest->refund_amount, 2);

        return "Your refund of ₱{$amount} is ready for pickup at the clinic. Please claim it on or before {$deadline}.";
    }

    /**
     * @param array<string, mixed> $extra
     */
    protected static function buildEmailData(RefundRequest $refundRequest, array $extra = []): array
    {
        $refundRequest->loadMissing(['patient.user', 'appointment.service']);

        return array_merge([
            'refundRequest' => $refundRequest,
            'patient' => $refundRequest->patient,
            'user' => optional($refundRequest->patient)->user,
            'appointment' => $refundRequest->appointment,
            'service' => optional($refundRequest->appointment)->service,
            'deadline_at' => $refundRequest->deadline_at,
            'refund_amount' => $refundRequest->refund_amount,
        ], $extra);
    }

    protected static function sendMail(User $user, string $subject, string $view, array $data): void
    {
        if (!$user->email) {
            return;
        }

        Mail::send($view, $data, function ($message) use ($user, $subject) {
            $message->to($user->email)
                ->subject($subject);
        });
    }

    protected static function dispatchPatientNotification(
        User $user,
        string $type,
        string $title,
        string $body,
        array $data = []
    ): void {
        $notificationId = DB::table('notifications')->insertGetId([
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'severity' => 'info',
            'scope' => 'targeted',
            'audience_roles' => null,
            'effective_from' => now(),
            'effective_until' => null,
            'data' => json_encode($data),
            'created_by' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('notification_targets')->insert([
            'notification_id' => $notificationId,
            'user_id' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}

