<?php

namespace App\Console\Commands;

use Carbon\Carbon;
use App\Models\Appointment;
use App\Models\PatientVisit;
use App\Services\ClinicDateResolverService;
use Illuminate\Console\Command;

class TestMarkNoShows extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:mark-no-shows {--dry-run : Show what would be marked without actually marking}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test the no-show marking logic to verify it works correctly';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        
        $this->info('=== Testing No-Show Marking Logic ===');
        $this->newLine();
        
        $now = now();
        $clinicResolver = new ClinicDateResolverService();
        
        // Get clinic hours for today
        $clinicInfo = $clinicResolver->resolve($now->toDateString());
        
        $this->info("Current Time: {$now->format('Y-m-d H:i:s')}");
        $this->info("Clinic Status: " . ($clinicInfo['is_open'] ? 'OPEN' : 'CLOSED'));
        if ($clinicInfo['is_open']) {
            $this->info("Clinic Hours: {$clinicInfo['open_time']} - {$clinicInfo['close_time']}");
        }
        $this->newLine();
        
        // Only process if clinic is open today
        if (!$clinicInfo['is_open']) {
            $this->warn("Clinic is closed today. Skipping no-show processing.");
            return self::SUCCESS;
        }

        // Process appointments for today
        $candidates = Appointment::where('status', 'approved')
            ->whereDate('date', $now->toDateString())
            ->with(['patient', 'service'])
            ->get();

        $this->info("Found {$candidates->count()} approved appointment(s) for today.");
        $this->newLine();

        if ($candidates->isEmpty()) {
            $this->info("No appointments to check.");
            return self::SUCCESS;
        }

        $potentialNoShows = [];
        $attended = [];
        $notYetDue = [];
        $errors = [];

        foreach ($candidates as $appointment) {
            if (!$appointment->time_slot || strpos($appointment->time_slot, '-') === false) {
                $errors[] = [
                    'appointment' => $appointment,
                    'reason' => 'Invalid time slot format'
                ];
                continue;
            }

            [$startStr] = explode('-', $appointment->time_slot, 2);
            $startStr = trim($startStr);
            if (strlen($startStr) === 8) {
                $startStr = Carbon::createFromFormat('H:i:s', $startStr)->format('H:i');
            }

            try {
                $startAt = Carbon::createFromFormat('Y-m-d H:i', $appointment->date . ' ' . $startStr);
            } catch (\Exception $e) {
                $errors[] = [
                    'appointment' => $appointment,
                    'reason' => 'Failed to parse time: ' . $e->getMessage()
                ];
                continue;
            }

            // Check for a corresponding visit
            $hasVisit = PatientVisit::where('patient_id', $appointment->patient_id)
                ->where('service_id', $appointment->service_id)
                ->whereDate('visit_date', $appointment->date)
                ->exists();

            if ($hasVisit) {
                $attended[] = [
                    'appointment' => $appointment,
                    'start_time' => $startAt,
                    'minutes_past' => $now->diffInMinutes($startAt)
                ];
                continue;
            }

            $minutesPast = $now->diffInMinutes($startAt);
            $shouldMarkNoShow = false;
            $reason = '';

            // Case 1: More than 15 minutes past appointment start time
            if ($now->gt($startAt->copy()->addMinutes(15))) {
                $shouldMarkNoShow = true;
                $reason = 'More than 15 minutes past appointment start time';
            }
            
            // Case 2: At or past closing time and appointment hasn't started yet
            elseif ($now->gte(Carbon::createFromFormat('Y-m-d H:i', $now->toDateString() . ' ' . $clinicInfo['close_time']))) {
                if ($now->gt($startAt)) {
                    $shouldMarkNoShow = true;
                    $reason = 'Clinic closing time reached and appointment time has passed';
                }
            }

            if ($shouldMarkNoShow) {
                $potentialNoShows[] = [
                    'appointment' => $appointment,
                    'start_time' => $startAt,
                    'minutes_past' => $minutesPast,
                    'reason' => $reason
                ];
            } else {
                $notYetDue[] = [
                    'appointment' => $appointment,
                    'start_time' => $startAt,
                    'minutes_past' => $minutesPast
                ];
            }
        }

        // Display results
        $this->info('=== TEST RESULTS ===');
        $this->newLine();

        // Attended appointments
        if (!empty($attended)) {
            $this->info("✓ ATTENDED APPOINTMENTS ({count}):", ['count' => count($attended)]);
            foreach ($attended as $item) {
                $app = $item['appointment'];
                $patientName = $app->patient ? ($app->patient->first_name . ' ' . $app->patient->last_name) : 'N/A';
                $this->line("  - ID: {$app->id} | Patient: {$patientName} | Time: {$item['start_time']->format('H:i')} | Minutes past: {$item['minutes_past']} (Has visit)");
            }
            $this->newLine();
        }

        // Not yet due
        if (!empty($notYetDue)) {
            $this->info("⏳ NOT YET DUE ({count}):", ['count' => count($notYetDue)]);
            foreach ($notYetDue as $item) {
                $app = $item['appointment'];
                $patientName = $app->patient ? ($app->patient->first_name . ' ' . $app->patient->last_name) : 'N/A';
                $status = $item['minutes_past'] < 0 ? 'Future appointment' : ($item['minutes_past'] < 15 ? "Only {$item['minutes_past']} minutes past" : 'Other reason');
                $this->line("  - ID: {$app->id} | Patient: {$patientName} | Time: {$item['start_time']->format('H:i')} | {$status}");
            }
            $this->newLine();
        }

        // Potential no-shows
        if (!empty($potentialNoShows)) {
            $this->warn("⚠️  POTENTIAL NO-SHOWS ({count}):", ['count' => count($potentialNoShows)]);
            foreach ($potentialNoShows as $item) {
                $app = $item['appointment'];
                $patientName = $app->patient ? ($app->patient->first_name . ' ' . $app->patient->last_name) : 'N/A';
                $this->line("  - ID: {$app->id} | Patient: {$patientName} | Time: {$item['start_time']->format('H:i')} | Minutes past: {$item['minutes_past']}");
                $this->line("    Reason: {$item['reason']}");
                
                if (!$dryRun) {
                    $this->line("    → Would be marked as no_show");
                } else {
                    $this->line("    → [DRY RUN] Would be marked as no_show");
                }
            }
            $this->newLine();
        } else {
            $this->info("✓ No appointments need to be marked as no-show.");
            $this->newLine();
        }

        // Errors
        if (!empty($errors)) {
            $this->error("✗ ERRORS ({count}):", ['count' => count($errors)]);
            foreach ($errors as $error) {
                $app = $error['appointment'];
                $this->line("  - Appointment ID: {$app->id} | {$error['reason']}");
            }
            $this->newLine();
        }

        // Summary
        $this->info('=== SUMMARY ===');
        $this->table(
            ['Category', 'Count'],
            [
                ['Total Approved Appointments', count($candidates)],
                ['Attended (Has Visit)', count($attended)],
                ['Not Yet Due', count($notYetDue)],
                ['Would Be Marked No-Show', count($potentialNoShows)],
                ['Errors', count($errors)],
            ]
        );

        // Test the 15-minute threshold calculation
        $this->newLine();
        $this->info('=== TESTING 15-MINUTE THRESHOLD ===');
        $testTimes = [
            now()->subMinutes(14),  // 14 minutes ago - should NOT be marked
            now()->subMinutes(15),  // Exactly 15 minutes ago - should NOT be marked (gt = greater than)
            now()->subMinutes(16),  // 16 minutes ago - SHOULD be marked
            now()->subMinutes(30),  // 30 minutes ago - SHOULD be marked
        ];

        foreach ($testTimes as $testTime) {
            $minutesDiff = now()->diffInMinutes($testTime);
            $wouldMark = now()->gt($testTime->copy()->addMinutes(15));
            $status = $wouldMark ? '✓ WOULD MARK' : '✗ Would NOT mark';
            $this->line("  Time: {$testTime->format('H:i:s')} ({$minutesDiff} minutes ago) → {$status}");
        }

        return self::SUCCESS;
    }
}

