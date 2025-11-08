<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\OfflineEmailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class PatientEmailVerificationController extends Controller
{
    /**
     * Resend the verification email, optionally updating the patient's email address.
     */
    public function resend(Request $request)
    {
        $user = $request->user();

        if (! $user || $user->role !== 'patient') {
            return response()->json([
                'message' => 'Only patient accounts can perform this action.',
            ], 403);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email already verified.',
                'email_verified' => true,
            ]);
        }

        $validated = $request->validate([
            'email' => [
                'nullable',
                'string',
                'email:filter',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
        ]);

        if (! empty($validated['email']) && strcasecmp($validated['email'], $user->email) !== 0) {
            $user->forceFill([
                'email' => strtolower($validated['email']),
                'email_verified_at' => null,
            ])->save();

            // Update the currently authenticated session email
            Auth::setUser($user);
        }

        $emailSent = OfflineEmailService::queueEmailVerification($user);

        return response()->json([
            'message' => $emailSent ? 'Verification email sent.' : 'Verification email queued for sending.',
            'email_sent' => $emailSent,
            'email' => $user->email,
        ]);
    }
}

