<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class VerifyEmailController extends Controller
{
    /**
     * Mark the authenticated user's email address as verified.
     */
    public function __invoke(Request $request, int $id, string $hash): RedirectResponse
    {
        $redirectBase = rtrim(config('app.frontend_url'), '/');

        if (! URL::hasValidSignature($request)) {
            return redirect()->to("{$redirectBase}/verify-email?status=invalid-signature");
        }

        $user = User::find($id);

        if (! $user) {
            return redirect()->to("{$redirectBase}/verify-email?status=user-not-found");
        }

        if (! hash_equals($hash, sha1($user->getEmailForVerification()))) {
            return redirect()->to("{$redirectBase}/verify-email?status=invalid-hash");
        }

        if (! $user->hasVerifiedEmail()) {
            if ($user->markEmailAsVerified()) {
                event(new Verified($user));
            }
        }

        return redirect()->to("{$redirectBase}/verify-success");
    }
}
