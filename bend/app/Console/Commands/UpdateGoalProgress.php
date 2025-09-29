<?php

namespace App\Console\Commands;

use App\Models\GoalProgressSnapshot;
use App\Models\PerformanceGoal;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class UpdateGoalProgress extends Command
{
    protected $signature = 'goals:update-progress';
    protected $description = 'Compute actual metric values for active goals and update statuses on period end';

    public function handle(): int
    {
        $today = Carbon::today();
        $activeGoals = PerformanceGoal::query()
            ->where('status', 'active')
            ->get();

        foreach ($activeGoals as $goal) {
            $periodStart = Carbon::parse($goal->period_start);
            $periodEnd = $goal->period_end ? Carbon::parse($goal->period_end) : (clone $periodStart)->endOfMonth();

            $actual = $this->calculateActualValue($goal, $today);

            GoalProgressSnapshot::updateOrCreate(
                [
                    'goal_id' => $goal->id,
                    'as_of_date' => $today,
                ],
                [
                    'actual_value' => $actual,
                ]
            );

            // Check if period has ended
            $periodHasEnded = $goal->period_type === 'month' 
                ? $today->greaterThanOrEqualTo($periodEnd)
                : $today->greaterThanOrEqualTo($periodEnd);

            if ($periodHasEnded) {
                $goal->status = ($actual >= (int)$goal->target_value) ? 'done' : 'missed';
                $goal->save();
            }
        }

        $this->info('Goal progress updated for ' . $activeGoals->count() . ' goals.');
        return Command::SUCCESS;
    }

    /**
     * Calculate the actual value for a goal based on its metric type
     */
    private function calculateActualValue(PerformanceGoal $goal, Carbon $asOfDate): int
    {
        $periodStart = Carbon::parse($goal->period_start);
        $periodEnd = $goal->period_end ? Carbon::parse($goal->period_end) : (clone $periodStart)->endOfMonth();
        
        // Ensure we don't count beyond the asOfDate
        $effectiveEnd = $asOfDate->lt($periodEnd) ? $asOfDate : $periodEnd;
        
        switch ($goal->metric) {
            case 'total_visits':
                return DB::table('patient_visits')
                    ->whereNotNull('start_time')
                    ->whereBetween('start_time', [$periodStart, $effectiveEnd])
                    ->count();
                    
            case 'service_availment':
                // Count visits for the specific service, but exclude those with active discounts
                $query = DB::table('patient_visits')
                    ->whereNotNull('start_time')
                    ->where('service_id', $goal->service_id)
                    ->whereBetween('start_time', [$periodStart, $effectiveEnd]);
                
                // Exclude visits where the service had an active discount at the time of visit
                $query->whereNotExists(function ($subQuery) use ($periodStart, $effectiveEnd) {
                    $subQuery->select(DB::raw(1))
                        ->from('service_discounts')
                        ->whereColumn('service_discounts.service_id', 'patient_visits.service_id')
                        ->where('service_discounts.status', 'launched')
                        ->whereRaw('patient_visits.start_time >= service_discounts.start_date')
                        ->whereRaw('patient_visits.start_time <= service_discounts.end_date')
                        ->whereRaw('service_discounts.activated_at <= DATE_SUB(patient_visits.start_time, INTERVAL 1 DAY)');
                });
                
                return $query->count();
                    
            case 'package_promo_availment':
                // Count visits for the package/promo service itself
                $packageVisits = DB::table('patient_visits')
                    ->whereNotNull('start_time')
                    ->where('service_id', $goal->package_id)
                    ->whereBetween('start_time', [$periodStart, $effectiveEnd])
                    ->count();
                    
                // Also count visits for any services that are part of this package
                $bundleVisits = DB::table('patient_visits')
                    ->join('service_bundle_items', 'patient_visits.service_id', '=', 'service_bundle_items.child_service_id')
                    ->whereNotNull('patient_visits.start_time')
                    ->where('service_bundle_items.parent_service_id', $goal->package_id)
                    ->whereBetween('patient_visits.start_time', [$periodStart, $effectiveEnd])
                    ->count();
                    
                return $packageVisits + $bundleVisits;
                    
            default:
                return 0;
        }
    }
}

