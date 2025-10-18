<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Scheduled Tasks
Schedule::command('appointments:mark-no-shows')->everyThirtyMinutes();
Schedule::command('goals:update-progress')->dailyAt('01:15');
Schedule::command('promos:auto-cancel-expired')->dailyAt('02:00');

// Retry queued emails every 5 minutes
Schedule::command('emails:retry-queued --limit=20')->everyFiveMinutes();

// Send appointment reminder emails daily at 6am Manila time
Schedule::job(new \App\Jobs\EmailAppointmentReminderJob)->dailyAt('06:00');

// Add the inventory scan near expiry command
Schedule::command('inventory:scan-near-expiry')->dailyAt('08:00');

