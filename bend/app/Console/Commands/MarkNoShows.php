<?php

namespace App\Console\Commands;

use Carbon\Carbon;
use App\Models\Appointment;
use App\Models\PatientVisit;
use App\Services\PatientManagerService;
use App\Services\ClinicDateResolverService;
use Illuminate\Console\Command;
use App\Services\SystemLogService;

class MarkNoShows extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'appointments:mark-no-shows';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Mark approved appointments as no_show if more than 1 hour past start with no visit, or at closing time if not yet started.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $now = now();
        $clinicResolver = new ClinicDateResolverService();
        
        // Get clinic hours for today
        $clinicInfo = $clinicResolver->resolve($now->toDateString());
        
        // Only process if clinic is open today
        if (!$clinicInfo['is_open']) {
            $this->info("Clinic is closed today. Skipping no-show processing.");
            return self::SUCCESS;
        }

        $updated = 0;

        // Process appointments for today
        $candidates = Appointment::where('status', 'approved')
            ->whereDate('date', $now->toDateString())
            ->get();

        foreach ($candidates as $appointment) {
            if (!$appointment->time_slot || strpos($appointment->time_slot, '-') === false) continue;

            [$startStr] = explode('-', $appointment->time_slot, 2);
            $startStr = trim($startStr);
            if (strlen($startStr) === 8) {
                $startStr = Carbon::createFromFormat('H:i:s', $startStr)->format('H:i');
            }

            try {
                $startAt = Carbon::createFromFormat('Y-m-d H:i', $appointment->date . ' ' . $startStr);
            } catch (\Exception $e) {
                continue;
            }

            // Check for a corresponding visit (same patient, same service, same date)
            $hasVisit = PatientVisit::where('patient_id', $appointment->patient_id)
                ->where('service_id', $appointment->service_id)
                ->whereDate('visit_date', $appointment->date)
                ->exists();

            if ($hasVisit) {
                continue; // attended
            }

            $shouldMarkNoShow = false;
            $reason = '';

            // Case 1: More than 1 hour past appointment start time
            if ($now->gt($startAt->copy()->addHour())) {
                $shouldMarkNoShow = true;
                $reason = 'More than 1 hour past appointment start time';
            }
            
            // Case 2: At or past closing time and appointment hasn't started yet
            elseif ($now->gte(Carbon::createFromFormat('Y-m-d H:i', $now->toDateString() . ' ' . $clinicInfo['close_time']))) {
                if ($now->gt($startAt)) {
                    $shouldMarkNoShow = true;
                    $reason = 'Clinic closing time reached and appointment time has passed';
                }
            }

            if ($shouldMarkNoShow) {
                $old = $appointment->status;
                $appointment->status = 'no_show';
                $appointment->save();

                SystemLogService::logAppointment(
                    'marked_no_show',
                    $appointment->id,
                    "Automatically marked appointment as no_show: {$reason}",
                    [
                        'appointment_id' => $appointment->id,
                        'patient_id' => $appointment->patient_id,
                        'service_id' => $appointment->service_id,
                        'date' => $appointment->date,
                        'time_slot' => $appointment->time_slot,
                        'previous_status' => $old,
                        'reason' => $reason,
                        'clinic_close_time' => $clinicInfo['close_time'],
                        'current_time' => $now->format('Y-m-d H:i:s'),
                    ]
                );

                // Handle no-show tracking in PatientManager
                PatientManagerService::handleNoShow($appointment);

                // Send no-show email notification
                \App\Jobs\NoShowEmailJob::dispatch($appointment);

                $updated += 1;
            }
        }

        $this->info("Marked {$updated} appointment(s) as no_show.");
        return self::SUCCESS;
    }
}

