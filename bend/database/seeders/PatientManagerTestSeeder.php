<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Patient;
use App\Models\Service;
use App\Models\Appointment;
use App\Models\PatientManager;
use App\Services\PatientManagerService;
use Carbon\Carbon;

class PatientManagerTestSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clean up any existing test data to prevent duplicates
        $this->command->info('Cleaning up any existing test data...');
        
        // Remove existing test patients (those with test emails)
        $testEmails = [
            'john.noshow@test.com',
            'jane.warning@test.com', 
            'bob.active@test.com',
            'alice.clean@test.com',
            'charlie.blocked@test.com'
        ];
        
        foreach ($testEmails as $email) {
            $user = User::where('email', $email)->first();
            if ($user) {
                $patient = Patient::where('user_id', $user->id)->first();
                if ($patient) {
                    PatientManager::where('patient_id', $patient->id)->delete();
                    $patient->delete();
                }
                $user->delete();
                $this->command->info("Cleaned up test user: {$email}");
            }
        }

        // Create test services if they don't exist
        $services = [
            [
                'name' => 'Dental Checkup',
                'description' => 'Regular dental examination and cleaning',
                'price' => 1500.00,
                'estimated_minutes' => 60,
                'per_teeth_service' => false,
            ],
            [
                'name' => 'Tooth Extraction',
                'description' => 'Simple tooth extraction procedure',
                'price' => 2000.00,
                'estimated_minutes' => 45,
                'per_teeth_service' => false,
            ],
            [
                'name' => 'Dental Filling',
                'description' => 'Cavity filling treatment',
                'price' => 1200.00,
                'estimated_minutes' => 30,
                'per_teeth_service' => false,
            ],
        ];

        $serviceIds = [];
        foreach ($services as $serviceData) {
            $service = Service::firstOrCreate(
                ['name' => $serviceData['name']],
                $serviceData
            );
            $serviceIds[] = $service->id;
        }

        // Create test patients with different no-show scenarios
        $testPatients = [
            // Patient 1: High no-show count (should be blocked)
            [
                'user' => [
                    'name' => 'John NoShow',
                    'email' => 'john.noshow@test.com',
                    'password' => bcrypt('password'),
                    'contact_number' => '+639171111111',
                    'role' => 'patient',
                    'email_verified_at' => now(),
                ],
                'patient' => [
                    'first_name' => 'John',
                    'last_name' => 'NoShow',
                    'birthdate' => '1990-01-15',
                    'sex' => 'male',
                    'contact_number' => '+639171111111',
                    'address' => '123 Test Street, Test City',
                ],
                'no_shows' => 6, // Above blocking threshold
                'status' => 'blocked',
            ],
            // Patient 2: Medium no-show count (should be under warning)
            [
                'user' => [
                    'name' => 'Jane Warning',
                    'email' => 'jane.warning@test.com',
                    'password' => bcrypt('password'),
                    'contact_number' => '+639172222222',
                    'role' => 'patient',
                    'email_verified_at' => now(),
                ],
                'patient' => [
                    'first_name' => 'Jane',
                    'last_name' => 'Warning',
                    'birthdate' => '1985-05-20',
                    'sex' => 'female',
                    'contact_number' => '+639172222222',
                    'address' => '456 Warning Avenue, Test City',
                ],
                'no_shows' => 3, // Warning threshold
                'status' => 'warning',
            ],
            // Patient 3: Low no-show count (active)
            [
                'user' => [
                    'name' => 'Bob Active',
                    'email' => 'bob.active@test.com',
                    'password' => bcrypt('password'),
                    'contact_number' => '+639173333333',
                    'role' => 'patient',
                    'email_verified_at' => now(),
                ],
                'patient' => [
                    'first_name' => 'Bob',
                    'last_name' => 'Active',
                    'birthdate' => '1992-08-10',
                    'sex' => 'male',
                    'contact_number' => '+639173333333',
                    'address' => '789 Active Road, Test City',
                ],
                'no_shows' => 1,
                'status' => 'active',
            ],
            // Patient 4: No no-shows (clean record)
            [
                'user' => [
                    'name' => 'Alice Clean',
                    'email' => 'alice.clean@test.com',
                    'password' => bcrypt('password'),
                    'contact_number' => '+639174444444',
                    'role' => 'patient',
                    'email_verified_at' => now(),
                ],
                'patient' => [
                    'first_name' => 'Alice',
                    'last_name' => 'Clean',
                    'birthdate' => '1988-12-25',
                    'sex' => 'female',
                    'contact_number' => '+639174444444',
                    'address' => '321 Clean Boulevard, Test City',
                ],
                'no_shows' => 0,
                'status' => 'active',
            ],
            // Patient 5: IP blocked patient
            [
                'user' => [
                    'name' => 'Charlie Blocked',
                    'email' => 'charlie.blocked@test.com',
                    'password' => bcrypt('password'),
                    'contact_number' => '+639175555555',
                    'role' => 'patient',
                    'email_verified_at' => now(),
                    'notes' => 'Account created from blocked IP address: 192.168.1.100. Monitor for appointment no-shows.',
                ],
                'patient' => [
                    'first_name' => 'Charlie',
                    'last_name' => 'Blocked',
                    'birthdate' => '1995-03-30',
                    'sex' => 'male',
                    'contact_number' => '+639175555555',
                    'address' => '654 Blocked Street, Test City',
                ],
                'no_shows' => 4,
                'status' => 'blocked',
                'block_type' => 'both',
                'blocked_ip' => '192.168.1.100',
            ],
        ];

        foreach ($testPatients as $patientData) {
            // Create user (check by email first)
            $user = User::where('email', $patientData['user']['email'])->first();
            if (!$user) {
                $user = User::create($patientData['user']);
            }

            // Create patient (check by user_id and name combination)
            $patient = Patient::where('user_id', $user->id)
                ->where('first_name', $patientData['patient']['first_name'])
                ->where('last_name', $patientData['patient']['last_name'])
                ->first();
            
            if (!$patient) {
                $patient = Patient::create(array_merge($patientData['patient'], [
                    'user_id' => $user->id,
                    'is_linked' => true,
                ]));
            }

            // Create PatientManager record
            $patientManager = PatientManager::firstOrCreate(
                ['patient_id' => $patient->id],
                [
                    'patient_id' => $patient->id,
                    'no_show_count' => $patientData['no_shows'],
                    'warning_count' => $patientData['no_shows'] >= 3 ? 1 : 0,
                    'block_status' => $patientData['status'],
                    'block_type' => $patientData['block_type'] ?? null,
                    'blocked_ip' => $patientData['blocked_ip'] ?? null,
                    'block_reason' => $patientData['status'] === 'blocked' ? 'Test data - blocked due to multiple no-shows' : null,
                    'blocked_at' => $patientData['status'] === 'blocked' ? now()->subDays(7) : null,
                    'blocked_by' => $patientData['status'] === 'blocked' ? 1 : null,
                    'last_no_show_at' => $patientData['no_shows'] > 0 ? now()->subDays(rand(1, 30)) : null,
                    'last_warning_sent_at' => $patientData['no_shows'] >= 3 ? now()->subDays(rand(1, 10)) : null,
                    'last_warning_message' => $patientData['no_shows'] >= 3 ? 'Warning: You have multiple no-shows on your record.' : null,
                    'admin_notes' => $patientData['status'] === 'blocked' ? '[2025-01-15 10:00:00] Admin User: Test patient with blocked status for testing purposes.' : null,
                    'last_updated_at' => now(),
                    'last_updated_by' => 1,
                ]
            );

            // Create sample appointments (including no-shows)
            for ($i = 0; $i < $patientData['no_shows']; $i++) {
                $appointment = Appointment::firstOrCreate(
                    [
                        'patient_id' => $patient->id,
                        'reference_code' => 'TEST' . str_pad($patient->id, 3, '0', STR_PAD_LEFT) . str_pad($i + 1, 2, '0', STR_PAD_LEFT),
                    ],
                    [
                        'service_id' => $serviceIds[array_rand($serviceIds)],
                        'date' => now()->subDays(rand(1, 60))->format('Y-m-d'),
                        'time_slot' => '09:00-10:00',
                        'status' => 'no_show',
                        'payment_method' => 'cash',
                        'payment_status' => 'unpaid',
                        'notes' => 'Test no-show appointment',
                    ]
                );
            }

            // Create some completed appointments as well
            for ($i = 0; $i < rand(1, 3); $i++) {
                $appointment = Appointment::firstOrCreate(
                    [
                        'patient_id' => $patient->id,
                        'reference_code' => 'COMP' . str_pad($patient->id, 3, '0', STR_PAD_LEFT) . str_pad($i + 1, 2, '0', STR_PAD_LEFT),
                    ],
                    [
                        'service_id' => $serviceIds[array_rand($serviceIds)],
                        'date' => now()->subDays(rand(1, 90))->format('Y-m-d'),
                        'time_slot' => '10:00-11:00',
                        'status' => 'completed',
                        'payment_method' => 'cash',
                        'payment_status' => 'paid',
                        'notes' => 'Test completed appointment',
                    ]
                );
            }

            $this->command->info("Created test patient: {$patient->first_name} {$patient->last_name} with {$patientData['no_shows']} no-shows, status: {$patientData['status']}");
        }

        // Create some system logs for blocked IP registrations
        \App\Models\SystemLog::create([
            'user_id' => User::where('email', 'charlie.blocked@test.com')->first()->id,
            'category' => 'registration',
            'action' => 'blocked_ip_registration',
            'message' => 'User registered from blocked IP address: 192.168.1.100',
            'context' => [
                'user_id' => User::where('email', 'charlie.blocked@test.com')->first()->id,
                'email' => 'charlie.blocked@test.com',
                'blocked_ip' => '192.168.1.100',
                'action_required' => 'monitor_account_activity'
            ]
        ]);

        $this->command->info('Patient Manager test data seeded successfully!');
        $this->command->info('Created test patients with various no-show scenarios for testing the Patient Manager system.');
    }
}
