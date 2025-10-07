<?php

namespace App\Helpers;

use Aws\Sns\SnsClient;
use App\Models\Appointment;
use App\Models\NotificationLog;
use App\Models\SmsWhitelist;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Generic send with SMS logging and whitelisting support.
     * Always creates a notification_logs row; decides whether to send via SNS based on env flags and whitelist.
     */
    public static function send(string $to = null, string $subject = 'Notification', string $message = ''): void
    {
        // 1) Always create a log row
        $log = NotificationLog::create([
            'channel'    => 'sms',
            'to'         => $to ?? 'N/A',
            'message'    => $message,
            'status'     => 'pending',
            'meta'       => ['subject' => $subject],
            'created_by' => Auth::check() ? Auth::id() : null,
        ]);

        // 2) Read toggle and whitelist from env (user will set values manually)
        $smsEnabled    = filter_var(env('SMS_ENABLED', false), FILTER_VALIDATE_BOOLEAN);
        $envWhitelist  = array_filter(array_map('trim', explode(',', (string) env('SMS_WHITELIST', ''))));
        $inEnvWhitelist = $to && in_array($to, $envWhitelist, true);
        $inDbWhitelist  = $to ? SmsWhitelist::where('phone_e164', $to)->exists() : false;

        // 3) If disabled or not whitelisted → block and log
        if (!$smsEnabled || !$to || !($inEnvWhitelist || $inDbWhitelist)) {
            $log->update(['status' => 'blocked_sandbox']);
            Log::info("SMS blocked_sandbox: {$subject} to {$to}");
            return;
        }

        // 4) Send via AWS SNS
        $sns = new SnsClient([
            'version'     => '2010-03-31',
            'region'      => config('services.sns.region'),
            'credentials' => [
                'key'    => env('AWS_ACCESS_KEY_ID'),
                'secret' => env('AWS_SECRET_ACCESS_KEY'),
            ],
        ]);

        try {
            $result = $sns->publish([
                'Message'        => $message,
                'PhoneNumber'    => $to,
                'MessageAttributes' => array_filter([
                    'AWS.SNS.SMS.SMSType' => [
                        'DataType'    => 'String',
                        'StringValue' => config('services.sns.sms_type'),
                    ],
                    'AWS.SNS.SMS.SenderID' => config('services.sns.sender_id') ? [
                        'DataType'    => 'String',
                        'StringValue' => config('services.sns.sender_id'),
                    ] : null,
                ]),
            ]);

            $log->update([
                'status'               => 'sent',
                'provider_message_id'  => $result['MessageId'] ?? null,
            ]);
            Log::info("SMS sent to {$to}");
        } catch (\Throwable $e) {
            $log->update([
                'status' => 'failed',
                'error'  => $e->getMessage(),
            ]);
            Log::error("SMS failed to {$to}: {$e->getMessage()}");
        }
    }

    /**
     * Build a default reminder message that ALWAYS includes the appointment reference code.
     * If $edited is true and $custom is a non-empty string, the custom message is used.
     */
    public static function buildAppointmentReminderMessage(Appointment $appointment, ?string $custom = null, bool $edited = false): string
    {
        $userName   = optional(optional($appointment->patient)->user)->name ?? 'Patient';
        $service    = optional($appointment->service)->name ?? 'your service';
        $date       = (string) $appointment->date;
        $timeSlot   = (string) $appointment->time_slot;
        $refCode    = (string) ($appointment->reference_code ?? 'N/A');

        $default = "Hello {$userName}, this is a reminder for your dental appointment on {$date} at {$timeSlot} for {$service}. Ref: {$refCode}. Please arrive on time. – Pitogo's Dental Clinic";

        if ($edited && is_string($custom) && trim($custom) !== '') {
            return $custom;
        }

        return $default;
    }

    /**
     * Convenience helper: send a reminder for an appointment.
     * - Ensures the message includes the reference code (unless an edited custom message is provided).
     * - Logs to laravel.log (no real SMS).
     * Returns true if a message was "sent" (logged), false if there was no recipient.
     */
    public static function sendAppointmentReminder(Appointment $appointment, ?string $custom = null, bool $edited = false): bool
    {
        $user   = optional($appointment->patient)->user;
        $to     = $user->contact_number ?? null;

        if (!$to) {
            Log::warning('Reminder not sent: missing contact number', [
                'appointment_id' => $appointment->id,
                'reference_code' => $appointment->reference_code,
            ]);
            return false;
        }

        $message = self::buildAppointmentReminderMessage($appointment, $custom, $edited);

        // For now, just log it (keeps AWS SNS commented out)
        self::send($to, 'Dental Appointment Reminder', $message);

        // Optional structured log line (handy for searching in logs)
        Log::info('Reminder logged (simulated SMS)', [
            'appointment_id' => $appointment->id,
            'reference_code' => $appointment->reference_code,
            'to'             => $to,
            'edited'         => $edited,
        ]);

        return true;
    }
}
