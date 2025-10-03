<?php

namespace App\Http\Middleware;

use App\Models\DentistSchedule;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class DentistPasswordChangeMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        // Check if user is authenticated
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Check if user is a dentist
        if ($user->role !== 'dentist') {
            return response()->json(['message' => 'Access denied. Dentist role required.'], 403);
        }

        // Find dentist schedule
        $dentistSchedule = DentistSchedule::where('email', $user->email)->first();
        
        if (!$dentistSchedule) {
            return response()->json(['message' => 'Dentist schedule not found'], 404);
        }

        // Email verification no longer required for dentists

        // Check password change requirement
        if (!$dentistSchedule->password_changed) {
            return response()->json([
                'message' => 'Password change required',
                'requires_password_change' => true,
            ], 403);
        }

        // Add dentist schedule to request for use in controllers
        $request->merge(['dentist_schedule' => $dentistSchedule]);

        return $next($request);
    }
}
