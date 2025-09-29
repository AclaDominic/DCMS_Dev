<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Service;
use App\Models\ServiceBundleItem;
use App\Models\ServiceDiscount;
use App\Models\Patient;
use App\Models\PatientVisit;
use Carbon\Carbon;

class PerformanceGoalTestSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create test services
        $this->createTestServices();
        
        // Create test packages (service bundles)
        $this->createTestPackages();
        
        // Create test promos (service discounts)
        $this->createTestPromos();
        
        // Create test patients
        $this->createTestPatients();
        
        // Create test visits for current month
        $this->createTestVisits();
    }

    private function createTestServices()
    {
        $services = [
            [
                'name' => 'Regular Cleaning',
                'description' => 'Basic dental cleaning service',
                'price' => 1500.00,
                'category' => 'Cleaning',
                'estimated_minutes' => 60,
            ],
            [
                'name' => 'Deep Cleaning',
                'description' => 'Thorough dental cleaning',
                'price' => 2500.00,
                'category' => 'Cleaning',
                'estimated_minutes' => 90,
            ],
            [
                'name' => 'Tooth Extraction',
                'description' => 'Simple tooth extraction',
                'price' => 3000.00,
                'category' => 'Surgery',
                'estimated_minutes' => 45,
            ],
            [
                'name' => 'Dental Filling',
                'description' => 'Tooth filling service',
                'price' => 2000.00,
                'category' => 'Restorative',
                'estimated_minutes' => 30,
            ],
            [
                'name' => 'Dental Checkup Package',
                'description' => 'Complete dental checkup package',
                'price' => 3500.00,
                'category' => 'Package',
                'estimated_minutes' => 120,
            ],
            [
                'name' => 'Whitening Treatment',
                'description' => 'Professional teeth whitening',
                'price' => 8000.00,
                'category' => 'Cosmetic',
                'estimated_minutes' => 90,
            ],
        ];

        foreach ($services as $service) {
            Service::updateOrCreate(
                ['name' => $service['name']],
                $service
            );
        }
    }

    private function createTestPackages()
    {
        // Get the package service and individual services
        $packageService = Service::where('name', 'Dental Checkup Package')->first();
        $cleaningService = Service::where('name', 'Regular Cleaning')->first();
        $fillingService = Service::where('name', 'Dental Filling')->first();

        if ($packageService && $cleaningService && $fillingService) {
            // Create bundle items (services included in the package)
            ServiceBundleItem::updateOrCreate([
                'parent_service_id' => $packageService->id,
                'child_service_id' => $cleaningService->id,
            ]);

            ServiceBundleItem::updateOrCreate([
                'parent_service_id' => $packageService->id,
                'child_service_id' => $fillingService->id,
            ]);
        }
    }

    private function createTestPromos()
    {
        $whiteningService = Service::where('name', 'Whitening Treatment')->first();
        $cleaningService = Service::where('name', 'Regular Cleaning')->first();

        if ($whiteningService) {
            // Create ongoing promo (started yesterday, ends in 2 weeks)
            ServiceDiscount::updateOrCreate([
                'service_id' => $whiteningService->id,
                'start_date' => Carbon::yesterday(),
            ], [
                'end_date' => Carbon::now()->addWeeks(2),
                'discounted_price' => 6000.00,
                'status' => 'launched',
                'activated_at' => Carbon::yesterday(),
            ]);
        }

        if ($cleaningService) {
            // Create future promo (starts in 1 week, ends in 3 weeks)
            ServiceDiscount::updateOrCreate([
                'service_id' => $cleaningService->id,
                'start_date' => Carbon::now()->addWeek(),
            ], [
                'end_date' => Carbon::now()->addWeeks(3),
                'discounted_price' => 1000.00,
                'status' => 'planned',
            ]);

            // Create another ongoing promo (started 3 days ago, ends in 10 days)
            ServiceDiscount::updateOrCreate([
                'service_id' => $cleaningService->id,
                'start_date' => Carbon::now()->subDays(3),
            ], [
                'end_date' => Carbon::now()->addDays(10),
                'discounted_price' => 1200.00,
                'status' => 'launched',
                'activated_at' => Carbon::now()->subDays(3),
            ]);
        }
    }

    private function createTestPatients()
    {
        $patients = [
            [
                'first_name' => 'John',
                'last_name' => 'Doe',
                'contact_number' => '09123456789',
                'birthdate' => '1990-05-15',
                'sex' => 'Male',
                'address' => '123 Main St, City',
            ],
            [
                'first_name' => 'Jane',
                'last_name' => 'Smith',
                'contact_number' => '09987654321',
                'birthdate' => '1985-08-22',
                'sex' => 'Female',
                'address' => '456 Oak Ave, City',
            ],
            [
                'first_name' => 'Bob',
                'last_name' => 'Johnson',
                'contact_number' => '09555123456',
                'birthdate' => '1978-12-03',
                'sex' => 'Male',
                'address' => '789 Pine Rd, City',
            ],
            [
                'first_name' => 'Alice',
                'last_name' => 'Brown',
                'contact_number' => '09444987654',
                'birthdate' => '1992-03-18',
                'sex' => 'Female',
                'address' => '321 Elm St, City',
            ],
            [
                'first_name' => 'Charlie',
                'last_name' => 'Wilson',
                'contact_number' => '09333456789',
                'birthdate' => '1988-07-10',
                'sex' => 'Male',
                'address' => '654 Maple Dr, City',
            ],
        ];

        foreach ($patients as $patient) {
            Patient::updateOrCreate(
                ['contact_number' => $patient['contact_number']],
                $patient
            );
        }
    }

    private function createTestVisits()
    {
        $services = Service::all();
        $patients = Patient::all();
        
        if ($services->isEmpty() || $patients->isEmpty()) {
            return;
        }

        // Get current month start and end
        $monthStart = Carbon::now()->startOfMonth();
        $monthEnd = Carbon::now()->endOfMonth();
        
        // Create visits for current month (some completed, some scheduled)
        $visitsData = [];
        
        // Create 15 completed visits this month
        for ($i = 0; $i < 15; $i++) {
            $visitDate = $monthStart->copy()->addDays(rand(0, min(Carbon::now()->day - 1, $monthEnd->day - 1)));
            $patient = $patients->random();
            $service = $services->random();
            
            $visitsData[] = [
                'patient_id' => $patient->id,
                'service_id' => $service->id,
                'visit_date' => $visitDate->toDateString(),
                'start_time' => $visitDate->copy()->setTime(rand(8, 16), [0, 30][rand(0, 1)]),
                'end_time' => $visitDate->copy()->setTime(rand(8, 16), [0, 30][rand(0, 1)])->addMinutes($service->estimated_minutes ?? 60),
                'status' => 'completed',
                'note' => 'Test visit for performance goals',
            ];
        }
        
        // Create 5 scheduled visits for later this month
        for ($i = 0; $i < 5; $i++) {
            $visitDate = Carbon::now()->addDays(rand(1, $monthEnd->diffInDays(Carbon::now())));
            $patient = $patients->random();
            $service = $services->random();
            
            $visitsData[] = [
                'patient_id' => $patient->id,
                'service_id' => $service->id,
                'visit_date' => $visitDate->toDateString(),
                'start_time' => null, // Not completed yet
                'end_time' => null,
                'status' => 'pending',
                'note' => 'Pending test visit',
            ];
        }
        
        // Create some visits for specific services to test service/package/promo goals
        $cleaningService = Service::where('name', 'Regular Cleaning')->first();
        $packageService = Service::where('name', 'Dental Checkup Package')->first();
        $whiteningService = Service::where('name', 'Whitening Treatment')->first();
        
        // Add specific visits for cleaning service (for service availment testing)
        if ($cleaningService) {
            for ($i = 0; $i < 8; $i++) {
                $visitDate = $monthStart->copy()->addDays(rand(0, min(Carbon::now()->day - 1, $monthEnd->day - 1)));
                $patient = $patients->random();
                
                $visitsData[] = [
                    'patient_id' => $patient->id,
                    'service_id' => $cleaningService->id,
                    'visit_date' => $visitDate->toDateString(),
                    'start_time' => $visitDate->copy()->setTime(rand(8, 16), [0, 30][rand(0, 1)]),
                    'end_time' => $visitDate->copy()->setTime(rand(8, 16), [0, 30][rand(0, 1)])->addMinutes(60),
                    'status' => 'completed',
                    'note' => 'Cleaning service test visit',
                ];
            }
        }
        
        // Add specific visits for package service (for package availment testing)
        if ($packageService) {
            for ($i = 0; $i < 3; $i++) {
                $visitDate = $monthStart->copy()->addDays(rand(0, min(Carbon::now()->day - 1, $monthEnd->day - 1)));
                $patient = $patients->random();
                
                $visitsData[] = [
                    'patient_id' => $patient->id,
                    'service_id' => $packageService->id,
                    'visit_date' => $visitDate->toDateString(),
                    'start_time' => $visitDate->copy()->setTime(rand(8, 16), [0, 30][rand(0, 1)]),
                    'end_time' => $visitDate->copy()->setTime(rand(8, 16), [0, 30][rand(0, 1)])->addMinutes(120),
                    'status' => 'completed',
                    'note' => 'Package service test visit',
                ];
            }
        }
        
        // Add specific visits for whitening during promo period (for promo availment testing)
        if ($whiteningService) {
            // Create visits during the ongoing promo period
            for ($i = 0; $i < 5; $i++) {
                $visitDate = Carbon::now()->subDays(rand(0, 1)); // Within promo period
                $patient = $patients->random();
                
                $visitsData[] = [
                    'patient_id' => $patient->id,
                    'service_id' => $whiteningService->id,
                    'visit_date' => $visitDate->toDateString(),
                    'start_time' => $visitDate->copy()->setTime(rand(8, 16), [0, 30][rand(0, 1)]),
                    'end_time' => $visitDate->copy()->setTime(rand(8, 16), [0, 30][rand(0, 1)])->addMinutes(90),
                    'status' => 'completed',
                    'note' => 'Whitening promo test visit',
                ];
            }
        }
        
        // Insert all visits
        foreach ($visitsData as $visit) {
            PatientVisit::updateOrCreate([
                'patient_id' => $visit['patient_id'],
                'service_id' => $visit['service_id'],
                'visit_date' => $visit['visit_date'],
                'start_time' => $visit['start_time'],
            ], $visit);
        }
    }
}