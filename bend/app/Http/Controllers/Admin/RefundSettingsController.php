<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\RefundSetting;
use Illuminate\Http\Request;

class RefundSettingsController extends Controller
{
    /**
     * Get current refund settings
     */
    public function show()
    {
        $settings = RefundSetting::getSettings();
        return response()->json($settings);
    }

    /**
     * Update refund settings
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'cancellation_deadline_hours' => 'required|integer|min:0|max:168',
            'monthly_cancellation_limit' => 'required|integer|min:0|max:50',
            'create_zero_refund_request' => 'required|boolean',
            'reminder_days' => 'required|integer|min:1|max:30',
        ]);

        $settings = RefundSetting::getSettings();
        $settings->update($validated);

        return response()->json([
            'message' => 'Refund settings updated successfully.',
            'settings' => $settings,
        ]);
    }
}
