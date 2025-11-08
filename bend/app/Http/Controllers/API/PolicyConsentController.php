<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\PolicyHistory;
use App\Models\AppSetting;
use App\Services\SystemLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PolicyConsentController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('patient');
        $patient = $user?->patient;

        $activeHistoryId = AppSetting::get('policy.active_history_id');
        $activeHistory = $activeHistoryId ? PolicyHistory::find($activeHistoryId) : null;

        if (!$activeHistory) {
            $activeHistory = PolicyHistory::orderByDesc('effective_date')->first();
            if ($activeHistory && !$activeHistoryId) {
                AppSetting::set('policy.active_history_id', $activeHistory->id);
                $activeHistoryId = $activeHistory->id;
            }
        }

        $acceptedPolicyId = $patient?->policy_history_id;
        $needsAcceptance = $patient
            ? ($activeHistoryId && (int) $acceptedPolicyId !== (int) $activeHistoryId)
            : false;

        return response()->json([
            'active_policy' => $activeHistory ? [
                'id' => $activeHistory->id,
                'effective_date' => $activeHistory->effective_date?->format('Y-m-d'),
                'privacy_policy' => $activeHistory->privacy_policy,
                'terms_conditions' => $activeHistory->terms_conditions,
                'contact_email' => $activeHistory->contact_email,
                'contact_phone' => $activeHistory->contact_phone,
            ] : null,
            'accepted_policy_id' => $acceptedPolicyId,
            'accepted_at' => $patient?->policy_accepted_at?->toIso8601String(),
            'needs_acceptance' => $needsAcceptance,
            'role' => $user->role ?? null,
        ]);
    }

    public function accept(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('patient');
        $patient = $user?->patient;

        if (!$patient) {
            return response()->json([
                'message' => 'Only patient accounts can accept the policy.',
            ], 403);
        }

        $activeHistoryId = AppSetting::get('policy.active_history_id');
        if (!$activeHistoryId) {
            return response()->json([
                'message' => 'No active policy version found. Please contact support.',
            ], 409);
        }

        $history = PolicyHistory::find($activeHistoryId);
        if (!$history) {
            return response()->json([
                'message' => 'Active policy version is unavailable.',
            ], 404);
        }

        $patient->forceFill([
            'policy_history_id' => $history->id,
            'policy_accepted_at' => now(),
        ])->save();

        SystemLogService::logPatient(
            'policy_acceptance',
            $patient->id,
            'Patient accepted updated Terms & Privacy Policy.',
            [
                'patient_id' => $patient->id,
                'user_id' => $user->id,
                'policy_history_id' => $history->id,
                'effective_date' => $history->effective_date?->format('Y-m-d'),
            ]
        );

        return response()->json([
            'message' => 'Policy accepted successfully.',
            'accepted_policy_id' => $history->id,
            'accepted_at' => $patient->policy_accepted_at?->toIso8601String(),
        ]);
    }
}


