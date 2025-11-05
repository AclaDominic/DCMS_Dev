<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminOrStaff
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        
        if (!$user || !in_array($user->role, ['admin', 'staff'])) {
            return response()->json([
                'message' => 'Unauthorized: Admin or Staff access required.',
            ], 403);
        }
        
        return $next($request);
    }
}

