<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\DentistSchedule;
use App\Models\User;
use App\Services\SystemLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules;

class DentistPasswordController extends Controller
{
    /**
     * Change password from temporary to permanent
     */
    public function changePassword(Request $request)
    {
        $request->validate([
            'password' => ['required', Rules\Password::defaults()],
        ]);

        $user = Auth::user();
        
        if ($user->role !== 'dentist') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Find dentist schedule
        $dentistSchedule = DentistSchedule::where('email', $user->email)->first();
        
        if (!$dentistSchedule) {
            return response()->json(['message' => 'Dentist schedule not found'], 404);
        }

        // Update password (no current password verification needed)
        User::where('id', $user->id)->update([
            'password' => Hash::make($request->password)
        ]);

        // Update dentist schedule
        $dentistSchedule->update([
            'temporary_password' => null,
            'password_changed' => true,
            'password_changed_at' => now(),
        ]);

        SystemLogService::log('dentist', 'password_changed', $dentistSchedule->id, 
            'Password changed for dentist: ' . $dentistSchedule->dentist_name);

        return response()->json(['message' => 'Password changed successfully']);
    }

    /**
     * Check if password change is required
     */
    public function checkPasswordStatus(Request $request)
    {
        $user = Auth::user();
        
        if ($user->role !== 'dentist') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $dentistSchedule = DentistSchedule::where('email', $user->email)->first();
        
        if (!$dentistSchedule) {
            return response()->json(['message' => 'Dentist schedule not found'], 404);
        }

        return response()->json([
            'password_changed' => $dentistSchedule->password_changed,
            'password_changed_at' => $dentistSchedule->password_changed_at,
            'requires_password_change' => !$dentistSchedule->password_changed,
        ]);
    }

    /**
     * Reset password (admin only)
     */
    public function resetPassword(Request $request)
    {
        Log::info('Dentist password reset started', [
            'request_data' => $request->all(),
            'ip' => $request->ip()
        ]);

        try {
            $request->validate([
                'dentist_schedule_id' => 'required|exists:dentist_schedules,id',
            ]);
            
            Log::info('Dentist password reset validation passed');
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Dentist password reset validation failed', [
                'errors' => $e->errors(),
                'request_data' => $request->all()
            ]);
            throw $e;
        }

        try {
            $dentistSchedule = DentistSchedule::findOrFail($request->dentist_schedule_id);
            Log::info('Dentist schedule found for password reset', [
                'dentist_schedule_id' => $dentistSchedule->id,
                'dentist_code' => $dentistSchedule->dentist_code,
                'email' => $dentistSchedule->email
            ]);
        } catch (\Exception $e) {
            Log::error('Dentist schedule not found for password reset', [
                'dentist_schedule_id' => $request->dentist_schedule_id,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
        
        if (!$dentistSchedule->email) {
            Log::error('No email associated with dentist for password reset', [
                'dentist_schedule_id' => $dentistSchedule->id,
                'dentist_code' => $dentistSchedule->dentist_code
            ]);
            return response()->json(['message' => 'No email associated with this dentist'], 400);
        }

        $user = User::where('email', $dentistSchedule->email)->where('role', 'dentist')->first();
        
        if (!$user) {
            Log::error('User account not found for password reset', [
                'email' => $dentistSchedule->email,
                'dentist_schedule_id' => $dentistSchedule->id
            ]);
            return response()->json(['message' => 'User account not found'], 404);
        }

        Log::info('User account found for password reset', [
            'user_id' => $user->id,
            'email' => $user->email
        ]);

        // Generate new temporary password
        $temporaryPassword = \Illuminate\Support\Str::random(12);
        Log::info('Temporary password generated for reset', [
            'password_length' => strlen($temporaryPassword)
        ]);
        
        // Update user password
        try {
            $user->password = Hash::make($temporaryPassword);
            $user->save();
            Log::info('User password updated successfully', [
                'user_id' => $user->id
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update user password', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }

        // Update dentist schedule
        try {
            $dentistSchedule->update([
                'temporary_password' => $temporaryPassword,
                'password_changed' => false,
                'password_changed_at' => null,
            ]);
            Log::info('Dentist schedule updated for password reset', [
                'dentist_schedule_id' => $dentistSchedule->id
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update dentist schedule for password reset', [
                'dentist_schedule_id' => $dentistSchedule->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }

        // Send email with new temporary password
        try {
            Log::info('Starting password reset email sending', [
                'email' => $user->email,
                'dentist_schedule_id' => $dentistSchedule->id
            ]);

            \Illuminate\Support\Facades\Mail::send('emails.dentist-password-reset', [
                'dentist' => $dentistSchedule,
                'temporaryPassword' => $temporaryPassword,
            ], function ($message) use ($user) {
                $message->to($user->email)
                        ->subject('Password Reset - Kreative Dental');
            });

            Log::info('Password reset email sent successfully');

            SystemLogService::log('dentist', 'password_reset', $dentistSchedule->id, 
                'Password reset for dentist: ' . $dentistSchedule->dentist_name);

            return response()->json([
                'message' => 'Password reset successfully',
                'temporary_password' => $temporaryPassword, // Only for admin display
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send password reset email', [
                'email' => $user->email,
                'dentist_schedule_id' => $dentistSchedule->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            SystemLogService::log('dentist', 'password_reset_failed', $dentistSchedule->id, 
                'Failed to reset password: ' . $e->getMessage());

            return response()->json(['message' => 'Failed to reset password'], 500);
        }
    }
}
