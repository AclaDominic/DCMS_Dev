<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\DentistSchedule;
use App\Models\PatientVisit;
use App\Models\VisitNote;
use Carbon\Carbon;

class PreferredDentistService
{
    /**
     * Resolve the most recent dentist schedule associated with a patient.
     *
     * The lookup prioritises appointments that already have an assigned dentist,
     * falling back to dentist-authored visit notes when no appointment assignment exists.
     *
     * @param  int  $patientId
     * @param  Carbon|null  $referenceDate  Only consider activity on or before this date.
     */
    public function resolveForPatient(int $patientId, ?Carbon $referenceDate = null): ?DentistSchedule
    {
        $dateCutoff = $referenceDate ? $referenceDate->copy()->startOfDay() : null;

        $visit = PatientVisit::query()
            ->with('assignedDentist')
            ->where('patient_id', $patientId)
            ->whereNotNull('dentist_schedule_id')
            ->when($dateCutoff, function ($query) use ($dateCutoff) {
                $query->whereDate('visit_date', '<=', $dateCutoff->toDateString());
            })
            ->orderByDesc('visit_code_sent_at')
            ->orderByDesc('visit_date')
            ->orderByDesc('created_at')
            ->first();

        if ($visit && $visit->assignedDentist) {
            return $visit->assignedDentist;
        }

        $appointment = Appointment::query()
            ->where('patient_id', $patientId)
            ->whereNotNull('dentist_schedule_id')
            ->whereIn('status', ['pending', 'approved', 'completed'])
            ->when($dateCutoff, function ($query) use ($dateCutoff) {
                $query->whereDate('date', '<=', $dateCutoff->toDateString());
            })
            ->orderByDesc('date')
            ->orderByDesc('created_at')
            ->first();

        if ($appointment && $appointment->dentistSchedule) {
            return $appointment->dentistSchedule;
        }

        $visitNote = VisitNote::query()
            ->select('dentist_schedules.*')
            ->join('patient_visits', 'visit_notes.patient_visit_id', '=', 'patient_visits.id')
            ->join('users', 'visit_notes.created_by', '=', 'users.id')
            ->join('dentist_schedules', 'users.email', '=', 'dentist_schedules.email')
            ->whereNotNull('visit_notes.created_by')
            ->where('patient_visits.patient_id', $patientId)
            ->where('users.role', 'dentist')
            ->when($dateCutoff, function ($query) use ($dateCutoff) {
                $query->whereDate('patient_visits.visit_date', '<=', $dateCutoff->toDateString());
            })
            ->orderByDesc('patient_visits.visit_date')
            ->orderByDesc('visit_notes.updated_at')
            ->first();

        return $visitNote instanceof DentistSchedule ? $visitNote : null;
    }
}


