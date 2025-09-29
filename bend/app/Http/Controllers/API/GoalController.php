<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\GoalProgressSnapshot;
use App\Models\PerformanceGoal;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class GoalController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'period_type' => ['required', Rule::in(['month', 'promo'])],
            'period_start' => ['required', 'date'], // expect YYYY-MM-01 for month, or specific date for promo
            'period_end' => ['nullable', 'date'], // required for promo type
            'metric' => ['required', Rule::in(['total_visits', 'service_availment', 'package_promo_availment'])],
            'target_value' => ['required', 'integer', 'min:1'],
            'service_id' => ['nullable', 'integer', 'exists:services,id'], // required for service_availment
            'package_id' => ['nullable', 'integer', 'exists:services,id'], // required for package_promo_availment
        ]);

        // Additional validation based on metric type
        if ($validated['metric'] === 'service_availment' && !$validated['service_id']) {
            return response()->json(['message' => 'Service ID is required for service availment metric'], 422);
        }
        if ($validated['metric'] === 'package_promo_availment' && !$validated['package_id']) {
            return response()->json(['message' => 'Package/Promo ID is required for package/promo availment metric'], 422);
        }
        if ($validated['period_type'] === 'promo' && !$validated['period_end']) {
            return response()->json(['message' => 'Period end is required for promo period type'], 422);
        }

        // Handle period start based on type
        if ($validated['period_type'] === 'month') {
            $periodStart = Carbon::parse($validated['period_start'])->startOfMonth();
            $periodEnd = null;
        } else {
            $periodStart = Carbon::parse($validated['period_start']);
            $periodEnd = Carbon::parse($validated['period_end']);
        }

        $goal = PerformanceGoal::create([
            'period_type' => $validated['period_type'],
            'period_start' => $periodStart,
            'period_end' => $periodEnd,
            'metric' => $validated['metric'],
            'target_value' => $validated['target_value'],
            'status' => 'active',
            'created_by' => $request->user()->id,
            'service_id' => $validated['service_id'] ?? null,
            'package_id' => $validated['package_id'] ?? null,
            'promo_id' => null, // No longer used
        ]);

        // If the goal is for the current period, initialize a snapshot that
        // includes visits that have already happened earlier in the period.
        $today = Carbon::today();
        $shouldInitialize = false;
        
        if ($validated['period_type'] === 'month' && $periodStart->isSameMonth($today)) {
            $shouldInitialize = true;
        } elseif ($validated['period_type'] === 'promo' && $periodStart->lte($today) && $periodEnd->gte($today)) {
            $shouldInitialize = true;
        }
        
        if ($shouldInitialize) {
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
        }

        return response()->json($goal, 201);
    }

    public function index(Request $request)
    {
        $period = $request->query('period'); // YYYY-MM
        $query = PerformanceGoal::query()->orderByDesc('period_start');

        if (is_string($period) && preg_match('/^\d{4}-\d{2}$/', $period)) {
            $start = Carbon::createFromFormat('Y-m-d', $period . '-01')->startOfMonth();
            $query->where('period_type', 'month')->whereDate('period_start', $start);
        }

        $goals = $query->with(['snapshots' => function ($q) {
            $q->orderByDesc('as_of_date')->limit(1);
        }])->get();

        $formatted = $goals->map(function (PerformanceGoal $g) {
            $latest = $g->snapshots->first();
            return [
                'id' => $g->id,
                'period_type' => $g->period_type,
                'period_start' => $g->period_start ? $g->period_start->format('Y-m-d') : null,
                'period_end' => $g->period_end ? $g->period_end->format('Y-m-d') : null,
                'metric' => $g->metric,
                'target_value' => (int)$g->target_value,
                'status' => $g->status,
                'latest_actual' => (int)($latest->actual_value ?? 0),
                'service_id' => $g->service_id,
                'package_id' => $g->package_id,
                'promo_id' => $g->promo_id,
            ];
        });

        return response()->json($formatted);
    }

    public function progress($id)
    {
        $goal = PerformanceGoal::findOrFail($id);
        $snapshots = GoalProgressSnapshot::where('goal_id', $goal->id)
            ->orderBy('as_of_date')
            ->get(['as_of_date', 'actual_value']);

        return response()->json([
            'goal' => $goal,
            'snapshots' => $snapshots,
        ]);
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

