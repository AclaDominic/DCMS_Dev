<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Models\PatientVisit;
use App\Models\Payment;
use App\Models\GoalProgressSnapshot;
use App\Models\PerformanceGoal;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class FixSeededAppointments extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'appointments:fix-seeded';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clear existing seeded appointments and regenerate with proper capacity limits';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Fixing seeded appointments to respect capacity limits...');

        // Clear existing seeded data
        $this->info('Clearing existing seeded data...');
        
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        
        // Clear appointments and related data
        $appointmentCount = Appointment::count();
        $visitCount = PatientVisit::count();
        $paymentCount = Payment::count();
        
        PatientVisit::truncate();
        Appointment::truncate();
        Payment::truncate();
        GoalProgressSnapshot::truncate();
        PerformanceGoal::truncate();
        
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->info("Cleared {$appointmentCount} appointments, {$visitCount} visits, and {$paymentCount} payments");

        // Regenerate data with proper capacity limits
        $this->info('Regenerating data with proper capacity limits...');
        
        $this->call('db:seed', [
            '--class' => 'AnalyticsSeeder'
        ]);
        
        $this->call('db:seed', [
            '--class' => 'ReportSeeder'
        ]);

        $this->info('✅ Seeded appointments now respect capacity limits!');
        $this->info('New counts:');
        $this->info('- Appointments: ' . Appointment::count());
        $this->info('- Visits: ' . PatientVisit::count());
        $this->info('- Payments: ' . Payment::count());
    }
}
