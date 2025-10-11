<?php

namespace App\Services;

use App\Models\Patient;
use App\Models\PatientManager;
use App\Models\Appointment;
use App\Models\Notification;
use App\Models\NotificationTarget;
use App\Models\User;
use App\Helpers\NotificationService as SmsNotificationService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PatientManagerService
{
    /**
     * Handle a no-show event for a patient
     */
    public static function handleNoShow(Appointment $appointment): void
    {
        if ($appointment->status !== 'no_show' || !$appointment->patient) {
            return;
        }

        $patient = $appointment->patient;
        $patientManager = PatientManager::getOrCreateForPatient($patient->id);
        
        // Increment no-show count
        $patientManager->incrementNoShow();
        
        Log::info('Patient no-show tracked', [
            'patient_id' => $patient->id,
            'appointment_id' => $appointment->id,
            'no_show_count' => $patientManager->no_show_count,
        ]);

        // Check if patient should receive a warning
        if ($patientManager->shouldReceiveWarning()) {
            self::sendWarning($patientManager, $appointment);
        }

        // Check if patient should be blocked
        if ($patientManager->shouldBeBlocked()) {
            self::blockPatient($patientManager, $appointment);
        }

        // Send admin notification for patients with 2+ no-shows
        if ($patientManager->no_show_count >= 2) {
            self::sendAdminNotification($patientManager, $appointment);
        }
    }

    /**
     * Send warning to patient
     */
    public static function sendWarning(PatientManager $patientManager, ?Appointment $appointment = null, ?string $customMessage = null): bool
    {
        $patient = $patientManager->patient;
        
        if (!$patient || !$patient->user) {
            return false;
        }

        $noShowCount = $patientManager->no_show_count;
        $warningCount = $patientManager->warning_count + 1;

        // Default warning message
        if (!$customMessage) {
            $customMessage = "Warning #{$warningCount}: You have {$noShowCount} no-show(s) on your record. " .
                           "Continued no-shows may result in account restrictions. " .
                           "Please contact us if you need to reschedule appointments.";
        }

        // Send SMS notification
        if ($patient->user->contact_number) {
            SmsNotificationService::send(
                $patient->user->contact_number,
                'No-Show Warning - Dental Clinic',
                $customMessage
            );
        }

        // Create in-app notification
        $notification = Notification::create([
            'type' => 'no_show_warning',
            'title' => 'No-Show Warning',
            'body' => $customMessage,
            'severity' => 'warning',
            'scope' => 'targeted',
            'audience_roles' => null,
            'effective_from' => now(),
            'effective_until' => null,
            'data' => [
                'patient_id' => $patient->id,
                'no_show_count' => $noShowCount,
                'warning_count' => $warningCount,
                'appointment_id' => $appointment?->id,
            ],
            'created_by' => null, // system
        ]);

        // Target the notification to the patient
        NotificationTarget::create([
            'notification_id' => $notification->id,
            'user_id' => $patient->user_id,
            'read_at' => null,
        ]);

        // Update patient manager record
        $patientManager->sendWarning($customMessage, Auth::check() ? Auth::id() : 1);

        Log::info('No-show warning sent', [
            'patient_id' => $patient->id,
            'no_show_count' => $noShowCount,
            'warning_count' => $warningCount,
        ]);

        return true;
    }

    /**
     * Block a patient
     */
    public static function blockPatient(PatientManager $patientManager, ?Appointment $appointment = null, ?string $reason = null, string $blockType = 'account', ?string $ip = null): bool
    {
        $patient = $patientManager->patient;
        
        if (!$patient) {
            return false;
        }

        // Default block reason
        if (!$reason) {
            $reason = "Automatically blocked due to {$patientManager->no_show_count} no-show(s). " .
                     "This affects our clinic operations and scheduling.";
        }

        // Block the patient
        $patientManager->blockPatient($reason, $blockType, $ip, Auth::check() ? Auth::id() : 1);

        // Create in-app notification with specific messaging based on block type
        $notificationTitle = '';
        $notificationBody = '';
        
        switch ($blockType) {
            case 'account':
                $notificationTitle = '🚫 Account Blocked';
                $notificationBody = "Your account has been temporarily blocked from booking appointments due to multiple no-shows. Please visit our clinic in person with a valid ID to restore your booking privileges. You can still receive walk-in services.";
                break;
            case 'ip':
                $notificationTitle = '🌐 Network Blocked';
                $notificationBody = "Your network/IP address has been blocked from booking appointments. Try switching to a different network (mobile data, different WiFi) or contact our clinic for assistance. You can still visit us in person for services.";
                break;
            case 'both':
                $notificationTitle = '🚫 Account & Network Blocked';
                $notificationBody = "Your account and network have been blocked from booking appointments. First, try a different network connection. If that doesn't work, visit our clinic in person with a valid ID to resolve the issue. You can still receive walk-in services.";
                break;
            default:
                $notificationTitle = '🚫 Booking Restricted';
                $notificationBody = "Your account has been temporarily blocked from booking new appointments due to multiple no-shows. Please contact our clinic to resolve this issue.";
                break;
        }
        
        $notification = Notification::create([
            'type' => 'account_blocked',
            'title' => $notificationTitle,
            'body' => $notificationBody,
            'severity' => 'danger',
            'scope' => 'targeted',
            'audience_roles' => null,
            'effective_from' => now(),
            'effective_until' => null,
            'data' => [
                'patient_id' => $patient->id,
                'block_reason' => $reason,
                'block_type' => $blockType,
                'no_show_count' => $patientManager->no_show_count,
                'appointment_id' => $appointment?->id,
            ],
            'created_by' => null, // system
        ]);

        // Target the notification to the patient if they have a user account
        if ($patient->user_id) {
            NotificationTarget::create([
                'notification_id' => $notification->id,
                'user_id' => $patient->user_id,
                'read_at' => null,
            ]);
        }

        Log::warning('Patient blocked', [
            'patient_id' => $patient->id,
            'no_show_count' => $patientManager->no_show_count,
            'block_reason' => $reason,
            'block_type' => $blockType,
        ]);

        return true;
    }

    /**
     * Unblock a patient
     */
    public static function unblockPatient(PatientManager $patientManager, ?string $reason = null): bool
    {
        $patient = $patientManager->patient;
        
        if (!$patient) {
            return false;
        }

        // Add admin note about unblocking
        if ($reason) {
            $patientManager->addAdminNote("Unblocked: {$reason}", Auth::check() ? Auth::id() : 1);
        }

        // Unblock the patient
        $patientManager->unblockPatient(Auth::check() ? Auth::id() : 1);

        // Create in-app notification
        $notification = Notification::create([
            'type' => 'account_unblocked',
            'title' => 'Appointment Booking Restored',
            'body' => 'Your appointment booking privileges have been restored. You can now book appointments again.',
            'severity' => 'info',
            'scope' => 'targeted',
            'audience_roles' => null,
            'effective_from' => now(),
            'effective_until' => null,
            'data' => [
                'patient_id' => $patient->id,
                'unblock_reason' => $reason,
            ],
            'created_by' => null, // system
        ]);

        // Target the notification to the patient if they have a user account
        if ($patient->user_id) {
            NotificationTarget::create([
                'notification_id' => $notification->id,
                'user_id' => $patient->user_id,
                'read_at' => null,
            ]);
        }

        Log::info('Patient unblocked', [
            'patient_id' => $patient->id,
            'reason' => $reason,
        ]);

        return true;
    }

    /**
     * Get patients with no-shows for admin review
     */
    public static function getPatientsWithNoShows(int $minCount = 1): \Illuminate\Database\Eloquent\Collection
    {
        return PatientManager::with(['patient.user', 'blockedBy', 'lastUpdatedBy'])
            ->where('no_show_count', '>=', $minCount)
            ->orderBy('no_show_count', 'desc')
            ->orderBy('last_no_show_at', 'desc')
            ->get();
    }

    /**
     * Get patients needing attention (warnings or blocks)
     */
    public static function getPatientsNeedingAttention(): \Illuminate\Database\Eloquent\Collection
    {
        return PatientManager::with(['patient.user', 'blockedBy', 'lastUpdatedBy'])
            ->whereIn('block_status', ['warning', 'blocked'])
            ->orWhere('no_show_count', '>=', 3)
            ->orderBy('block_status', 'desc')
            ->orderBy('no_show_count', 'desc')
            ->get();
    }

    /**
     * Get statistics for admin dashboard
     */
    public static function getStatistics(): array
    {
        return [
            'total_patients_with_no_shows' => PatientManager::where('no_show_count', '>', 0)->count(),
            'patients_under_warning' => PatientManager::where('block_status', 'warning')->count(),
            'blocked_patients' => PatientManager::where('block_status', 'blocked')->count(),
            'total_no_shows' => PatientManager::sum('no_show_count'),
            'average_no_shows_per_patient' => PatientManager::where('no_show_count', '>', 0)->avg('no_show_count'),
        ];
    }

    /**
     * Check if a patient is blocked (for use in appointment booking)
     */
    public static function isPatientBlocked(int $patientId, ?string $ip = null): bool
    {
        $blockInfo = self::getPatientBlockInfo($patientId, $ip);
        return $blockInfo['blocked'];
    }

    /**
     * Get detailed blocking information for a patient
     */
    public static function getPatientBlockInfo(int $patientId, ?string $ip = null): array
    {
        $patientManager = PatientManager::where('patient_id', $patientId)->first();
        
        // First check if the current patient is blocked
        if ($patientManager && $patientManager->isBlocked()) {
            $blocked = false;
            $blockType = null;
            $blockReason = $patientManager->block_reason;
            $blockedAt = $patientManager->blocked_at;

            // Check IP blocking if IP is provided
            if ($ip && $patientManager->block_type === 'ip' && $patientManager->blocked_ip === $ip) {
                $blocked = true;
                $blockType = 'ip';
            }
            // Check account blocking
            elseif ($patientManager->block_type === 'account') {
                $blocked = true;
                $blockType = 'account';
            }
            // Check both blocking
            elseif ($patientManager->block_type === 'both') {
                $blocked = true;
                $blockType = 'both';
                
                // Note: For "both" type, we don't change the block type based on IP match
                // The message should indicate that both account and IP are blocked
            }

            if ($blocked) {
                return [
                    'blocked' => $blocked,
                    'block_type' => $blockType,
                    'block_reason' => $blockReason,
                    'blocked_at' => $blockedAt,
                    'blocked_ip' => $patientManager->blocked_ip,
                ];
            }
        }

        // If current patient is not blocked, check if the IP is blocked by ANY patient
        if ($ip) {
            $ipBlockedPatient = PatientManager::where('block_status', 'blocked')
                ->where(function($query) use ($ip) {
                    $query->where('block_type', 'ip')
                          ->orWhere('block_type', 'both');
                })
                ->where('blocked_ip', $ip)
                ->first();

            if ($ipBlockedPatient) {
                // Get the patient who originally blocked this IP
                $blockedByPatient = Patient::find($ipBlockedPatient->patient_id);
                $blockedByName = $blockedByPatient ? $blockedByPatient->first_name . ' ' . $blockedByPatient->last_name : 'Unknown Patient';
                
                return [
                    'blocked' => true,
                    'block_type' => 'ip',
                    'block_reason' => "This IP address has been blocked due to multiple no-shows by {$blockedByName}",
                    'blocked_at' => $ipBlockedPatient->blocked_at,
                    'blocked_ip' => $ip,
                    'blocked_by_patient' => $blockedByName,
                ];
            }
        }

        return [
            'blocked' => false,
            'block_type' => null,
            'block_reason' => null,
            'blocked_at' => null,
        ];
    }

    /**
     * Send admin notification for patients with 2+ no-shows
     */
    public static function sendAdminNotification(PatientManager $patientManager, ?Appointment $appointment = null): void
    {
        $patient = $patientManager->patient;
        
        if (!$patient || !$patient->user) {
            return;
        }

        $noShowCount = $patientManager->no_show_count;
        $patientName = "{$patient->first_name} {$patient->last_name}";
        $patientEmail = $patient->user->email;
        $patientPhone = $patient->user->contact_number;

        // Create admin notification
        $notification = Notification::create([
            'type' => 'patient_no_show_alert',
            'title' => 'Patient No-Show Alert',
            'body' => "Patient {$patientName} ({$patientEmail}) now has {$noShowCount} no-show(s). Consider sending a warning or blocking their account.",
            'severity' => 'warning',
            'scope' => 'broadcast',
            'audience_roles' => ['admin', 'staff'],
            'effective_from' => now(),
            'effective_until' => null,
            'data' => [
                'patient_id' => $patient->id,
                'patient_name' => $patientName,
                'patient_email' => $patientEmail,
                'patient_phone' => $patientPhone,
                'no_show_count' => $noShowCount,
                'appointment_id' => $appointment?->id,
                'last_no_show_at' => $patientManager->last_no_show_at,
                'warning_count' => $patientManager->warning_count,
                'block_status' => $patientManager->block_status,
                'action_required' => $noShowCount >= 3 ? 'Consider blocking patient' : 'Consider sending warning',
            ],
            'created_by' => null, // system
        ]);

        // Target the notification to admin and staff users
        $adminUsers = User::whereIn('role', ['admin', 'staff'])->get();
        foreach ($adminUsers as $adminUser) {
            NotificationTarget::create([
                'notification_id' => $notification->id,
                'user_id' => $adminUser->id,
                'read_at' => null,
            ]);
        }

        Log::info('Admin notification sent for patient no-shows', [
            'patient_id' => $patient->id,
            'patient_name' => $patientName,
            'no_show_count' => $noShowCount,
            'notification_id' => $notification->id,
        ]);
    }
}
