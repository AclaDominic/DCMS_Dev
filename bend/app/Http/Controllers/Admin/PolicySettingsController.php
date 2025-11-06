<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use Illuminate\Http\Request;

class PolicySettingsController extends Controller
{
    /**
     * Get current policy settings (admin only)
     * GET /api/admin/policy-settings
     */
    public function show()
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
            'effective_date' => 'sometimes|date',
            'contact_email' => 'sometimes|email|max:255',
            'contact_phone' => 'sometimes|string|max:50',
        ]);

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

        return response()->json([
            'message' => 'Policy settings updated successfully.',
            'data' => $this->show()->getData(true),
        ]);
    }
}

