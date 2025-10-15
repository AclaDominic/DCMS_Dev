<?php

namespace App\Console\Commands;

use App\Services\OfflineEmailService;
use Illuminate\Console\Command;

class RetryQueuedEmails extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'emails:retry-queued 
                            {--type= : Specific email type to retry (email_verification, password_reset, etc.)}
                            {--limit=10 : Maximum number of emails to retry}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Retry sending queued emails that failed due to connectivity issues';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting queued email retry process...');
        
        // Check if email service is available
        if (!OfflineEmailService::isEmailServiceAvailable()) {
            $this->warn('Email service appears to be unavailable. Skipping retry.');
            return 1;
        }
        
        $limit = (int) $this->option('limit');
        $type = $this->option('type');
        
        $this->info("Retrying up to {$limit} queued emails" . ($type ? " of type '{$type}'" : ''));
        
        $retried = OfflineEmailService::retryFailedEmailVerifications();
        
        if ($retried > 0) {
            $this->info("Successfully retried {$retried} email verifications.");
        } else {
            $this->info('No queued emails found to retry.');
        }
        
        // Show statistics
        $stats = OfflineEmailService::getQueuedEmailStats();
        $this->table(
            ['Statistic', 'Count'],
            [
                ['Total Queued (30 days)', $stats['total']],
                ['Pending', $stats['pending']],
                ['Sent', $stats['sent']],
                ['Failed', $stats['failed']],
                ['Email Service Available', $stats['email_service_available'] ? 'Yes' : 'No'],
            ]
        );
        
        return 0;
    }
}
