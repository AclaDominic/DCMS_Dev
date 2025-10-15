<?php

namespace App\Jobs;

use App\Models\Appointment;
use App\Models\Patient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class EmailAppointmentReminderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 120;
    public $backoff = [30, 60, 120]; // Retry after 30s, 60s, 120s

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            Log::info('Starting email appointment reminder job');

            // Get appointments for different reminder periods
            $this->sendRemindersForPeriod(2, '2 days before'); // 2 days before
            $this->sendRemindersForPeriod(1, '1 day before');  // 1 day before
            $this->sendRemindersForPeriod(0, 'today');         // Today

            Log::info('Email appointment reminder job completed successfully');

        } catch (\Exception $e) {
            Log::error('Failed to process email appointment reminders', [
                'error' => $e->getMessage(),
                'attempt' => $this->attempts()
            ]);

            // Re-throw to trigger retry mechanism
            throw $e;
        }
    }

    /**
     * Send reminders for appointments X days before
     */
    private function sendRemindersForPeriod(int $daysBefore, string $periodDescription): void
    {
        $targetDate = Carbon::now()->addDays($daysBefore)->format('Y-m-d');
        
        Log::info("Processing reminders for {$periodDescription} (date: {$targetDate})");

        // Get appointments for the target date
        $appointments = Appointment::with(['patient.user', 'service'])
            ->where('date', $targetDate)
            ->whereIn('status', ['pending', 'approved'])
            ->get();

        Log::info("Found {$appointments->count()} appointments for {$periodDescription}");

        foreach ($appointments as $appointment) {
            $this->sendReminderEmail($appointment, $daysBefore, $periodDescription);
        }
    }

    /**
     * Send reminder email for a specific appointment
     */
    private function sendReminderEmail(Appointment $appointment, int $daysBefore, string $periodDescription): void
    {
        try {
            // Check if patient has email
            if (!$appointment->patient || !$appointment->patient->user || !$appointment->patient->user->email) {
                Log::warning("Skipping appointment reminder - no email for patient", [
                    'appointment_id' => $appointment->id,
                    'patient_id' => $appointment->patient_id
                ]);
                return;
            }

            $patient = $appointment->patient;
            $user = $patient->user;
            $service = $appointment->service;

            // Prepare email data
            $emailData = [
                'patient' => $patient,
                'user' => $user,
                'appointment' => $appointment,
                'service' => $service,
                'appointmentDate' => Carbon::parse($appointment->date)->format('F j, Y'),
                'appointmentTime' => $this->formatTimeSlot($appointment->time_slot),
                'daysBefore' => $daysBefore,
                'periodDescription' => $periodDescription,
                'referenceCode' => $appointment->reference_code,
            ];

            // Send email
            Mail::send('emails.appointment-reminder', $emailData, function ($message) use ($user, $appointment, $periodDescription) {
                $message->to($user->email, $user->name ?? $user->email)
                    ->subject("Appointment Reminder - {$periodDescription} - Kreative Dental");
            });

            Log::info("Appointment reminder email sent successfully", [
                'appointment_id' => $appointment->id,
                'patient_email' => $user->email,
                'period' => $periodDescription,
                'appointment_date' => $appointment->date
            ]);

        } catch (\Exception $e) {
            Log::error("Failed to send appointment reminder email", [
                'appointment_id' => $appointment->id,
                'patient_email' => $appointment->patient->user->email ?? 'unknown',
                'error' => $e->getMessage(),
                'period' => $periodDescription
            ]);
        }
    }

    /**
     * Format time slot for display
     */
    private function formatTimeSlot(?string $timeSlot): string
    {
        if (!$timeSlot) {
            return 'Time to be confirmed';
        }

        // If it's in format "HH:MM-HH:MM", extract start time
        if (strpos($timeSlot, '-') !== false) {
            $startTime = trim(explode('-', $timeSlot)[0]);
            return Carbon::createFromFormat('H:i', $startTime)->format('g:i A');
        }

        // If it's just a time, format it
        try {
            return Carbon::createFromFormat('H:i', $timeSlot)->format('g:i A');
        } catch (\Exception $e) {
            return $timeSlot; // Return as-is if parsing fails
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('Email appointment reminder job failed permanently', [
            'error' => $exception->getMessage(),
            'attempts' => $this->attempts()
        ]);
    }
}
