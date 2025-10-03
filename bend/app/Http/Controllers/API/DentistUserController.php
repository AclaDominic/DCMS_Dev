<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\DentistSchedule;
use App\Models\User;
use App\Services\SystemLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class DentistUserController extends Controller
{
    /**
     * Create dentist user account
     */
    public function createAccount(Request $request)
    {
        Log::info('Dentist account creation started', [
            'request_data' => $request->all(),
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent()
        ]);

        try {
            $request->validate([
                'dentist_schedule_id' => 'required|exists:dentist_schedules,id',
                'email' => 'required|email|unique:users,email|unique:dentist_schedules,email,' . $request->dentist_schedule_id,
                'name' => 'required|string|max:255',
            ]);
            
            Log::info('Dentist account creation validation passed', [
                'dentist_schedule_id' => $request->dentist_schedule_id,
                'email' => $request->email,
                'name' => $request->name
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Dentist account creation validation failed', [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            throw $e;
        }

        try {
            $dentistSchedule = DentistSchedule::findOrFail($request->dentist_schedule_id);
            Log::info('Dentist schedule found', [
                'dentist_schedule_id' => $dentistSchedule->id,
                'dentist_code' => $dentistSchedule->dentist_code,
                'current_email' => $dentistSchedule->email
            ]);
        } catch (\Exception $e) {
            Log::error('Dentist schedule not found', [
                'dentist_schedule_id' => $request->dentist_schedule_id,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }

        $oldEmail = $dentistSchedule->email;
        $emailChanged = $oldEmail && $oldEmail !== $request->email;
        
        // Generate temporary password
        $temporaryPassword = Str::random(12);
        Log::info('Temporary password generated', [
            'password_length' => strlen($temporaryPassword)
        ]);
        
        // Create user account
        try {
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($temporaryPassword),
                'role' => 'dentist',
                'email_verified_at' => now(), // Auto-verify email for dentists
            ]);
            
            Log::info('User account created successfully', [
                'user_id' => $user->id,
                'email' => $user->email,
                'name' => $user->name,
                'role' => $user->role
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to create user account', [
                'email' => $request->email,
                'name' => $request->name,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }

        // Update dentist schedule with email and temporary password
        try {
            $dentistSchedule->update([
                'email' => $request->email,
                'temporary_password' => $temporaryPassword,
                'password_changed' => false,
                'password_changed_at' => null,
            ]);
            
            Log::info('Dentist schedule updated successfully', [
                'dentist_schedule_id' => $dentistSchedule->id,
                'new_email' => $request->email,
                'email_changed' => $emailChanged
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update dentist schedule', [
                'dentist_schedule_id' => $dentistSchedule->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }

        // Log email change if different from schedule email
        if ($emailChanged) {
            SystemLogService::log('dentist', 'email_changed', $dentistSchedule->id, 
                'Email changed from ' . $oldEmail . ' to ' . $request->email . ' during account creation');
        }

        // Send account creation email with temporary password (no verification needed)
        try {
            Log::info('Starting email sending process', [
                'user_email' => $user->email,
                'dentist_name' => $dentistSchedule->dentist_name
            ]);
            
            Mail::send('emails.dentist-account-created', [
                'dentist' => $dentistSchedule,
                'user' => $user,
                'temporaryPassword' => $temporaryPassword
            ], function ($message) use ($user) {
                $message->to($user->email)
                        ->subject('Your Dentist Account - Kreative Dental');
            });
            
            Log::info('Account creation email sent successfully');

            SystemLogService::log('dentist', 'account_created', $dentistSchedule->id, 
                'Dentist account created: ' . $dentistSchedule->dentist_name . ' (' . $user->email . ')');

            Log::info('Dentist account creation completed successfully', [
                'user_id' => $user->id,
                'dentist_schedule_id' => $dentistSchedule->id,
                'email' => $user->email
            ]);

            return response()->json([
                'message' => 'Dentist account created successfully',
                'user' => $user,
                'temporary_password' => $temporaryPassword, // Only for admin display
            ], 201);
        } catch (\Exception $e) {
            Log::error('Email sending failed, but account creation will continue', [
                'user_id' => $user->id,
                'dentist_schedule_id' => $dentistSchedule->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            // Don't rollback account creation if email fails - just log the error
            // The account is still created successfully, email can be sent later
            SystemLogService::log('dentist', 'account_created_email_failed', $dentistSchedule->id, 
                'Dentist account created but email sending failed: ' . $e->getMessage());

            Log::info('Dentist account creation completed with email failure', [
                'user_id' => $user->id,
                'dentist_schedule_id' => $dentistSchedule->id,
                'email' => $user->email,
                'note' => 'Account created successfully but email sending failed'
            ]);

            return response()->json([
                'message' => 'Dentist account created successfully, but email sending failed.',
                'user' => $user,
                'temporary_password' => $temporaryPassword, // Only for admin display
                'email_sent' => false,
                'email_error' => $e->getMessage()
            ], 201);
        }
    }

    /**
     * Change dentist email
     */
    public function changeEmail(Request $request)
    {
        Log::info('Dentist email change started', [
            'request_data' => $request->all(),
            'ip' => $request->ip()
        ]);

        try {
            $request->validate([
                'dentist_schedule_id' => 'required|exists:dentist_schedules,id',
                'new_email' => 'required|email|unique:users,email|unique:dentist_schedules,email',
            ]);
            
            Log::info('Dentist email change validation passed');
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Dentist email change validation failed', [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            throw $e;
        }

        $dentistSchedule = DentistSchedule::findOrFail($request->dentist_schedule_id);
        $oldEmail = $dentistSchedule->email;
        
        if (!$oldEmail) {
            return response()->json(['message' => 'No email to change'], 400);
        }

        $user = User::where('email', $oldEmail)->where('role', 'dentist')->first();
        
        if (!$user) {
            return response()->json(['message' => 'User account not found'], 404);
        }

        // Update user email
        $user->email = $request->new_email;
        $user->email_verified_at = now(); // Auto-verify new email for dentists
        $user->save();

        // Update dentist schedule
        $dentistSchedule->update([
            'email' => $request->new_email,
        ]);

        SystemLogService::log('dentist', 'email_changed', $dentistSchedule->id, 
            'Email changed from ' . $oldEmail . ' to ' . $request->new_email);

        return response()->json(['message' => 'Email changed successfully.']);
    }

    /**
     * Get dentist account status
     */
    public function status(Request $request)
    {
        Log::info('Dentist account status check started', [
            'request_data' => $request->all(),
            'ip' => $request->ip()
        ]);

        try {
            $request->validate([
                'dentist_schedule_id' => 'required|exists:dentist_schedules,id'
            ]);
            
            Log::info('Dentist account status validation passed');
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Dentist account status validation failed', [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            throw $e;
        }

        $dentistSchedule = DentistSchedule::findOrFail($request->dentist_schedule_id);
        $user = null;
        
        if ($dentistSchedule->email) {
            $user = User::where('email', $dentistSchedule->email)->where('role', 'dentist')->first();
        }

        return response()->json([
            'has_account' => $user !== null,
            'email' => $dentistSchedule->email,
            'password_changed' => $dentistSchedule->password_changed,
            'password_changed_at' => $dentistSchedule->password_changed_at,
            'user' => $user,
        ]);
    }
}
