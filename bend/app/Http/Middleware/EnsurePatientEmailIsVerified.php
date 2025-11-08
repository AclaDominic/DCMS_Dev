<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePatientEmailIsVerified
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->role === 'patient' && ! $user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email verification required.',
                'code' => 'email_not_verified',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}

