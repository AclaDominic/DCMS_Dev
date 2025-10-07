<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class ReceiptTestSeeder extends Seeder
{
    /**
     * Create some recent completed and paid appointments for testing receipt functionality.
     */
    public function run(): void
    {
        $this->command->info('Creating test appointments for receipt functionality...');

        // Get some patients and services
        $patients = Patient::with('user')->where('is_linked', true)->take(5)->get();
        $services = Service::where('is_active', true)->take(3)->get();

        if ($patients->isEmpty() || $services->isEmpty()) {
            $this->command->warn('No linked patients or active services found. Skipping ReceiptTestSeeder.');
            return;
        }

        // Create 3-5 recent completed and paid appointments
        $appointments = [];
        for ($i = 0; $i < 5; $i++) {
            $patient = $patients->random();
            $service = $services->random();
            
            // Create appointment in the last 7 days
            $appointmentDate = Carbon::now()->subDays(rand(1, 7));
            $timeSlots = ['09:00-10:00', '10:00-11:00', '14:00-15:00', '15:00-16:00'];
            
            $appointments[] = [
                'patient_id' => $patient->id,
                'service_id' => $service->id,
                'patient_hmo_id' => null,
                'date' => $appointmentDate->toDateString(),
                'time_slot' => $timeSlots[array_rand($timeSlots)],
                'reference_code' => 'TEST-' . strtoupper(uniqid()),
                'status' => 'completed',
                'payment_method' => ['cash', 'maya'][array_rand(['cash', 'maya'])],
                'payment_status' => 'paid',
                'notes' => 'Test appointment for receipt functionality',
                'teeth_count' => $service->per_teeth_service ? rand(1, 4) : null,
                'is_seeded' => true,
                'created_at' => $appointmentDate->toDateTimeString(),
                'updated_at' => $appointmentDate->toDateTimeString(),
            ];
        }

        // Insert appointments
        Appointment::insert($appointments);

        $this->command->info('Created ' . count($appointments) . ' test appointments for receipt testing.');
        $this->command->info('These appointments are marked as seeded and will not send emails.');
        $this->command->info('You can test receipt generation by clicking "View Receipt" in PatientAppointments.');
    }
}