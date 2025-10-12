<?php

namespace App\Http\Controllers\API;

use Carbon\Carbon;
use App\Models\Appointment;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Services\ClinicDateResolverService;

class TimeBlockUtilizationController extends Controller
{
    /**
     * Get time block utilization data for a date range
     * Returns data for each day showing time slot usage and appointment counts
     */
    public function getUtilizationData(Request $request, ClinicDateResolverService $resolver)
    {
        $validated = $request->validate([
            'start_date' => 'required|date_format:Y-m-d',
            'end_date' => 'required|date_format:Y-m-d|after_or_equal:start_date',
        ]);

        $startDate = Carbon::parse($validated['start_date'])->startOfDay();
        $endDate = Carbon::parse($validated['end_date'])->endOfDay();

        $result = [];

        // Generate data for each day in the range
        $currentDate = $startDate->copy();
        while ($currentDate->lte($endDate)) {
            $dateStr = $currentDate->toDateString();
            
            // Resolve clinic schedule for this date
            $snap = $resolver->resolve($currentDate);
            
            if ($snap['is_open']) {
                // Build 30-minute time blocks
                $timeBlocks = ClinicDateResolverService::buildBlocks($snap['open_time'], $snap['close_time']);
                $capacity = (int) $snap['effective_capacity'];
                
                $timeSlots = [];
                $totalUtilization = 0;
                $totalAppointments = 0;
                
                foreach ($timeBlocks as $block) {
                    // Count appointments for this time block
                    $appointmentCount = $this->countAppointmentsForTimeBlock($dateStr, $block);
                    $utilizationPercentage = $capacity > 0 ? min(100, round(($appointmentCount / $capacity) * 100)) : 0;
                    
                    $timeSlots[] = [
                        'time' => $block,
                        'appointment_count' => $appointmentCount,
                        'max_capacity' => $capacity,
                        'utilization_percentage' => $utilizationPercentage,
                    ];
                    
                    $totalUtilization += $utilizationPercentage;
                    $totalAppointments += $appointmentCount;
                }
                
                // Calculate average utilization
                $averageUtilization = count($timeBlocks) > 0 ? round($totalUtilization / count($timeBlocks)) : 0;
                
                $result[] = [
                    'date' => $dateStr,
                    'is_open' => true,
                    'open_time' => $snap['open_time'],
                    'close_time' => $snap['close_time'],
                    'capacity' => $capacity,
                    'time_slots' => $timeSlots,
                    'total_slots' => count($timeBlocks),
                    'total_appointments' => $totalAppointments,
                    'total_utilization' => $averageUtilization,
                ];
            } else {
                // Clinic is closed
                $result[] = [
                    'date' => $dateStr,
                    'is_open' => false,
                    'open_time' => null,
                    'close_time' => null,
                    'capacity' => 0,
                    'time_slots' => [],
                    'total_slots' => 0,
                    'total_appointments' => 0,
                    'total_utilization' => 0,
                ];
            }
            
            $currentDate->addDay();
        }

        return response()->json($result);
    }

    /**
     * Count appointments for a specific time block
     */
    private function countAppointmentsForTimeBlock(string $date, string $timeBlock): int
    {
        // Get all appointments for this date
        $appointments = Appointment::where('date', $date)
            ->whereIn('status', ['pending', 'approved', 'completed'])
            ->get(['time_slot']);

        $count = 0;
        
        foreach ($appointments as $appointment) {
            if ($appointment->time_slot && strpos($appointment->time_slot, '-') !== false) {
                // Parse time slot (format: "HH:MM-HH:MM")
                [$startTime, $endTime] = explode('-', $appointment->time_slot, 2);
                
                // Check if the time block overlaps with this appointment
                if ($this->timeBlocksOverlap($timeBlock, $startTime, $endTime)) {
                    $count++;
                }
            }
        }
        
        return $count;
    }

    /**
     * Check if a 30-minute time block overlaps with an appointment time range
     */
    private function timeBlocksOverlap(string $timeBlock, string $appointmentStart, string $appointmentEnd): bool
    {
        $blockTime = Carbon::createFromFormat('H:i', $timeBlock);
        $blockEnd = $blockTime->copy()->addMinutes(30);
        
        $apptStart = Carbon::createFromFormat('H:i', trim($appointmentStart));
        $apptEnd = Carbon::createFromFormat('H:i', trim($appointmentEnd));
        
        // Check for overlap: block starts before appointment ends AND block ends after appointment starts
        return $blockTime->lt($apptEnd) && $blockEnd->gt($apptStart);
    }
}
