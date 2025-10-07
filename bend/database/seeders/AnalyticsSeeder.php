<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\PatientVisit;
use App\Models\Payment;
use App\Models\PerformanceGoal;
use App\Models\GoalProgressSnapshot;
use App\Models\Service;
use App\Models\User;
use App\Models\VisitNote;
use App\Models\InventoryItem;
use App\Models\InventoryBatch;
use App\Models\InventoryMovement;
use App\Models\Supplier;
use App\Services\ClinicDateResolverService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AnalyticsSeeder extends Seeder
{
    /**
     * Seed comprehensive analytics data for 1 year to test admin analytics and monthly reports.
     * 
     * This seeder respects the system's clinic schedule and visit flow:
     * - Only creates visits on days when clinic is open (via ClinicDateResolverService)
     * - No pending visits are created (visits are resolved immediately)
     * - Proper visit codes are generated for completed visits
     * - Appointments and visits are properly linked
     * - Payments are correctly linked to completed visits
     */
    public function run(): void
    {
        $this->command->info('Starting AnalyticsSeeder - generating 1 year of comprehensive data...');

        // Clear existing analytics data
        $this->clearExistingData();

        // Get required data
        $patients = $this->ensurePatients();
        $services = $this->ensureServices();
        $adminUser = User::where('role', 'admin')->first();
        
        // Setup inventory for loss tracking
        $this->setupInventory($adminUser);

        if (!$adminUser) {
            $this->command->error('No admin user found. Please run UserSeeder first.');
            return;
        }

        // Generate 1 year of data
        $startDate = Carbon::now()->subYear()->startOfMonth();
        $endDate = Carbon::now()->endOfMonth();

        $this->command->info("Generating data from {$startDate->format('Y-m-d')} to {$endDate->format('Y-m-d')}");

        // Generate performance goals
        $this->generatePerformanceGoals($adminUser, $startDate);

        // Generate monthly data
        $current = $startDate->copy();
        while ($current->lte($endDate)) {
            $this->generateMonthData($current, $patients, $services, $adminUser);
            $this->generateInventoryLoss($current, $adminUser);
            $current->addMonth();
        }

        // Generate goal progress snapshots
        $this->generateGoalProgressSnapshots($startDate, $endDate);

        $this->command->info('AnalyticsSeeder completed successfully!');
        $this->displaySummary();
    }

    private function clearExistingData(): void
    {
        $this->command->info('Clearing existing analytics data...');
        
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        PatientVisit::truncate();
        Appointment::truncate();
        Payment::truncate();
        GoalProgressSnapshot::truncate();
        PerformanceGoal::truncate();
        InventoryMovement::truncate();
        InventoryBatch::truncate();
        InventoryItem::truncate();
        Supplier::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
    }

    private function ensurePatients(): array
    {
        $patients = Patient::all();
        
        if ($patients->count() < 50) {
            $this->command->info('Generating additional patients for analytics...');
            
            $faker = \Faker\Factory::create();
            $newPatients = [];
            
            for ($i = 0; $i < 50; $i++) {
                $newPatients[] = [
                    'first_name' => $faker->firstName(),
                    'last_name' => $faker->lastName(),
                    'middle_name' => $faker->optional(0.7)->firstName(),
                    'birthdate' => $faker->dateTimeBetween('-80 years', '-18 years')->format('Y-m-d'),
                    'sex' => $faker->randomElement(['male', 'female']),
                    'contact_number' => '09' . $faker->numerify('########'),
                    'address' => $faker->city() . ', ' . $faker->state(),
                    'is_linked' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
            
            Patient::insert($newPatients);
            $patients = Patient::all();
        }
        
        return $patients->pluck('id')->toArray();
    }

    private function ensureServices(): array
    {
        $services = Service::all();
        
        if ($services->count() < 10) {
            $this->command->info('Generating additional services for analytics...');
            
            $additionalServices = [
                ['name' => 'Root Canal Treatment', 'price' => 8000, 'category' => 'Endodontic', 'estimated_minutes' => 120],
                ['name' => 'Crown Placement', 'price' => 12000, 'category' => 'Prosthodontic', 'estimated_minutes' => 90],
                ['name' => 'Orthodontic Consultation', 'price' => 1500, 'category' => 'Orthodontic', 'estimated_minutes' => 30],
                ['name' => 'Dental Implant', 'price' => 25000, 'category' => 'Surgical', 'estimated_minutes' => 180],
                ['name' => 'Gum Treatment', 'price' => 4000, 'category' => 'Periodontic', 'estimated_minutes' => 60],
                ['name' => 'Oral Surgery', 'price' => 15000, 'category' => 'Surgical', 'estimated_minutes' => 120],
                ['name' => 'Dental Checkup', 'price' => 1000, 'category' => 'Preventive', 'estimated_minutes' => 20],
                ['name' => 'X-Ray', 'price' => 500, 'category' => 'Diagnostic', 'estimated_minutes' => 10],
            ];
            
            foreach ($additionalServices as $service) {
                Service::create(array_merge($service, [
                    'description' => 'Professional ' . strtolower($service['name']),
                    'is_excluded_from_analytics' => false,
                    'is_special' => false,
                    'special_start_date' => null,
                    'special_end_date' => null,
                ]));
            }
            
            $services = Service::all();
        }
        
        return $services->pluck('id')->toArray();
    }

    private function generatePerformanceGoals(User $adminUser, Carbon $startDate): void
    {
        $this->command->info('Generating performance goals...');
        
        $goals = [
            [
                'period_type' => 'monthly',
                'period_start' => $startDate->copy()->startOfMonth(),
                'metric' => 'total_visits',
                'target_value' => 200,
                'status' => 'active',
            ],
            [
                'period_type' => 'monthly',
                'period_start' => $startDate->copy()->startOfMonth(),
                'metric' => 'revenue',
                'target_value' => 500000,
                'status' => 'active',
            ],
            [
                'period_type' => 'monthly',
                'period_start' => $startDate->copy()->startOfMonth(),
                'metric' => 'appointment_completion_rate',
                'target_value' => 85,
                'status' => 'active',
            ],
        ];
        
        foreach ($goals as $goal) {
            PerformanceGoal::create(array_merge($goal, [
                'created_by' => $adminUser->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }

    private function generateMonthData(Carbon $month, array $patients, array $services, User $adminUser): void
    {
        $this->command->info("Generating data for {$month->format('Y-m')}...");
        
        $startOfMonth = $month->copy()->startOfMonth();
        $endOfMonth = $month->copy()->endOfMonth();
        $daysInMonth = $startOfMonth->daysInMonth;
        
        $visitRows = [];
        $appointmentRows = [];
        $paymentRows = [];
        
        // Generate data for each day
        for ($day = 1; $day <= $daysInMonth; $day++) {
            $currentDay = $startOfMonth->copy()->addDays($day - 1);
            
            // Get clinic capacity for this day using the system's date resolver
            $resolver = app(ClinicDateResolverService::class);
            $snap = $resolver->resolve($currentDay);
            
            // Only generate visits on days when clinic is actually open
            if (!$snap['is_open']) {
                continue; // Skip if clinic is closed according to system configuration
            }
            
            $capacity = (int) $snap['effective_capacity'];
            $grid = ClinicDateResolverService::buildBlocks($snap['open_time'], $snap['close_time']);
            
            // Track capacity usage per time slot
            $slotUsage = array_fill_keys($grid, 0);
            
            // Generate visits for the day, respecting capacity limits
            $maxVisitsToday = min(25, $capacity * count($grid) * 0.8); // Max 80% of total capacity
            $visitsToday = min($this->getDailyVisitCount($currentDay), $maxVisitsToday);
            
            for ($i = 0; $i < $visitsToday; $i++) {
                $patientId = $patients[array_rand($patients)];
                $serviceId = $services[array_rand($services)];
                
                // Generate realistic time slots that respect capacity
                $timeSlot = $this->generateTimeSlotWithCapacity($currentDay, $slotUsage, $capacity, $grid);
                if (!$timeSlot) {
                    // No available slots, skip this visit
                    continue;
                }
                
                $startTime = $timeSlot['start'];
                $endTime = $timeSlot['end'];
                
                // Update slot usage
                $this->updateSlotUsage($slotUsage, $timeSlot['slot'], $grid);
                
                // Determine visit status
                $status = $this->getVisitStatus($currentDay);
                
                // Generate visit code for completed visits (as they would have been processed)
                $visitCode = null;
                if ($status === 'completed') {
                    $visitCode = PatientVisit::generateVisitCode();
                }
                
                // Create visit
                $visitData = [
                    'patient_id' => $patientId,
                    'service_id' => $serviceId,
                    'visit_date' => $currentDay->toDateString(),
                    'start_time' => $startTime->toDateTimeString(),
                    'end_time' => $endTime->toDateTimeString(),
                    'status' => $status,
                    'visit_code' => $visitCode,
                    'is_seeded' => true,
                    'created_at' => now()->toDateTimeString(),
                    'updated_at' => now()->toDateTimeString(),
                ];
                
                $visitRows[] = $visitData;
                
                // Create appointment for 60% of visits (appointments should be created before visits)
                if (rand(1, 100) <= 60) {
                    $appointmentStatus = $this->getAppointmentStatus($status);
                    $referenceCode = 'APT' . strtoupper(uniqid());
                    
                    $appointmentData = [
                        'patient_id' => $patientId,
                        'service_id' => $serviceId,
                        'patient_hmo_id' => null,
                        'date' => $currentDay->toDateString(),
                        'time_slot' => $timeSlot['slot'],
                        'reference_code' => $referenceCode,
                        'status' => $appointmentStatus,
                        'payment_method' => $this->getPaymentMethod(),
                        'payment_status' => $this->getPaymentStatus($appointmentStatus),
                        'notes' => $this->generateAppointmentNote(),
                        'is_seeded' => true,
                        'created_at' => $startTime->toDateTimeString(),
                        'updated_at' => $startTime->toDateTimeString(),
                    ];
                    
                    $appointmentRows[] = $appointmentData;
                    
                    // If appointment was completed, clear the reference code (as per system logic)
                    if ($appointmentStatus === 'completed') {
                        $appointmentData['reference_code'] = null;
                    }
                }
                
                // Create payment for completed visits
                if ($status === 'completed') {
                    $service = Service::find($serviceId);
                    $amount = $service ? $service->price : 2000;
                    
                    $paymentData = [
                        'appointment_id' => null,
                        'patient_visit_id' => null, // Will be updated after visit creation
                        'currency' => 'PHP',
                        'amount_due' => $amount,
                        'amount_paid' => $amount,
                        'method' => $this->getPaymentMethod(),
                        'status' => 'paid',
                        'reference_no' => 'PAY' . strtoupper(uniqid()),
                        'paid_at' => $endTime->toDateTimeString(),
                        'created_by' => $adminUser->id,
                        'created_at' => $endTime->toDateTimeString(),
                        'updated_at' => $endTime->toDateTimeString(),
                    ];
                    
                    $paymentRows[] = $paymentData;
                }
            }
        }
        
        // Bulk insert visits
        foreach (array_chunk($visitRows, 1000) as $chunk) {
            PatientVisit::insert($chunk);
        }
        
        // Create visit notes for visits that need them
        $this->createVisitNotes();
        
        // Bulk insert appointments
        foreach (array_chunk($appointmentRows, 1000) as $chunk) {
            Appointment::insert($chunk);
        }
        
        // Create payments and link them to visits after visits are created
        $this->createPaymentsForVisits($paymentRows, $startOfMonth, $endOfMonth);
        
        $this->command->info("Generated {$month->format('Y-m')}: " . count($visitRows) . " visits, " . count($appointmentRows) . " appointments");
    }

    private function getDailyVisitCount(Carbon $day): int
    {
        // More visits on weekdays, fewer on weekends
        if ($day->isWeekend()) {
            return rand(3, 8);
        }
        
        // Seasonal variation
        $month = $day->month;
        $baseCount = 15;
        
        // Higher in summer months (March-May) and December
        if (in_array($month, [3, 4, 5, 12])) {
            $baseCount += 5;
        }
        
        // Lower in January and February
        if (in_array($month, [1, 2])) {
            $baseCount -= 3;
        }
        
        return rand($baseCount - 5, $baseCount + 10);
    }

    private function generateTimeSlot(Carbon $day): array
    {
        // Clinic hours: 8 AM to 6 PM
        $hour = rand(8, 17);
        $minute = [0, 15, 30, 45][array_rand([0, 1, 2, 3])];
        
        $start = $day->copy()->setTime($hour, $minute, 0);
        $duration = rand(20, 120); // 20 minutes to 2 hours
        $end = $start->copy()->addMinutes($duration);
        
        return [
            'start' => $start,
            'end' => $end,
            'slot' => sprintf('%02d:%02d-%02d:%02d', $hour, $minute, $end->hour, $end->minute),
        ];
    }

    private function generateTimeSlotWithCapacity(Carbon $day, array $slotUsage, int $capacity, array $grid): ?array
    {
        // Try to find an available slot
        $attempts = 0;
        $maxAttempts = count($grid) * 2; // Try twice as many times as available slots
        
        while ($attempts < $maxAttempts) {
            $slot = $grid[array_rand($grid)];
            [$hour, $minute] = array_map('intval', explode(':', $slot));
            
            $start = $day->copy()->setTime($hour, $minute, 0);
            $duration = rand(20, 120); // 20 minutes to 2 hours
            $end = $start->copy()->addMinutes($duration);
            
            // Check if this slot and duration fits within capacity
            if ($this->canFitInSlot($slotUsage, $slot, $duration, $capacity, $grid)) {
                return [
                    'start' => $start,
                    'end' => $end,
                    'slot' => sprintf('%02d:%02d-%02d:%02d', $hour, $minute, $end->hour, $end->minute),
                ];
            }
            
            $attempts++;
        }
        
        return null; // No available slot found
    }

    private function canFitInSlot(array $slotUsage, string $startSlot, int $duration, int $capacity, array $grid): bool
    {
        $startTime = Carbon::createFromFormat('H:i', $startSlot);
        $endTime = $startTime->copy()->addMinutes($duration);
        
        // Check each 30-minute block that this appointment would occupy
        $current = $startTime->copy();
        while ($current->lt($endTime)) {
            $slotKey = $current->format('H:i');
            
            // If slot doesn't exist in grid or is already at capacity, can't fit
            if (!array_key_exists($slotKey, $slotUsage) || $slotUsage[$slotKey] >= $capacity) {
                return false;
            }
            
            $current->addMinutes(30);
        }
        
        return true;
    }

    private function updateSlotUsage(array &$slotUsage, string $timeSlot, array $grid): void
    {
        if (strpos($timeSlot, '-') === false) return;
        
        [$start, $end] = explode('-', $timeSlot, 2);
        $startTime = Carbon::createFromFormat('H:i', trim($start));
        $endTime = Carbon::createFromFormat('H:i', trim($end));
        
        $current = $startTime->copy();
        while ($current->lt($endTime)) {
            $slotKey = $current->format('H:i');
            if (array_key_exists($slotKey, $slotUsage)) {
                $slotUsage[$slotKey]++;
            }
            $current->addMinutes(30);
        }
    }

    private function getVisitStatus(Carbon $day): string
    {
        // 85% completed, 10% inquiry, 5% rejected
        // No pending visits - they should be resolved immediately
        $rand = rand(1, 100);
        if ($rand <= 85) return 'completed';
        if ($rand <= 95) return 'inquiry';
        return 'rejected';
    }

    private function getAppointmentStatus(string $visitStatus): string
    {
        switch ($visitStatus) {
            case 'completed':
                return 'completed';
            case 'pending':
                return 'approved';
            case 'rejected':
                return 'cancelled';
            default:
                return 'approved';
        }
    }

    private function getPaymentMethod(): string
    {
        $methods = ['cash', 'maya', 'hmo'];
        return $methods[array_rand($methods)];
    }

    private function getPaymentStatus(string $appointmentStatus): string
    {
        if ($appointmentStatus === 'completed') {
            return rand(1, 100) <= 90 ? 'paid' : 'unpaid';
        }
        return 'unpaid';
    }

    private function generateVisitNote(string $status): ?string
    {
        if ($status === 'inquiry') {
            $inquiryNotes = [
                'Inquiry only: Patient inquired about services but did not proceed with treatment',
                'Inquiry only: Patient asked about pricing and treatment options',
                'Inquiry only: Patient inquired about available services',
                'Inquiry only: Patient requested information only',
                'Inquiry only: Patient consulted but did not book treatment',
            ];
            return $inquiryNotes[array_rand($inquiryNotes)];
        }
        
        if ($status === 'rejected') {
            $rejectedNotes = [
                'Rejected: Patient left without treatment',
                'Rejected: Human error',
                'Rejected: Line too long',
                'Rejected: Patient cancelled',
            ];
            return $rejectedNotes[array_rand($rejectedNotes)];
        }
        
        // Default notes for completed/pending visits
        $notes = [
            'Regular checkup completed',
            'Treatment successful',
            'Patient satisfied with service',
            'Follow-up scheduled',
            'Additional treatment recommended',
            null,
            null,
            null,
        ];
        
        return $notes[array_rand($notes)];
    }

    private function generateAppointmentNote(): ?string
    {
        $notes = [
            'Patient confirmed appointment',
            'Reminder sent',
            'Walk-in patient',
            'Emergency appointment',
            null,
            null,
            null,
        ];
        
        return $notes[array_rand($notes)];
    }

    private function createPaymentsForVisits(array $paymentRows, Carbon $startOfMonth, Carbon $endOfMonth): void
    {
        // Get completed visits for the month, ordered by creation time to match payment rows
        $visits = PatientVisit::whereBetween('start_time', [$startOfMonth, $endOfMonth])
            ->where('status', 'completed')
            ->orderBy('created_at', 'asc')
            ->get();
        
        // Create payments for each completed visit
        foreach ($visits as $index => $visit) {
            if ($index < count($paymentRows)) {
                $paymentData = $paymentRows[$index];
                $paymentData['patient_visit_id'] = $visit->id;
                
                Payment::create($paymentData);
            }
        }
    }

    private function generateGoalProgressSnapshots(Carbon $startDate, Carbon $endDate): void
    {
        $this->command->info('Generating goal progress snapshots...');
        
        $goals = PerformanceGoal::all();
        $current = $startDate->copy()->startOfMonth();
        
        while ($current->lte($endDate)) {
            foreach ($goals as $goal) {
                $actualValue = $this->calculateGoalProgress($goal, $current);
                
                GoalProgressSnapshot::create([
                    'goal_id' => $goal->id,
                    'as_of_date' => $current->copy()->endOfMonth(),
                    'actual_value' => $actualValue,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            
            $current->addMonth();
        }
    }

    private function calculateGoalProgress(PerformanceGoal $goal, Carbon $month): int
    {
        $startOfMonth = $month->copy()->startOfMonth();
        $endOfMonth = $month->copy()->endOfMonth();
        
        switch ($goal->metric) {
            case 'total_visits':
                return PatientVisit::whereBetween('start_time', [$startOfMonth, $endOfMonth])
                    ->where('status', 'completed')
                    ->count();
                    
            case 'revenue':
                return Payment::whereHas('patientVisit', function ($query) use ($startOfMonth, $endOfMonth) {
                    $query->whereBetween('start_time', [$startOfMonth, $endOfMonth])
                        ->where('status', 'completed');
                })
                ->where('status', 'paid')
                ->sum('amount_paid');
                
            case 'appointment_completion_rate':
                $totalAppointments = Appointment::whereBetween('date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
                    ->where('status', '!=', 'cancelled')
                    ->count();
                    
                $completedAppointments = Appointment::whereBetween('date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
                    ->where('status', 'completed')
                    ->count();
                    
                return $totalAppointments > 0 ? round(($completedAppointments / $totalAppointments) * 100) : 0;
                
            default:
                return 0;
        }
    }

    private function createVisitNotes(): void
    {
        // Get all visits that need notes (inquiry status, completed visits, or rejected visits)
        $visits = PatientVisit::whereIn('status', ['inquiry', 'completed', 'rejected'])
            ->whereDoesntHave('visitNotes')
            ->get();
        
        foreach ($visits as $visit) {
            $noteContent = $this->generateVisitNote($visit->status);
            
            // Only create notes if there's actual content
            if ($noteContent || $visit->status === 'completed') {
                VisitNote::create([
                    'patient_visit_id' => $visit->id,
                    'dentist_notes_encrypted' => $noteContent,
                    'findings_encrypted' => $visit->status === 'completed' ? 'Patient examination completed successfully.' : null,
                    'treatment_plan_encrypted' => $visit->status === 'completed' ? 'Follow-up recommended in 6 months.' : null,
                    'created_by' => null,
                    'updated_by' => null,
                    'last_accessed_at' => null,
                    'last_accessed_by' => null,
                    'created_at' => $visit->created_at,
                    'updated_at' => $visit->updated_at,
                ]);
            }
        }
    }

    private function displaySummary(): void
    {
        $this->command->info('=== Analytics Data Summary ===');
        $this->command->info('Total Patient Visits: ' . PatientVisit::count());
        
        // Show visit status breakdown
        $visitStatuses = PatientVisit::selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();
        foreach ($visitStatuses as $status => $count) {
            $this->command->info("  - {$status}: {$count}");
        }
        
        $this->command->info('Total Appointments: ' . Appointment::count());
        $this->command->info('Total Payments: ' . Payment::count());
        $this->command->info('Total Performance Goals: ' . PerformanceGoal::count());
        $this->command->info('Total Goal Snapshots: ' . GoalProgressSnapshot::count());
        $this->command->info('Total Visit Notes: ' . VisitNote::count());
        $this->command->info('Total Inventory Items: ' . InventoryItem::count());
        $this->command->info('Total Inventory Batches: ' . InventoryBatch::count());
        $this->command->info('Total Inventory Movements: ' . InventoryMovement::count());
        
        $revenue = Payment::where('status', 'paid')->sum('amount_paid');
        $this->command->info('Total Revenue: ₱' . number_format($revenue, 2));
        
        $lossCost = DB::table('inventory_movements as im')
            ->join('inventory_batches as ib', 'im.batch_id', '=', 'ib.id')
            ->where('im.type', 'adjust')
            ->whereIn('im.adjust_reason', ['expired', 'theft'])
            ->selectRaw('SUM(im.quantity * ib.cost_per_unit) as total_cost')
            ->value('total_cost');
        $this->command->info('Total Inventory Loss Cost: ₱' . number_format($lossCost, 2));
        
        $this->command->info('=== Analytics Seeder Complete ===');
    }

    private function setupInventory(User $adminUser): void
    {
        $this->command->info('Setting up inventory for loss tracking...');
        
        // Create a supplier if none exists
        $supplier = Supplier::first();
        if (!$supplier) {
            $supplier = Supplier::create([
                'name' => 'Medical Supply Co.',
                'contact_person' => 'John Doe',
                'email' => 'supplies@medical.com',
                'phone' => '+1234567890',
                'address' => '123 Supply St, City',
            ]);
        }
        
        // Create inventory items with realistic costs
        $items = [
            [
                'name' => 'Dental Anesthetic',
                'sku_code' => 'ANEST-001',
                'type' => 'drug',
                'unit' => 'ml',
                'low_stock_threshold' => 10,
                'is_controlled' => true,
                'created_by' => $adminUser->id,
            ],
            [
                'name' => 'Dental Composite',
                'sku_code' => 'COMP-001',
                'type' => 'supply',
                'unit' => 'g',
                'low_stock_threshold' => 5,
                'is_controlled' => false,
                'created_by' => $adminUser->id,
            ],
            [
                'name' => 'Dental Floss',
                'sku_code' => 'FLOSS-001',
                'type' => 'supply',
                'unit' => 'pcs',
                'low_stock_threshold' => 50,
                'is_controlled' => false,
                'created_by' => $adminUser->id,
            ],
            [
                'name' => 'Dental X-Ray Film',
                'sku_code' => 'XRAY-001',
                'type' => 'supply',
                'unit' => 'pcs',
                'low_stock_threshold' => 20,
                'is_controlled' => false,
                'created_by' => $adminUser->id,
            ],
        ];
        
        foreach ($items as $index => $itemData) {
            $item = InventoryItem::create($itemData);
            
            // Define realistic cost ranges for each item type
            $costRanges = [
                'Dental Anesthetic' => [150, 300], // ₱150-300 per ml
                'Dental Composite' => [200, 500],  // ₱200-500 per g
                'Dental Floss' => [5, 15],        // ₱5-15 per piece
                'Dental X-Ray Film' => [25, 50],  // ₱25-50 per piece
            ];
            
            $costRange = $costRanges[$item->name] ?? [10, 100];
            
            // Create initial batches for each item
            $batchCount = rand(2, 4);
            for ($i = 0; $i < $batchCount; $i++) {
                $receivedAt = Carbon::now()->subMonths(rand(1, 12))->subDays(rand(0, 30));
                $expiryDate = $item->type === 'drug' ? $receivedAt->copy()->addMonths(rand(12, 36)) : null;
                
                InventoryBatch::create([
                    'item_id' => $item->id,
                    'lot_number' => 'LOT' . strtoupper(uniqid()),
                    'batch_number' => 'BATCH' . strtoupper(uniqid()),
                    'expiry_date' => $expiryDate,
                    'qty_received' => rand(50, 200),
                    'qty_on_hand' => rand(20, 150),
                    'cost_per_unit' => rand($costRange[0], $costRange[1]),
                    'supplier_id' => $supplier->id,
                    'invoice_no' => 'INV' . strtoupper(uniqid()),
                    'invoice_date' => $receivedAt->toDateString(),
                    'received_at' => $receivedAt,
                    'received_by' => $adminUser->id,
                ]);
            }
        }
    }

    private function generateInventoryLoss(Carbon $month, User $adminUser): void
    {
        $startOfMonth = $month->copy()->startOfMonth();
        $endOfMonth = $month->copy()->endOfMonth();
        
        // Get all inventory items
        $items = InventoryItem::with('batches')->get();
        
        // Generate 2-5 loss events per month
        $lossEvents = rand(2, 5);
        
        for ($i = 0; $i < $lossEvents; $i++) {
            $item = $items->random();
            $batch = $item->batches->where('qty_on_hand', '>', 0)->random();
            
            if (!$batch) continue;
            
            $lossQuantity = min(rand(1, 10), $batch->qty_on_hand);
            $lossReason = rand(1, 100) <= 70 ? 'expired' : 'theft'; // 70% expired, 30% theft
            
            // Create inventory movement for loss
            InventoryMovement::create([
                'item_id' => $item->id,
                'batch_id' => $batch->id,
                'type' => 'adjust',
                'quantity' => $lossQuantity,
                'adjust_reason' => $lossReason,
                'user_id' => $adminUser->id,
                'notes' => $lossReason === 'expired' ? 'Item expired and disposed' : 'Item reported stolen',
                'created_at' => $startOfMonth->copy()->addDays(rand(1, 28))->addHours(rand(8, 17)),
            ]);
            
            // Update batch quantity
            $batch->qty_on_hand -= $lossQuantity;
            $batch->save();
        }
    }
}
