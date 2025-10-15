<?php

namespace App\Jobs;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class NoShowEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 120;
    public $backoff = [30, 60, 120]; // Retry after 30s, 60s, 120s

    protected $appointment;

    /**
     * Create a new job instance.
     */
    public function __construct(Appointment $appointment)
    {
        $this->appointment = $appointment;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            Log::info('Processing no-show email notification', [
                'appointment_id' => $this->appointment->id,
                'patient_id' => $this->appointment->patient_id
            ]);

            // Check if patient has email
            if (!$this->appointment->patient || !$this->appointment->patient->user || !$this->appointment->patient->user->email) {
                Log::warning("Skipping no-show email - no email for patient", [
                    'appointment_id' => $this->appointment->id,
                    'patient_id' => $this->appointment->patient_id
                ]);
                return;
            }

            $patient = $this->appointment->patient;
            $user = $patient->user;
            $service = $this->appointment->service;
            $latestPayment = $this->appointment->latestPayment;

            // Check if appointment was paid through Maya
            $isMayaPayment = $latestPayment && 
                            $latestPayment->method === 'maya' && 
                            $latestPayment->status === 'paid';

            // Prepare email data
            $emailData = [
                'patient' => $patient,
                'user' => $user,
                'appointment' => $this->appointment,
                'service' => $service,
                'appointmentDate' => Carbon::parse($this->appointment->date)->format('F j, Y'),
                'appointmentTime' => $this->formatTimeSlot($this->appointment->time_slot),
                'referenceCode' => $this->appointment->reference_code,
                'isMayaPayment' => $isMayaPayment,
                'paymentAmount' => $latestPayment ? $latestPayment->amount_paid : null,
                'canReschedule' => $isMayaPayment, // Can reschedule if paid through Maya
            ];

            // Send email
            Mail::send('emails.no-show-notification', $emailData, function ($message) use ($user) {
                $message->to($user->email, $user->name ?? $user->email)
                    ->subject('Appointment No-Show Notification - Kreative Dental');
            });

            Log::info("No-show email sent successfully", [
                'appointment_id' => $this->appointment->id,
                'patient_email' => $user->email,
                'is_maya_payment' => $isMayaPayment,
                'can_reschedule' => $isMayaPayment
            ]);

        } catch (\Exception $e) {
            Log::error("Failed to send no-show email", [
                'appointment_id' => $this->appointment->id,
                'patient_email' => $this->appointment->patient->user->email ?? 'unknown',
                'error' => $e->getMessage()
            ]);

            // Re-throw to trigger retry mechanism
            throw $e;
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
        Log::error('No-show email job failed permanently', [
            'appointment_id' => $this->appointment->id,
            'error' => $exception->getMessage(),
            'attempts' => $this->attempts()
        ]);
    }
}
