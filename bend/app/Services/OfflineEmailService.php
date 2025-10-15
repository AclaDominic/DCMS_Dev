<?php

namespace App\Services;

use App\Models\User;
use App\Jobs\SendEmailVerificationJob;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\DB;

class OfflineEmailService
{
    /**
     * Queue email verification for a user
     * This method will attempt to send immediately, but if it fails,
     * it will queue the job for retry when connectivity is restored
     */
    public static function queueEmailVerification(User $user): bool
    {
        try {
            // Try to send immediately first
            $user->sendEmailVerificationNotification();
            
            Log::info('Email verification sent immediately', [
                'user_id' => $user->id,
                'email' => $user->email
            ]);
            
            return true;
            
        } catch (\Exception $e) {
            Log::warning('Immediate email sending failed, queuing for retry', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage()
            ]);
            
            // Queue the job for later retry
            SendEmailVerificationJob::dispatch($user)
                ->delay(now()->addMinutes(1)); // Retry in 1 minute
            
            // Store in database for tracking
            self::logQueuedEmail($user, 'email_verification', $e->getMessage());
            
            return false; // Indicate it was queued, not sent immediately
        }
    }

    /**
     * Log queued emails for tracking and manual retry if needed
     */
    private static function logQueuedEmail(User $user, string $type, string $reason): void
    {
        try {
            DB::table('queued_emails')->insert([
                'user_id' => $user->id,
                'email' => $user->email,
                'type' => $type,
                'reason' => $reason,
                'status' => 'queued',
                'created_at' => now(),
                'updated_at' => now()
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to log queued email', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Retry all failed email verifications
     * This can be called manually or via a scheduled command
     */
    public static function retryFailedEmailVerifications(): int
    {
        $queuedEmails = DB::table('queued_emails')
            ->where('type', 'email_verification')
            ->where('status', 'queued')
            ->where('created_at', '>', now()->subDays(7)) // Only retry emails from last 7 days
            ->get();

        $retried = 0;
        
        foreach ($queuedEmails as $queuedEmail) {
            $user = User::find($queuedEmail->user_id);
            
            if ($user && !$user->hasVerifiedEmail()) {
                try {
                    // Try to send the verification email
                    $user->sendEmailVerificationNotification();
                    
                    // Mark as sent
                    DB::table('queued_emails')
                        ->where('id', $queuedEmail->id)
                        ->update([
                            'status' => 'sent',
                            'sent_at' => now(),
                            'updated_at' => now()
                        ]);
                    
                    $retried++;
                    
                    Log::info('Successfully retried email verification', [
                        'user_id' => $user->id,
                        'email' => $user->email,
                        'queued_email_id' => $queuedEmail->id
                    ]);
                    
                } catch (\Exception $e) {
                    Log::warning('Retry attempt failed for email verification', [
                        'user_id' => $user->id,
                        'email' => $user->email,
                        'error' => $e->getMessage(),
                        'queued_email_id' => $queuedEmail->id
                    ]);
                }
            }
        }
        
        return $retried;
    }

    /**
     * Check if email service is available
     */
    public static function isEmailServiceAvailable(): bool
    {
        try {
            // Simple connectivity test - try to resolve mail host
            $mailHost = config('mail.mailers.smtp.host');
            if ($mailHost && $mailHost !== '127.0.0.1') {
                return gethostbyname($mailHost) !== $mailHost;
            }
            
            // For local development or log driver, consider it available
            return true;
            
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get statistics about queued emails
     */
    public static function getQueuedEmailStats(): array
    {
        $stats = DB::table('queued_emails')
            ->selectRaw('
                COUNT(*) as total,
                SUM(CASE WHEN status = "queued" THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = "sent" THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN status = "failed" THEN 1 ELSE 0 END) as failed
            ')
            ->where('created_at', '>', now()->subDays(30))
            ->first();

        return [
            'total' => $stats->total ?? 0,
            'pending' => $stats->pending ?? 0,
            'sent' => $stats->sent ?? 0,
            'failed' => $stats->failed ?? 0,
            'email_service_available' => self::isEmailServiceAvailable()
        ];
    }
}
