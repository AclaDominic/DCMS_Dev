<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\PolicyHistory;
use App\Models\Notification;
use App\Models\NotificationTarget;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class PolicySettingsController extends Controller
{
    /**
     * Get current policy settings (admin only)
     * GET /api/admin/policy-settings
     * Returns the currently active policies that are displayed to users
     */
    public function show()
    {
        // Get the currently active policies (same as what users see via publicShow)
        $privacyPolicy = AppSetting::get('policy.privacy_policy', '');
        $termsConditions = AppSetting::get('policy.terms_conditions', '');
        
        return response()->json([
            'privacy_policy' => $privacyPolicy,
            'terms_conditions' => $termsConditions,
            'effective_date' => AppSetting::get('policy.effective_date', now()->format('Y-m-d')),
            'contact_email' => AppSetting::get('policy.contact_email', 'kreativedent@gmail.com'),
            'contact_phone' => AppSetting::get('policy.contact_phone', '0927 759 2845'),
        ]);
    }

    /**
     * Get policy for public display (no auth required)
     * GET /api/policy
     */
    public function publicShow()
    {
        return response()->json([
            'privacy_policy' => AppSetting::get('policy.privacy_policy', ''),
            'terms_conditions' => AppSetting::get('policy.terms_conditions', ''),
            'effective_date' => AppSetting::get('policy.effective_date', now()->format('Y-m-d')),
            'contact_email' => AppSetting::get('policy.contact_email', 'kreativedent@gmail.com'),
            'contact_phone' => AppSetting::get('policy.contact_phone', '0927 759 2845'),
        ]);
    }

    /**
     * Update policy settings (admin only)
     * PUT /api/admin/policy-settings
     */
    public function update(Request $request)
    {
        $data = $request->validate([
            'privacy_policy' => 'sometimes|string',
            'terms_conditions' => 'sometimes|string',
            'effective_date' => 'sometimes|date|after_or_equal:today',
            'contact_email' => 'sometimes|email|max:255',
            'contact_phone' => 'sometimes|string|max:50',
        ]);

        // Additional validation: effective_date cannot be in the past
        if (array_key_exists('effective_date', $data)) {
            $effectiveDate = Carbon::parse($data['effective_date']);
            $today = Carbon::today();
            if ($effectiveDate->lt($today)) {
                return response()->json([
                    'message' => 'Effective date cannot be in the past. Please select today or a future date.',
                    'errors' => ['effective_date' => ['Effective date cannot be in the past.']]
                ], 422);
            }
        }

        // Get current values to determine what to save
        $privacyPolicy = array_key_exists('privacy_policy', $data) 
            ? $data['privacy_policy'] 
            : AppSetting::get('policy.privacy_policy', '');
        $termsConditions = array_key_exists('terms_conditions', $data) 
            ? $data['terms_conditions'] 
            : AppSetting::get('policy.terms_conditions', '');
        $effectiveDate = array_key_exists('effective_date', $data) 
            ? $data['effective_date'] 
            : AppSetting::get('policy.effective_date', now()->format('Y-m-d'));
        $contactEmail = array_key_exists('contact_email', $data) 
            ? $data['contact_email'] 
            : AppSetting::get('policy.contact_email', 'kreativedent@gmail.com');
        $contactPhone = array_key_exists('contact_phone', $data) 
            ? $data['contact_phone'] 
            : AppSetting::get('policy.contact_phone', '0927 759 2845');

        // Update settings
        if (array_key_exists('privacy_policy', $data)) {
            AppSetting::set('policy.privacy_policy', $data['privacy_policy']);
        }
        if (array_key_exists('terms_conditions', $data)) {
            AppSetting::set('policy.terms_conditions', $data['terms_conditions']);
        }
        if (array_key_exists('effective_date', $data)) {
            AppSetting::set('policy.effective_date', $data['effective_date']);
        }
        if (array_key_exists('contact_email', $data)) {
            AppSetting::set('policy.contact_email', $data['contact_email']);
        }
        if (array_key_exists('contact_phone', $data)) {
            AppSetting::set('policy.contact_phone', $data['contact_phone']);
        }

        // Save history with the new policy values (what became active)
        PolicyHistory::create([
            'privacy_policy' => $privacyPolicy,
            'terms_conditions' => $termsConditions,
            'effective_date' => $effectiveDate,
            'contact_email' => $contactEmail,
            'contact_phone' => $contactPhone,
            'created_by' => Auth::id(),
        ]);

        // Send notification to all users about policy update
        $this->notifyPolicyUpdate($effectiveDate, Auth::id());

        return response()->json([
            'message' => 'Policy settings updated successfully.',
            'data' => $this->show()->getData(true),
        ]);
    }

    /**
     * Send notification to all users about policy update
     */
    private function notifyPolicyUpdate(string $effectiveDate, ?int $createdBy): void
    {
        $effectiveDateFormatted = Carbon::parse($effectiveDate)->format('F d, Y');
        
        // Create broadcast notification
        $notification = Notification::create([
            'type' => 'policy_update',
            'title' => 'Policy Update - Terms & Privacy Policy',
            'body' => "The Terms & Conditions and Privacy Policy have been updated. The new policy will be effective starting {$effectiveDateFormatted}. Please review the updated policies.",
            'severity' => 'info',
            'scope' => 'broadcast',
            'audience_roles' => ['admin', 'staff', 'patient', 'dentist'], // All user roles
            'effective_from' => now(),
            'effective_until' => null,
            'data' => [
                'effective_date' => $effectiveDate,
                'effective_date_formatted' => $effectiveDateFormatted,
                'policy_type' => 'terms_and_privacy',
            ],
            'created_by' => $createdBy,
        ]);

        // Target the notification to all users
        $allUsers = User::where('status', 'activated')->get();
        foreach ($allUsers as $user) {
            NotificationTarget::create([
                'notification_id' => $notification->id,
                'user_id' => $user->id,
                'read_at' => null,
            ]);
        }
    }

    /**
     * Get policy history list (admin only)
     * GET /api/admin/policy-settings/history
     */
    public function history()
    {
        $history = PolicyHistory::with('creator:id,name')
            ->orderBy('effective_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($item) {
                $effectiveDate = $item->effective_date instanceof \Carbon\Carbon 
                    ? $item->effective_date 
                    : \Carbon\Carbon::parse($item->effective_date);
                $createdAt = $item->created_at instanceof \Carbon\Carbon 
                    ? $item->created_at 
                    : \Carbon\Carbon::parse($item->created_at);
                    
                return [
                    'id' => $item->id,
                    'effective_date' => $effectiveDate->format('Y-m-d'),
                    'created_at' => $createdAt->format('Y-m-d H:i:s'),
                    'created_by' => $item->creator ? $item->creator->name : 'System',
                    'has_privacy_policy' => !empty($item->privacy_policy),
                    'has_terms_conditions' => !empty($item->terms_conditions),
                ];
            });

        return response()->json($history);
    }

    /**
     * Get a specific policy version (admin only)
     * GET /api/admin/policy-settings/history/{id}
     */
    public function showHistory($id)
    {
        $history = PolicyHistory::with('creator:id,name')->findOrFail($id);

        $effectiveDate = $history->effective_date instanceof \Carbon\Carbon 
            ? $history->effective_date 
            : \Carbon\Carbon::parse($history->effective_date);
        $createdAt = $history->created_at instanceof \Carbon\Carbon 
            ? $history->created_at 
            : \Carbon\Carbon::parse($history->created_at);

        return response()->json([
            'id' => $history->id,
            'privacy_policy' => $history->privacy_policy ?? '',
            'terms_conditions' => $history->terms_conditions ?? '',
            'effective_date' => $effectiveDate->format('Y-m-d'),
            'contact_email' => $history->contact_email ?? '',
            'contact_phone' => $history->contact_phone ?? '',
            'created_at' => $createdAt->format('Y-m-d H:i:s'),
            'created_by' => $history->creator ? $history->creator->name : 'System',
        ]);
    }
}

