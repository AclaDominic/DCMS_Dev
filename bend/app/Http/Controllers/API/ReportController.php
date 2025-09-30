<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function visitsMonthly(Request $request)
    {
        $month = $request->query('month'); // expected format YYYY-MM

        if (!is_string($month) || !preg_match('/^\d{4}-\d{2}$/', $month)) {
            $start = now()->startOfMonth();
        } else {
            try {
                $start = Carbon::createFromFormat('Y-m-d', $month . '-01')->startOfMonth();
            } catch (\Exception $e) {
                $start = now()->startOfMonth();
            }
        }

        $end = (clone $start)->endOfMonth();
        $daysInMonth = $start->daysInMonth;

        // Base scope: visits that started within the month
        $base = DB::table('patient_visits as v')
            ->whereNotNull('v.start_time')
            ->whereBetween('v.start_time', [$start, $end]);

        // Totals
        $totalVisits = (clone $base)->count();
        
        // Count inquiries (visits with status 'inquiry')
        $totalInquiries = (clone $base)->where('v.status', 'inquiry')->count();

        // By day
        $byDayRows = (clone $base)
            ->selectRaw('DATE(v.start_time) as day, COUNT(*) as count')
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        // By hour (0-23)
        $byHourRows = (clone $base)
            ->selectRaw('HOUR(v.start_time) as hour, COUNT(*) as count, (COUNT(*) / ?) as avg_per_day', [$daysInMonth])
            ->groupBy('hour')
            ->orderBy('hour')
            ->get();

        // By visit type (infer appointment vs walk-in using correlated subquery similar to controller logic)
        $byVisitTypeRows = (clone $base)
            ->selectRaw(
                "CASE WHEN EXISTS (\n" .
                "  SELECT 1 FROM appointments a\n" .
                "  WHERE a.patient_id = v.patient_id\n" .
                "    AND a.service_id = v.service_id\n" .
                "    AND a.date = v.visit_date\n" .
                "    AND a.status IN ('approved','completed')\n" .
                ") THEN 'appointment' ELSE 'walkin' END as visit_type, COUNT(*) as count"
            )
            ->groupBy('visit_type')
            ->orderBy('visit_type')
            ->get();

        // By service
        $byServiceRows = (clone $base)
            ->leftJoin('services as s', 's.id', '=', 'v.service_id')
            ->selectRaw("v.service_id, COALESCE(s.name, '(Unspecified)') as service_name, COUNT(*) as count")
            ->groupBy('v.service_id', 's.name')
            ->orderByDesc('count')
            ->get();

        return response()->json([
            'month' => $start->format('Y-m'),
            'totals' => [
                'visits' => $totalVisits,
                'inquiries' => $totalInquiries,
            ],
            'by_day' => $byDayRows,
            'by_hour' => $byHourRows->map(function ($r) {
                return [
                    'hour' => $r->hour,
                    'count' => $r->count,
                ];
            }),
            'by_hour_avg_per_day' => $byHourRows->map(function ($r) {
                return [
                    'hour' => $r->hour,
                    'avg_per_day' => round((float)$r->avg_per_day, 2),
                ];
            }),
            'by_visit_type' => $byVisitTypeRows,
            'by_service' => $byServiceRows,
        ]);
    }

    public function analyticsSummary(Request $request)
    {
        // Accept either 'month' or 'period' (YYYY-MM). Default: current month
        $month = $request->query('month') ?? $request->query('period');
        if (!is_string($month) || !preg_match('/^\d{4}-\d{2}$/', $month)) {
            $start = now()->startOfMonth();
        } else {
            try {
                $start = Carbon::createFromFormat('Y-m-d', $month . '-01')->startOfMonth();
            } catch (\Exception $e) {
                $start = now()->startOfMonth();
            }
        }

        $end = (clone $start)->endOfMonth();
        $prevStart = (clone $start)->subMonth()->startOfMonth();
        $prevEnd = (clone $start)->subMonth()->endOfMonth();

        $safePct = function (float $curr, float $prev): float {
            if ($prev == 0.0) {
                return $curr > 0 ? 100.0 : 0.0;
            }
            return round((($curr - $prev) / $prev) * 100.0, 2);
        };

        // Total visits (started within month)
        $visitsCurr = DB::table('patient_visits as v')
            ->whereNotNull('v.start_time')
            ->whereBetween('v.start_time', [$start, $end])
            ->count();
        $visitsPrev = DB::table('patient_visits as v')
            ->whereNotNull('v.start_time')
            ->whereBetween('v.start_time', [$prevStart, $prevEnd])
            ->count();

        // Approved appointments (by appointment date)
        $approvedCurr = DB::table('appointments')
            ->where('status', 'approved')
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->count();
        $approvedPrev = DB::table('appointments')
            ->where('status', 'approved')
            ->whereBetween('date', [$prevStart->toDateString(), $prevEnd->toDateString()])
            ->count();

        // No-shows (by appointment date). If schema doesn't include no_show, this will be zero
        $noShowCurr = DB::table('appointments')
            ->where('status', 'no_show')
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->count();
        $noShowPrev = DB::table('appointments')
            ->where('status', 'no_show')
            ->whereBetween('date', [$prevStart->toDateString(), $prevEnd->toDateString()])
            ->count();

        // Average visit duration (minutes) for completed/finished visits with end_time
        $avgDurCurr = (float) (DB::table('patient_visits')
            ->whereNotNull('start_time')
            ->whereNotNull('end_time')
            ->whereBetween('start_time', [$start, $end])
            ->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, start_time, end_time)) as avg_min')
            ->value('avg_min') ?? 0);
        $avgDurPrev = (float) (DB::table('patient_visits')
            ->whereNotNull('start_time')
            ->whereNotNull('end_time')
            ->whereBetween('start_time', [$prevStart, $prevEnd])
            ->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, start_time, end_time)) as avg_min')
            ->value('avg_min') ?? 0);

        // Top services (by visits)
        $topServicesCurr = DB::table('patient_visits as v')
            ->leftJoin('services as s', 's.id', '=', 'v.service_id')
            ->whereNotNull('v.start_time')
            ->whereBetween('v.start_time', [$start, $end])
            ->selectRaw('v.service_id, COALESCE(s.name, "(Unspecified)") as service_name, COUNT(*) as count')
            ->groupBy('v.service_id', 's.name')
            ->orderByDesc('count')
            ->limit(5)
            ->get();
        $serviceIds = $topServicesCurr->pluck('service_id')->filter()->all();
        $prevCountsByService = collect();
        if (!empty($serviceIds)) {
            $prevCountsByService = DB::table('patient_visits as v')
                ->whereNotNull('v.start_time')
                ->whereBetween('v.start_time', [$prevStart, $prevEnd])
                ->whereIn('v.service_id', $serviceIds)
                ->selectRaw('v.service_id, COUNT(*) as count')
                ->groupBy('v.service_id')
                ->pluck('count', 'service_id');
        }
        $topServices = $topServicesCurr->map(function ($row) use ($prevCountsByService, $safePct) {
            $prev = (float) ($prevCountsByService[$row->service_id] ?? 0);
            $curr = (float) $row->count;
            return [
                'service_id' => $row->service_id,
                'service_name' => $row->service_name,
                'count' => (int) $curr,
                'prev_count' => (int) $prev,
                'pct_change' => $safePct($curr, $prev),
            ];
        });

        // Payment method share (cash, hmo, maya) from paid payments in the month
        $payCurr = DB::table('payments')
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$start, $end])
            ->whereIn('method', ['cash', 'hmo', 'maya'])
            ->selectRaw('method, COUNT(*) as count')
            ->groupBy('method')
            ->pluck('count', 'method');
        $payPrev = DB::table('payments')
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$prevStart, $prevEnd])
            ->whereIn('method', ['cash', 'hmo', 'maya'])
            ->selectRaw('method, COUNT(*) as count')
            ->groupBy('method')
            ->pluck('count', 'method');

        $cashCurr = (int) ($payCurr['cash'] ?? 0);
        $hmoCurr = (int) ($payCurr['hmo'] ?? 0);
        $mayaCurr = (int) ($payCurr['maya'] ?? 0);
        $cashPrev = (int) ($payPrev['cash'] ?? 0);
        $hmoPrev = (int) ($payPrev['hmo'] ?? 0);
        $mayaPrev = (int) ($payPrev['maya'] ?? 0);
        $denomCurr = max(1, $cashCurr + $hmoCurr + $mayaCurr);
        $denomPrev = max(1, $cashPrev + $hmoPrev + $mayaPrev);
        $cashShareCurr = round(($cashCurr / $denomCurr) * 100.0, 2);
        $hmoShareCurr = round(($hmoCurr / $denomCurr) * 100.0, 2);
        $mayaShareCurr = round(($mayaCurr / $denomCurr) * 100.0, 2);
        $cashSharePrev = round(($cashPrev / $denomPrev) * 100.0, 2);
        $hmoSharePrev = round(($hmoPrev / $denomPrev) * 100.0, 2);
        $mayaSharePrev = round(($mayaPrev / $denomPrev) * 100.0, 2);

        // Revenue by service (from paid payments linked to visits)
        $revenueByServiceCurr = DB::table('payments as p')
            ->join('patient_visits as v', 'p.patient_visit_id', '=', 'v.id')
            ->leftJoin('services as s', 's.id', '=', 'v.service_id')
            ->where('p.status', 'paid')
            ->whereBetween('p.paid_at', [$start, $end])
            ->selectRaw('v.service_id, COALESCE(s.name, "(Unspecified)") as service_name, SUM(p.amount_paid) as revenue')
            ->groupBy('v.service_id', 's.name')
            ->orderByDesc('revenue')
            ->limit(5)
            ->get();

        $revenueByServicePrev = DB::table('payments as p')
            ->join('patient_visits as v', 'p.patient_visit_id', '=', 'v.id')
            ->leftJoin('services as s', 's.id', '=', 'v.service_id')
            ->where('p.status', 'paid')
            ->whereBetween('p.paid_at', [$prevStart, $prevEnd])
            ->selectRaw('v.service_id, SUM(p.amount_paid) as revenue')
            ->groupBy('v.service_id')
            ->pluck('revenue', 'service_id');

        $topRevenueServices = $revenueByServiceCurr->map(function ($row) use ($revenueByServicePrev, $safePct) {
            $prev = (float) ($revenueByServicePrev[$row->service_id] ?? 0);
            $curr = (float) $row->revenue;
            return [
                'service_id' => $row->service_id,
                'service_name' => $row->service_name,
                'revenue' => round($curr, 2),
                'prev_revenue' => round($prev, 2),
                'pct_change' => $safePct($curr, $prev),
            ];
        });

        // Total revenue for the month
        $totalRevenueCurr = DB::table('payments')
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$start, $end])
            ->sum('amount_paid');

        $totalRevenuePrev = DB::table('payments')
            ->where('status', 'paid')
            ->whereBetween('paid_at', [$prevStart, $prevEnd])
            ->sum('amount_paid');

        // Patient follow-up rate (patients who returned within 3-4 months)
        // Look at patients who had their first visit 3-4 months ago and see if they returned
        $followUpStart = (clone $start)->subMonths(4)->startOfMonth();
        $followUpEnd = (clone $start)->subMonths(3)->endOfMonth();
        
        // Get patients who had their first visit 3-4 months ago
        $firstTimePatients = DB::table('patient_visits as v')
            ->whereNotNull('v.start_time')
            ->whereBetween('v.start_time', [$followUpStart, $followUpEnd])
            ->selectRaw('v.patient_id, MIN(v.start_time) as first_visit')
            ->groupBy('v.patient_id')
            ->get();
        
        $totalFirstTimePatients = $firstTimePatients->count();
        $returnedPatients = 0;
        
        if ($totalFirstTimePatients > 0) {
            // Check if these patients returned within 3-4 months after their first visit
            foreach ($firstTimePatients as $patient) {
                $firstVisit = Carbon::parse($patient->first_visit);
                $followUpWindowStart = $firstVisit->copy()->addMonths(3);
                $followUpWindowEnd = $firstVisit->copy()->addMonths(4);
                
                $hasReturned = DB::table('patient_visits')
                    ->where('patient_id', $patient->patient_id)
                    ->whereNotNull('start_time')
                    ->whereBetween('start_time', [$followUpWindowStart, $followUpWindowEnd])
                    ->exists();
                
                if ($hasReturned) {
                    $returnedPatients++;
                }
            }
        }
        
        $followUpRateCurr = $totalFirstTimePatients > 0 
            ? round(($returnedPatients / $totalFirstTimePatients) * 100.0, 2) 
            : 0;
        
        // Calculate previous month's follow-up rate for comparison
        $prevFollowUpStart = (clone $prevStart)->subMonths(4)->startOfMonth();
        $prevFollowUpEnd = (clone $prevStart)->subMonths(3)->endOfMonth();
        
        $prevFirstTimePatients = DB::table('patient_visits as v')
            ->whereNotNull('v.start_time')
            ->whereBetween('v.start_time', [$prevFollowUpStart, $prevFollowUpEnd])
            ->selectRaw('v.patient_id, MIN(v.start_time) as first_visit')
            ->groupBy('v.patient_id')
            ->get();
        
        $prevTotalFirstTimePatients = $prevFirstTimePatients->count();
        $prevReturnedPatients = 0;
        
        if ($prevTotalFirstTimePatients > 0) {
            foreach ($prevFirstTimePatients as $patient) {
                $firstVisit = Carbon::parse($patient->first_visit);
                $followUpWindowStart = $firstVisit->copy()->addMonths(3);
                $followUpWindowEnd = $firstVisit->copy()->addMonths(4);
                
                $hasReturned = DB::table('patient_visits')
                    ->where('patient_id', $patient->patient_id)
                    ->whereNotNull('start_time')
                    ->whereBetween('start_time', [$followUpWindowStart, $followUpWindowEnd])
                    ->exists();
                
                if ($hasReturned) {
                    $prevReturnedPatients++;
                }
            }
        }
        
        $followUpRatePrev = $prevTotalFirstTimePatients > 0 
            ? round(($prevReturnedPatients / $prevTotalFirstTimePatients) * 100.0, 2) 
            : 0;

        // Simple daily series for sparkline on frontend
        $visitsByDay = DB::table('patient_visits as v')
            ->whereNotNull('v.start_time')
            ->whereBetween('v.start_time', [$start, $end])
            ->selectRaw('DATE(v.start_time) as day, COUNT(*) as count')
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        // Alerts
        $alerts = [];
        if ($approvedCurr > 0) {
            $noShowRate = round(($noShowCurr / max(1, $approvedCurr)) * 100.0, 2);
            if ($noShowRate >= 20.0) {
                $alerts[] = [
                    'type' => 'warning',
                    'message' => "High no-show rate: {$noShowRate}% of approved appointments. Consider implementing reminder systems or appointment confirmation calls.",
                ];
            }
        }
        if ($avgDurCurr >= 100) {
            $alerts[] = [
                'type' => 'info',
                'message' => 'Average visit duration is unusually long (>= 100 minutes). This may indicate complex procedures or potential scheduling inefficiencies.',
            ];
        } elseif ($avgDurCurr > 0 && $avgDurCurr <= 25) {
            $alerts[] = [
                'type' => 'info',
                'message' => 'Average visit duration is quite short (<= 25 minutes). Consider if consultations are thorough enough or if quick procedures are being scheduled efficiently.',
            ];
        }
        if (!empty($topServices[0])) {
            $top = $topServices[0];
            if ($visitsCurr > 0 && ($top['count'] / $visitsCurr) >= 0.5) {
                $alerts[] = [
                    'type' => 'info',
                    'message' => 'One service accounts for over 50% of visits. Consider balancing workload across different services or promoting underutilized services.',
                ];
            }
        }
        
        // Add follow-up rate alerts
        if ($totalFirstTimePatients > 0) {
            if ($followUpRateCurr < 20) {
                $alerts[] = [
                    'type' => 'warning',
                    'message' => "Low patient follow-up rate: {$followUpRateCurr}% ({$returnedPatients}/{$totalFirstTimePatients} patients). Consider implementing follow-up calls, appointment reminders, or patient satisfaction surveys.",
                ];
            } elseif ($followUpRateCurr >= 50) {
                $alerts[] = [
                    'type' => 'info',
                    'message' => "Excellent patient follow-up rate: {$followUpRateCurr}% ({$returnedPatients}/{$totalFirstTimePatients} patients). This indicates strong patient satisfaction and retention.",
                ];
            } elseif ($followUpRateCurr >= 30) {
                $alerts[] = [
                    'type' => 'info',
                    'message' => "Good patient follow-up rate: {$followUpRateCurr}% ({$returnedPatients}/{$totalFirstTimePatients} patients). Consider strategies to improve further.",
                ];
            }
        }
        
        // Add payment method insights as alerts
        $shareSpike = $hmoShareCurr - $hmoSharePrev;
        if ($shareSpike >= 15.0) {
            $alerts[] = [
                'type' => 'info',
                'message' => 'HMO share increased sharply vs last month (+'.round($shareSpike, 1).' pp). Monitor insurer approval times and patient satisfaction with HMO processes.',
            ];
        }
        
        // Add visit volume alerts
        if ($visitsCurr > 0) {
            $visitChange = $safePct((float) $visitsCurr, (float) $visitsPrev);
            if ($visitChange <= -20) {
                $alerts[] = [
                    'type' => 'warning',
                    'message' => "Significant drop in visits: {$visitChange}% vs last month. Review marketing efforts, seasonal factors, or external competition.",
                ];
            } elseif ($visitChange >= 30) {
                $alerts[] = [
                    'type' => 'info',
                    'message' => "Strong growth in visits: +{$visitChange}% vs last month. Consider capacity planning and staff scheduling adjustments.",
                ];
            }
        }

        return response()->json([
            'month' => $start->format('Y-m'),
            'previous_month' => $prevStart->format('Y-m'),
            'kpis' => [
                'total_visits' => [
                    'value' => (int) $visitsCurr,
                    'prev' => (int) $visitsPrev,
                    'pct_change' => $safePct((float) $visitsCurr, (float) $visitsPrev),
                ],
                'approved_appointments' => [
                    'value' => (int) $approvedCurr,
                    'prev' => (int) $approvedPrev,
                    'pct_change' => $safePct((float) $approvedCurr, (float) $approvedPrev),
                ],
                'no_shows' => [
                    'value' => (int) $noShowCurr,
                    'prev' => (int) $noShowPrev,
                    'pct_change' => $safePct((float) $noShowCurr, (float) $noShowPrev),
                ],
                'avg_visit_duration_min' => [
                    'value' => round($avgDurCurr, 2),
                    'prev' => round($avgDurPrev, 2),
                    'pct_change' => $safePct($avgDurCurr, $avgDurPrev),
                ],
                'patient_follow_up_rate' => [
                    'value' => $followUpRateCurr,
                    'prev' => $followUpRatePrev,
                    'pct_change' => $safePct($followUpRateCurr, $followUpRatePrev),
                    'total_first_time_patients' => $totalFirstTimePatients,
                    'returned_patients' => $returnedPatients,
                ],
                'total_revenue' => [
                    'value' => round($totalRevenueCurr, 2),
                    'prev' => round($totalRevenuePrev, 2),
                    'pct_change' => $safePct($totalRevenueCurr, $totalRevenuePrev),
                ],
                'payment_method_share' => [
                    'cash' => [
                        'count' => $cashCurr,
                        'share_pct' => $cashShareCurr,
                        'prev_share_pct' => $cashSharePrev,
                        'pct_point_change' => round($cashShareCurr - $cashSharePrev, 2),
                    ],
                    'hmo' => [
                        'count' => $hmoCurr,
                        'share_pct' => $hmoShareCurr,
                        'prev_share_pct' => $hmoSharePrev,
                        'pct_point_change' => round($hmoShareCurr - $hmoSharePrev, 2),
                    ],
                    'maya' => [
                        'count' => $mayaCurr,
                        'share_pct' => $mayaShareCurr,
                        'prev_share_pct' => $mayaSharePrev,
                        'pct_point_change' => round($mayaShareCurr - $mayaSharePrev, 2),
                    ],
                ],
            ],
            'top_services' => $topServices,
            'top_revenue_services' => $topRevenueServices,
            'series' => [
                'visits_by_day' => $visitsByDay,
            ],
            'alerts' => $alerts,
        ]);
    }
}