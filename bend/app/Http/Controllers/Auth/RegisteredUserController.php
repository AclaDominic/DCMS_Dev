<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\PatientManagerService;
use App\Services\OfflineEmailService;
use App\Helpers\IpHelper;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use App\Services\SystemLogService;

class RegisteredUserController extends Controller
{
    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'contact_number' => ['required', 'regex:/^(09|\+639)\d{9}$/', 'unique:users,contact_number'],
            'birthdate' => ['required', 'date', 'before:today'],
        ]);

        // Check if the IP address is blocked
        $userIp = IpHelper::getRealIpAddress($request);
        $blockedIps = DB::table('patient_manager')
            ->where('block_type', 'ip')
            ->orWhere('block_type', 'both')
            ->where('blocked_ip', $userIp)
            ->where('block_status', 'blocked')
            ->exists();

        // Wrap everything in a transaction to prevent partial registration
        try {
            $user = DB::transaction(function () use ($request, $blockedIps, $userIp) {
                $user = User::create([
                    'name' => $request->name,
                    'email' => $request->email,
                    'password' => Hash::make($request->string('password')),
                    'contact_number' => $request->contact_number,
                    'role' => 'patient',
                    'notes' => "Birthdate: {$request->birthdate}", // Store birthdate in notes for later use
                ]);

                // If IP is blocked, flag the user account for monitoring
                if ($blockedIps) {
                    // Log blocked IP registration
                    SystemLogService::logAuth(
                        'blocked_ip_registration',
                        $user->id,
                        "User registered from blocked IP address: {$userIp}",
                        [
                            'user_id' => $user->id,
                            'name' => $user->name,
                            'email' => $user->email,
                            'blocked_ip' => $userIp,
                            'action_required' => 'monitor_account_activity'
                        ]
                    );

                    // Add a note to track this registration
                    $user->notes = "Birthdate: {$request->birthdate}. Account created from blocked IP address: {$userIp}. Monitor for appointment no-shows.";
                    $user->save();
                } else {
                    // Log successful registration
                    SystemLogService::logAuth(
                        'registered',
                        $user->id,
                        "New user registered: {$user->name}",
                        [
                            'user_id' => $user->id,
                            'name' => $user->name,
                            'email' => $user->email,
                            'role' => 'patient',
                            'ip_address' => $userIp
                        ]
                    );
                }

                // Try to send email verification using offline-aware service
                // This will queue the email if sending fails, but won't rollback the transaction
                $emailSent = OfflineEmailService::queueEmailVerification($user);
                
                if (!$emailSent) {
                    // Email was queued, log this for tracking
                    SystemLogService::logAuth(
                        'email_queued',
                        $user->id,
                        "Email verification queued due to connectivity issues",
                        [
                            'user_id' => $user->id,
                            'email' => $user->email,
                            'status' => 'queued_for_retry'
                        ]
                    );
                }

                return $user;
            });

            // Only login after successful transaction
            Auth::login($user);

            // Check if email was queued
            $emailQueued = !OfflineEmailService::isEmailServiceAvailable();
            
            // Return response with IP blocking information and email status
            if ($blockedIps) {
                return response()->json([
                    'message' => 'Account created successfully. However, your IP address has been flagged due to previous abuse. You will not be able to book appointments online, and your account will be monitored for appointment no-shows. Please contact our clinic for assistance.',
                    'ip_blocked' => true,
                    'warning' => 'Your IP address is blocked from booking appointments due to previous abuse.',
                    'email_queued' => $emailQueued,
                    'email_message' => $emailQueued ? 'Email verification will be sent when connectivity is restored.' : 'Email verification sent successfully.'
                ], 201);
            }

            return response()->json([
                'message' => 'Account created successfully.',
                'ip_blocked' => false,
                'email_queued' => $emailQueued,
                'email_message' => $emailQueued ? 'Email verification will be sent when connectivity is restored.' : 'Email verification sent successfully.'
            ], 201);
        } catch (\Exception $e) {
            // Log the error for debugging
            \Illuminate\Support\Facades\Log::error('Registration failed', [
                'email' => $request->email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            // Return a user-friendly error message
            return response()->json([
                'message' => 'Registration failed. Please try again or contact support if the problem persists.',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred during registration'
            ], 500);
        }
    }
}
