<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\OfflineEmailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QueuedEmailsController extends Controller
{
    /**
     * Display queued emails dashboard
     */
    public function index()
    {
        $stats = OfflineEmailService::getQueuedEmailStats();
        
        $recentQueuedEmails = DB::table('queued_emails')
            ->join('users', 'queued_emails.user_id', '=', 'users.id')
            ->select(
                'queued_emails.*',
                'users.name as user_name',
                'users.email as user_email'
            )
            ->where('queued_emails.created_at', '>', now()->subDays(7))
            ->orderBy('queued_emails.created_at', 'desc')
            ->limit(50)
            ->get();
        
        return response()->json([
            'stats' => $stats,
            'recent_emails' => $recentQueuedEmails
        ]);
    }
    
    /**
     * Retry all queued emails manually
     */
    public function retryAll()
    {
        $retried = OfflineEmailService::retryFailedEmailVerifications();
        
        return response()->json([
            'message' => "Successfully retried {$retried} email verifications.",
            'retried_count' => $retried
        ]);
    }
    
    /**
     * Get detailed statistics
     */
    public function stats()
    {
        $stats = OfflineEmailService::getQueuedEmailStats();
        
        // Additional detailed stats
        $detailedStats = DB::table('queued_emails')
            ->selectRaw('
                COUNT(*) as total,
                SUM(CASE WHEN status = "queued" AND created_at > ? THEN 1 ELSE 0 END) as pending_today,
                SUM(CASE WHEN status = "sent" AND sent_at > ? THEN 1 ELSE 0 END) as sent_today,
                SUM(CASE WHEN status = "failed" AND updated_at > ? THEN 1 ELSE 0 END) as failed_today
            ', [
                now()->startOfDay(),
                now()->startOfDay(),
                now()->startOfDay()
            ])
            ->first();
        
        return response()->json([
            'overview' => $stats,
            'today' => [
                'pending' => $detailedStats->pending_today ?? 0,
                'sent' => $detailedStats->sent_today ?? 0,
                'failed' => $detailedStats->failed_today ?? 0,
            ]
        ]);
    }
}
