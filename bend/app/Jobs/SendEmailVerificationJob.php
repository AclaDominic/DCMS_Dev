<?php

namespace App\Jobs;

use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Auth\Notifications\VerifyEmail;

class SendEmailVerificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 60;
    public $backoff = [30, 60, 120]; // Retry after 30s, 60s, 120s

    protected $user;

    /**
     * Create a new job instance.
     */
    public function __construct(User $user)
    {
        $this->user = $user;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            Log::info('Sending email verification', [
                'user_id' => $this->user->id,
                'email' => $this->user->email
            ]);

            // Send the verification email using Laravel's built-in notification
            $this->user->sendEmailVerificationNotification();

            Log::info('Email verification sent successfully', [
                'user_id' => $this->user->id,
                'email' => $this->user->email
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to send email verification', [
                'user_id' => $this->user->id,
                'email' => $this->user->email,
                'error' => $e->getMessage(),
                'attempt' => $this->attempts()
            ]);

            // Re-throw to trigger retry mechanism
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('Email verification job failed permanently', [
            'user_id' => $this->user->id,
            'email' => $this->user->email,
            'error' => $exception->getMessage(),
            'attempts' => $this->attempts()
        ]);

        // You could implement additional fallback mechanisms here
        // For example, store in a "pending_verifications" table for manual retry
    }
}
