<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\PatientVisit;
use App\Models\Service;
use App\Models\VisitNote;
use App\Services\ClinicDateResolverService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class ReportSeeder extends Seeder
{
    /**
     * Seed data to test monthly reports.
     */
    public function run(): void
    {
        $now = Carbon::now();
        $startOfMonth = (clone $now)->startOfMonth();
        $endOfMonth = (clone $now)->endOfMonth();

        // Ensure there are patients and services
        $patients = Patient::query()->pluck('id')->all();
        $services = Service::query()->where('is_active', true)->pluck('id')->all();

        if (empty($patients)) {
            $this->command?->warn('No patients found; skipping ReportSeeder');
            return;
        }
        if (empty($services)) {
            $this->command?->warn('No services found; skipping ReportSeeder');
            return;
        }

        // Clear existing visits for the month to avoid duplication when re-seeding
        PatientVisit::whereBetween('start_time', [$startOfMonth, $endOfMonth])->delete();

        $numDays = (int) $startOfMonth->diffInDays($endOfMonth) + 1;
        $statuses = ['pending', 'completed', 'rejected', 'inquiry'];

        $visitRows = [];
        $appointmentRows = [];
        $visitNotesRows = [];

        // Create visits per day, respecting capacity limits
        for ($d = 0; $d < $numDays; $d++) {
            $day = (clone $startOfMonth)->addDays($d);
            
            // Skip Sundays (clinic closed)
            if ($day->isSunday()) {
                continue;
            }
            
            // Get clinic capacity for this day
            $resolver = app(ClinicDateResolverService::class);
            $snap = $resolver->resolve($day);
            
            if (!$snap['is_open']) {
                continue; // Skip if clinic is closed
            }
            
            $capacity = (int) $snap['effective_capacity'];
            $grid = ClinicDateResolverService::buildBlocks($snap['open_time'], $snap['close_time']);
            
            // Track capacity usage per time slot
            $slotUsage = array_fill_keys($grid, 0);
            
            // Calculate max visits based on capacity
            $maxVisitsToday = min(16, $capacity * count($grid) * 0.6); // Max 60% of total capacity
            $visitsToday = random_int(6, $maxVisitsToday);

            for ($i = 0; $i < $visitsToday; $i++) {
                $patientId = $patients[array_rand($patients)];
                $serviceId = $services[array_rand($services)]; // Always assign a service

                // Find available time slot that respects capacity
                $availableSlot = $this->findAvailableSlot($slotUsage, $capacity, $grid);
                if (!$availableSlot) {
                    // No available slots, skip this visit
                    continue;
                }
                
                $startAt = (clone $day)->setTime($availableSlot['hour'], $availableSlot['minute'], 0);
                // Ensure reasonable distribution of statuses
                $statusRoll = random_int(1, 100);
                if ($statusRoll <= 8) {
                    $status = 'inquiry'; // 8% inquiries
                } elseif ($statusRoll <= 13) {
                    $status = 'rejected'; // 5% rejected
                } elseif ($statusRoll <= 23) {
                    $status = 'pending'; // 10% pending
                } else {
                    $status = 'completed'; // 77% completed
                }

                $endAt = null;
                if ($status !== 'pending') {
                    $endAt = (clone $startAt)->addMinutes(random_int(20, 120));
                }
                
                $timeSlot = sprintf('%02d:%02d-%02d:%02d', 
                    $availableSlot['hour'], 
                    $availableSlot['minute'], 
                    $endAt ? $endAt->hour : $availableSlot['hour'] + 1, 
                    $endAt ? $endAt->minute : $availableSlot['minute']
                );

                $visitRows[] = [
                    'patient_id' => $patientId,
                    'service_id' => $serviceId,
                    'visit_date' => $day->toDateString(),
                    'start_time' => $startAt->toDateTimeString(),
                    'end_time' => $endAt?->toDateTimeString(),
                    'status' => $status,
                    'is_seeded' => true,
                    'created_at' => now()->toDateTimeString(),
                    'updated_at' => now()->toDateTimeString(),
                ];

                // Add visit note for inquiry status
                if ($status === 'inquiry') {
                    $visitNotesRows[] = [
                        'patient_visit_id' => null, // Will be set after visit is created
                        'dentist_notes_encrypted' => 'Inquiry only: Patient inquired about services but did not proceed with treatment',
                        'findings_encrypted' => null,
                        'treatment_plan_encrypted' => null,
                        'created_by' => null,
                        'updated_by' => null,
                        'last_accessed_at' => null,
                        'last_accessed_by' => null,
                        'created_at' => now()->toDateTimeString(),
                        'updated_at' => now()->toDateTimeString(),
                    ];
                }

                // Create an appointment for ~40% of visits that have a service
                if ($serviceId && random_int(0, 9) < 4) {
                    $appointmentStatus = ['approved', 'completed'][random_int(0, 1)];
                    $appointmentRows[] = [
                        'patient_id' => $patientId,
                        'service_id' => $serviceId,
                        'patient_hmo_id' => null,
                        'date' => $day->toDateString(),
                        'time_slot' => $timeSlot,
                        'reference_code' => null,
                        'status' => $appointmentStatus,
                        'payment_method' => 'cash',
                        'payment_status' => 'unpaid',
                        'notes' => null,
                        'canceled_at' => null,
                        'reminded_at' => null,
                        'is_seeded' => true,
                        'created_at' => now()->toDateTimeString(),
                        'updated_at' => now()->toDateTimeString(),
                    ];
                }
                
                // Update slot usage
                $this->updateSlotUsage($slotUsage, $timeSlot, $grid);
            }
        }

        // Bulk insert visits for performance
        foreach (array_chunk($visitRows, 1000) as $chunk) {
            PatientVisit::insert($chunk);
        }
        
        // Create visit notes for inquiry visits
        if (!empty($visitNotesRows)) {
            // Get the inquiry visits that were just created
            $inquiryVisits = PatientVisit::where('status', 'inquiry')
                ->whereBetween('start_time', [$startOfMonth, $endOfMonth])
                ->orderBy('created_at')
                ->get();
            
            // Create visit notes for each inquiry visit
            foreach ($inquiryVisits as $index => $visit) {
                if ($index < count($visitNotesRows)) {
                    $noteData = $visitNotesRows[$index];
                    $noteData['patient_visit_id'] = $visit->id;
                    VisitNote::create($noteData);
                }
            }
        }
        
        // Bulk insert appointments
        foreach (array_chunk($appointmentRows, 1000) as $chunk) {
            Appointment::insert($chunk);
        }

        $this->command?->info('ReportSeeder: seeded '.count($visitRows).' visits, '.count($visitNotesRows).' visit notes, and '.count($appointmentRows).' appointments for '.$startOfMonth->format('Y-m'));
    }

    private function findAvailableSlot(array $slotUsage, int $capacity, array $grid): ?array
    {
        // Try to find an available slot
        $attempts = 0;
        $maxAttempts = count($grid) * 2;
        
        while ($attempts < $maxAttempts) {
            $slot = $grid[array_rand($grid)];
            [$hour, $minute] = array_map('intval', explode(':', $slot));
            
            // Check if this slot has capacity
            if ($slotUsage[$slot] < $capacity) {
                return ['hour' => $hour, 'minute' => $minute];
            }
            
            $attempts++;
        }
        
        return null; // No available slot found
    }

    private function updateSlotUsage(array &$slotUsage, string $timeSlot, array $grid): void
    {
        if (strpos($timeSlot, '-') === false) return;
        
        [$start, $end] = explode('-', $timeSlot, 2);
        $startTime = \Carbon\Carbon::createFromFormat('H:i', trim($start));
        $endTime = \Carbon\Carbon::createFromFormat('H:i', trim($end));
        
        $current = $startTime->copy();
        while ($current->lt($endTime)) {
            $slotKey = $current->format('H:i');
            if (array_key_exists($slotKey, $slotUsage)) {
                $slotUsage[$slotKey]++;
            }
            $current->addMinutes(30);
        }
    }
}