<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\PatientManagerService;
use App\Helpers\IpHelper;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

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
                    // Create a system log entry for monitoring
                    \App\Models\SystemLog::create([
                        'user_id' => $user->id,
                        'category' => 'registration',
                        'action' => 'blocked_ip_registration',
                        'message' => "User registered from blocked IP address: {$userIp}",
                        'context' => [
                            'user_id' => $user->id,
                            'email' => $user->email,
                            'blocked_ip' => $userIp,
                            'action_required' => 'monitor_account_activity'
                        ]
                    ]);

                    // Add a note to track this registration
                    $user->notes = "Birthdate: {$request->birthdate}. Account created from blocked IP address: {$userIp}. Monitor for appointment no-shows.";
                    $user->save();
                }

                // Fire the Registered event (which sends verification email)
                // If this fails, the transaction will rollback
                event(new Registered($user));

                return $user;
            });

            // Only login after successful transaction
            Auth::login($user);

            // Return response with IP blocking information
            if ($blockedIps) {
                return response()->json([
                    'message' => 'Account created successfully. However, your IP address has been flagged due to previous abuse. You will not be able to book appointments online, and your account will be monitored for appointment no-shows. Please contact our clinic for assistance.',
                    'ip_blocked' => true,
                    'warning' => 'Your IP address is blocked from booking appointments due to previous abuse.'
                ], 201);
            }

            return response()->json([
                'message' => 'Account created successfully.',
                'ip_blocked' => false,
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
