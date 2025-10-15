<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        $schedule->command('appointments:mark-no-shows')->everyThirtyMinutes();
        $schedule->command('goals:update-progress')->dailyAt('01:15');
        $schedule->command('promos:auto-cancel-expired')->dailyAt('02:00');
        
        // Retry queued emails every 5 minutes
        $schedule->command('emails:retry-queued --limit=20')->everyFiveMinutes();
        
        // Send appointment reminder emails daily at 6am Manila time
        $schedule->job(new \App\Jobs\EmailAppointmentReminderJob)->dailyAt('06:00');
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');
    }
}

