<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use App\Http\Controllers\Auth\AuthenticatedSessionController;


// Serve the built SPA at root
Route::get('/', function () {
    return File::get(public_path('index.html'));
});

Route::post('/login', [AuthenticatedSessionController::class, 'store']);

Route::get('/email/verify/{id}/{hash}', function (EmailVerificationRequest $request) {
    $request->fulfill(); // ✅ mark user as verified
    return redirect(config('app.frontend_url') . '/verify-success'); // 🔁 redirect to frontend
})->middleware(['auth:sanctum', 'signed'])->name('verification.verify.legacy');

// Serve the built SPA for any path that is NOT /api, /sanctum, /storage, /assets, or /verify-email
Route::get('/{any}', function () {
    return File::get(public_path('index.html'));
})->where('any', '^(?!api)(?!sanctum)(?!storage)(?!assets)(?!verify-email).*$');

require __DIR__.'/auth.php';
