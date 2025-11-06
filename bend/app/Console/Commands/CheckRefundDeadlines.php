<?php

namespace App\Console\Commands;

use Carbon\Carbon;
use App\Models\RefundRequest;
use App\Services\SystemLogService;
use Illuminate\Console\Command;
use App\Services\NotificationService as SystemNotificationService;

class CheckRefundDeadlines extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'refunds:check-deadlines';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check refund request deadlines and send alerts for approaching/overdue refunds';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $now = now();
        $approachingThreshold = $now->copy()->addDays(2)->endOfDay(); // 2 days before deadline
        $overdueRefunds = [];
        $approachingRefunds = [];

        // Get pending and approved refund requests with deadlines
        $refundRequests = RefundRequest::whereIn('status', [RefundRequest::STATUS_PENDING, RefundRequest::STATUS_APPROVED])
            ->whereNotNull('deadline_at')
            ->with(['patient.user', 'appointment'])
            ->get();

        foreach ($refundRequests as $refund) {
            if (!$refund->deadline_at) {
                continue;
            }

            $deadline = Carbon::parse($refund->deadline_at);

            // Check if overdue
            if ($now->isAfter($deadline)) {
                $overdueRefunds[] = $refund;
            }
            // Check if approaching (within 2 days)
            elseif ($deadline->lte($approachingThreshold) && $deadline->isAfter($now)) {
                $approachingRefunds[] = $refund;
            }
        }

        // Send alerts for overdue refunds
        foreach ($overdueRefunds as $refund) {
            $daysOverdue = $now->diffInDays($refund->deadline_at);
            
            $this->info("Overdue refund request #{$refund->id} - {$daysOverdue} day(s) overdue");
            
            // Log the overdue status
            SystemLogService::logRefund(
                'deadline_overdue',
                $refund->id,
                "Refund request #{$refund->id} is {$daysOverdue} day(s) overdue (deadline: {$refund->deadline_at->format('Y-m-d')})",
                [
                    'refund_request_id' => $refund->id,
                    'deadline_at' => $refund->deadline_at->toDateString(),
                    'days_overdue' => $daysOverdue,
                    'status' => $refund->status,
                ]
            );

            // TODO: Send notification to admins about overdue refunds
            // This could be implemented with a notification system
        }

        // Send alerts for approaching deadlines
        foreach ($approachingRefunds as $refund) {
            $daysRemaining = $now->diffInDays($refund->deadline_at, false);
            
            $this->info("Approaching deadline for refund request #{$refund->id} - {$daysRemaining} day(s) remaining");
            
            // Log the approaching deadline
            SystemLogService::logRefund(
                'deadline_approaching',
                $refund->id,
                "Refund request #{$refund->id} deadline approaching (deadline: {$refund->deadline_at->format('Y-m-d')}, {$daysRemaining} day(s) remaining)",
                [
                    'refund_request_id' => $refund->id,
                    'deadline_at' => $refund->deadline_at->toDateString(),
                    'days_remaining' => $daysRemaining,
                    'status' => $refund->status,
                ]
            );

            // TODO: Send notification to admins about approaching deadlines
            // This could be implemented with a notification system
        }

        $totalAlerts = count($overdueRefunds) + count($approachingRefunds);
        
        if ($totalAlerts > 0) {
            $this->warn("Found {$totalAlerts} refund(s) requiring attention:");
            $this->warn("  - " . count($overdueRefunds) . " overdue");
            $this->warn("  - " . count($approachingRefunds) . " approaching deadline");
        } else {
            $this->info("No refund deadlines requiring attention.");
        }

        return self::SUCCESS;
    }
}

