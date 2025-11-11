<?php

namespace App\Http\Controllers\API;

use Carbon\Carbon;
use App\Models\Service;
use App\Models\Appointment;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Services\ClinicDateResolverService;
use App\Services\PreferredDentistService;
use Illuminate\Support\Facades\Auth;

class AppointmentSlotController extends Controller
{
    /**
     * Returns all valid starting time slots for a given date and service.
     * It considers the service duration, the clinic's open hours for that day,
     * and the current usage of each 30-minute slot based on existing appointments.
     */
    public function get(Request $request, ClinicDateResolverService $resolver)
    {
        $data = $request->validate([
            'date' => 'required|date_format:Y-m-d',
            'service_id' => 'nullable|integer|exists:services,id',
        ]);

        // Resolve patient context (supports staff-provided patient_id)
        $effectivePatientId = $request->filled('patient_id')
            ? (int) $request->query('patient_id')
            : optional(\App\Models\Patient::byUser(Auth::id()))?->id;

        $patient = $effectivePatientId ? \App\Models\Patient::find($effectivePatientId) : null;

        $date = Carbon::createFromFormat('Y-m-d', $data['date'])->startOfDay();
        $snap = $resolver->resolve($date);
        if (!$snap['is_open']) {
            // keep the shape the frontend expects
            return response()->json(['slots' => []]);
        }

        // Build 30-min grid from open/close (strings like "08:00" .. "17:00")
        $blocks = ClinicDateResolverService::buildBlocks($snap['open_time'], $snap['close_time']);
        $usage  = Appointment::slotUsageForDate($date->toDateString(), $blocks);

        $cap = (int) $snap['effective_capacity'];

        // Determine how many blocks the requested service needs (default 1 if none)
        $requiredBlocks = 1;
        if (!empty($data['service_id'])) {
            $service = Service::findOrFail($data['service_id']);
            $requiredBlocks = max(1, (int) ceil(($service->estimated_minutes ?? 30) / 30));
        }

        $patientBlockedSlots = [];
        $preferredDentist = null;
        $preferredDentistId = null;
        if ($patient) {
            $patientBlockedSlots = Appointment::getBlockedTimeSlotsForPatient($patient->id, $data['date']);

            /** @var PreferredDentistService $prefService */
            $prefService = app(PreferredDentistService::class);
            $preferredDentist = $prefService->resolveForPatient($patient->id, $date);
            $preferredDentistId = $preferredDentist?->id;
        }

        $requestedHonorPreferred = $request->has('honor_preferred_dentist')
            ? $request->boolean('honor_preferred_dentist')
            : true;

        $preferredDentistActive = $preferredDentistId
            ? in_array($preferredDentistId, $snap['active_dentist_ids'] ?? [], true)
            : false;

        $effectiveHonorPreferred = $requestedHonorPreferred && $preferredDentistId && $preferredDentistActive;

        $dentistUsage = Appointment::dentistSlotUsageForDate($date->toDateString());

        // Return every start time whose covered blocks stay strictly below cap
        $valid = [];
        foreach ($blocks as $start) {
            $startCarbon = Carbon::createFromFormat('H:i', $start);
            $globalCursor = $startCarbon->copy();
            $endCarbon = $startCarbon->copy();
            $ok = true;

            // Check capacity constraints (global)
            for ($i = 0; $i < $requiredBlocks; $i++) {
                $k = $globalCursor->format('H:i');
                if (!array_key_exists($k, $usage) || $usage[$k] >= $cap) {
                    $ok = false;
                    break;
                }
                $globalCursor->addMinutes(30);
            }

            if (!$ok) {
                continue;
            }

            $endCarbon = $globalCursor;

            // Enforce dentist-specific availability when honoring preference
            if ($effectiveHonorPreferred) {
                $dentistCursor = $startCarbon->copy();
                for ($i = 0; $i < $requiredBlocks; $i++) {
                    $slotKey = $dentistCursor->format('H:i');
                    if (($dentistUsage[$preferredDentistId][$slotKey] ?? 0) >= 1) {
                        $ok = false;
                        break;
                    }
                    $dentistCursor->addMinutes(30);
                }
            }

            if (!$ok) {
                continue;
            }

            // Check for patient-specific overlaps if patient exists
            if ($patient && !empty($patientBlockedSlots)) {
                $proposedTimeSlot = $start . '-' . $endCarbon->format('H:i');

                if (Appointment::hasOverlappingAppointment($patient->id, $data['date'], $proposedTimeSlot)) {
                    $ok = false;
                }
            }

            if ($ok) {
                $valid[] = $start; // "HH:MM"
            }
        }

        return response()->json([
            'slots' => $valid,
            'snapshot' => [
                'effective_capacity' => $snap['effective_capacity'],
                'calendar_max_per_block' => $snap['calendar_max_per_block'],
                'capacity_override' => $snap['capacity_override'],
                'dentist_count' => $snap['dentist_count'],
                'dentists' => $snap['dentists'],
                'active_dentist_ids' => $snap['active_dentist_ids'],
            ],
            'usage' => [
                'global' => $usage,
                'per_dentist' => $dentistUsage,
            ],
            'metadata' => [
                'preferred_dentist_id' => $preferredDentistId,
                'preferred_dentist_active' => $preferredDentistActive,
                'requested_honor_preferred_dentist' => $requestedHonorPreferred,
                'effective_honor_preferred_dentist' => $effectiveHonorPreferred,
                'preferred_dentist' => $preferredDentist ? [
                    'id' => $preferredDentist->id,
                    'code' => $preferredDentist->dentist_code,
                    'name' => $preferredDentist->dentist_name,
                ] : null,
                'patient_blocked_slots' => $patientBlockedSlots,
            ],
        ]);
    }

}
