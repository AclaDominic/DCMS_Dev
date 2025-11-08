<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Payment;
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
        $payments = [];
        
        for ($i = 0; $i < 5; $i++) {
            $patient = $patients->random();
            $service = $services->random();
            
            // Create appointment in the last 7 days
            $appointmentDate = Carbon::now()->subDays(rand(1, 7));
            $timeSlots = ['09:00-10:00', '10:00-11:00', '14:00-15:00', '15:00-16:00'];
            $paymentMethod = ['cash', 'maya'][array_rand(['cash', 'maya'])];
            
            $appointments[] = [
                'patient_id' => $patient->id,
                'service_id' => $service->id,
                'patient_hmo_id' => null,
                'date' => $appointmentDate->toDateString(),
                'time_slot' => $timeSlots[array_rand($timeSlots)],
                'reference_code' => 'TEST-' . strtoupper(uniqid()),
                'status' => 'completed',
                'payment_method' => $paymentMethod,
                'payment_status' => 'paid',
                'notes' => 'Test appointment for receipt functionality',
                'teeth_count' => $service->per_teeth_service ? rand(1, 4) : null,
                'is_seeded' => true,
                'created_at' => $appointmentDate->toDateTimeString(),
                'updated_at' => $appointmentDate->toDateTimeString(),
            ];
        }

        // Insert appointments first
        Appointment::insert($appointments);
        
        // Get the inserted appointments to create corresponding payments
        $insertedAppointments = Appointment::where('is_seeded', true)
            ->where('payment_status', 'paid')
            ->where('status', 'completed')
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();
        
        // Create corresponding Payment records for each paid appointment
        foreach ($insertedAppointments as $appointment) {
            $service = Service::find($appointment->service_id);
            $amount = $appointment->calculateTotalCost();
            
            Payment::create([
                'appointment_id' => $appointment->id,
                'patient_visit_id' => null,
                'currency' => 'PHP',
                'amount_due' => $amount,
                'amount_paid' => $amount,
                'method' => $appointment->payment_method,
                'status' => 'paid',
                'reference_no' => 'TEST-PAY-' . strtoupper(uniqid()),
                'paid_at' => $appointment->created_at,
                'created_by' => User::where('role', 'admin')->first()?->id,
                'created_at' => $appointment->created_at,
                'updated_at' => $appointment->created_at,
            ]);
        }

        // Mark users with seeded paid appointments as verified
        $usersToVerify = $insertedAppointments
            ->load('patient.user')
            ->map(function ($appointment) {
                return optional(optional($appointment->patient)->user)->id;
            })
            ->filter()
            ->unique()
            ->all();

        if (! empty($usersToVerify)) {
            User::whereIn('id', $usersToVerify)->update(['email_verified_at' => now()]);
        }

        $this->command->info('Created ' . count($appointments) . ' test appointments with ' . count($insertedAppointments) . ' corresponding Payment records for receipt testing.');
        $this->command->info('These appointments are marked as seeded and will not send emails.');
        $this->command->info('You can test receipt generation by clicking "View Receipt" in PatientAppointments.');
    }
}