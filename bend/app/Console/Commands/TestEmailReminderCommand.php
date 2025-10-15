<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Jobs\EmailAppointmentReminderJob;

class TestEmailReminderCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:email-reminder {--dry-run : Show what would be sent without actually sending emails}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test the email appointment reminder job';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Testing Email Appointment Reminder Job...');
        
        if ($this->option('dry-run')) {
            $this->info('DRY RUN MODE - No emails will be sent');
            $this->showUpcomingAppointments();
        } else {
            $this->info('Dispatching EmailAppointmentReminderJob...');
            EmailAppointmentReminderJob::dispatch();
            $this->info('Job dispatched successfully! Check the queue and logs for results.');
        }
    }

    /**
     * Show upcoming appointments that would trigger reminders
     */
    private function showUpcomingAppointments()
    {
        $this->info('Upcoming appointments that would trigger reminders:');
        
        // Show appointments for today, tomorrow, and day after tomorrow
        for ($days = 0; $days <= 2; $days++) {
            $date = now()->addDays($days)->format('Y-m-d');
            $appointments = \App\Models\Appointment::with(['patient.user', 'service'])
                ->where('date', $date)
                ->whereIn('status', ['pending', 'approved'])
                ->get();

            if ($appointments->count() > 0) {
                $this->info("\n--- {$date} ({$days} days from now) ---");
                foreach ($appointments as $appointment) {
                    $patientName = $appointment->patient ? 
                        $appointment->patient->first_name . ' ' . $appointment->patient->last_name : 
                        'Unknown Patient';
                    $email = $appointment->patient?->user?->email ?? 'No email';
                    $service = $appointment->service?->name ?? 'Unknown Service';
                    
                    $this->line("• {$patientName} ({$email}) - {$service} at {$appointment->time_slot}");
                }
            }
        }
    }
}
