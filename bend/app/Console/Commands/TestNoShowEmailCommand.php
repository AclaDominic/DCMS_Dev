<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Jobs\NoShowEmailJob;
use App\Models\Appointment;

class TestNoShowEmailCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:no-show-email {appointment_id? : Specific appointment ID to test} {--dry-run : Show what would be sent without actually sending emails}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test the no-show email notification system';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Testing No-Show Email Notification System...');
        
        if ($this->option('dry-run')) {
            $this->info('DRY RUN MODE - No emails will be sent');
            $this->showNoShowAppointments();
        } else {
            $appointmentId = $this->argument('appointment_id');
            
            if ($appointmentId) {
                $this->testSpecificAppointment($appointmentId);
            } else {
                $this->testRecentNoShows();
            }
        }
    }

    /**
     * Test a specific appointment
     */
    private function testSpecificAppointment($appointmentId)
    {
        $appointment = Appointment::with(['patient.user', 'service', 'latestPayment'])
            ->find($appointmentId);

        if (!$appointment) {
            $this->error("Appointment with ID {$appointmentId} not found.");
            return;
        }

        $this->info("Testing no-show email for appointment ID: {$appointmentId}");
        $this->displayAppointmentInfo($appointment);
        
        $this->info('Dispatching NoShowEmailJob...');
        NoShowEmailJob::dispatch($appointment);
        $this->info('Job dispatched successfully! Check the queue and logs for results.');
    }

    /**
     * Test recent no-show appointments
     */
    private function testRecentNoShows()
    {
        $this->info('Finding recent no-show appointments...');
        
        $noShowAppointments = Appointment::with(['patient.user', 'service', 'latestPayment'])
            ->where('status', 'no_show')
            ->whereDate('date', '>=', now()->subDays(7))
            ->orderBy('date', 'desc')
            ->limit(5)
            ->get();

        if ($noShowAppointments->isEmpty()) {
            $this->info('No recent no-show appointments found.');
            return;
        }

        $this->info("Found {$noShowAppointments->count()} recent no-show appointments:");
        
        foreach ($noShowAppointments as $appointment) {
            $this->displayAppointmentInfo($appointment);
            $this->line('---');
        }

        if ($this->confirm('Do you want to send test emails for these appointments?')) {
            foreach ($noShowAppointments as $appointment) {
                $this->info("Dispatching email for appointment ID: {$appointment->id}");
                NoShowEmailJob::dispatch($appointment);
            }
            $this->info('All jobs dispatched! Check the queue and logs for results.');
        }
    }

    /**
     * Show no-show appointments that would trigger emails
     */
    private function showNoShowAppointments()
    {
        $this->info('Recent no-show appointments that would trigger email notifications:');
        
        $noShowAppointments = Appointment::with(['patient.user', 'service', 'latestPayment'])
            ->where('status', 'no_show')
            ->whereDate('date', '>=', now()->subDays(7))
            ->orderBy('date', 'desc')
            ->limit(10)
            ->get();

        if ($noShowAppointments->isEmpty()) {
            $this->info('No recent no-show appointments found.');
            return;
        }

        foreach ($noShowAppointments as $appointment) {
            $this->displayAppointmentInfo($appointment);
            $this->line('---');
        }
    }

    /**
     * Display appointment information
     */
    private function displayAppointmentInfo($appointment)
    {
        $patientName = $appointment->patient ? 
            $appointment->patient->first_name . ' ' . $appointment->patient->last_name : 
            'Unknown Patient';
        $email = $appointment->patient?->user?->email ?? 'No email';
        $service = $appointment->service?->name ?? 'Unknown Service';
        $paymentMethod = $appointment->latestPayment?->method ?? 'No payment';
        $paymentStatus = $appointment->latestPayment?->status ?? 'No payment';
        $isMayaPayment = $paymentMethod === 'maya' && $paymentStatus === 'paid';
        
        $this->line("• ID: {$appointment->id}");
        $this->line("  Patient: {$patientName} ({$email})");
        $this->line("  Service: {$service}");
        $this->line("  Date: {$appointment->date} at {$appointment->time_slot}");
        $this->line("  Payment: {$paymentMethod} ({$paymentStatus})");
        $this->line("  Maya Payment: " . ($isMayaPayment ? 'Yes' : 'No'));
        $this->line("  Can Reschedule: " . ($isMayaPayment ? 'Yes' : 'No'));
    }
}
