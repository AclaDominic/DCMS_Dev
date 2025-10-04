<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;

class VisitNote extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_visit_id',
        'dentist_notes_encrypted',
        'findings_encrypted',
        'treatment_plan_encrypted',
        'created_by',
        'updated_by',
        'last_accessed_at',
        'last_accessed_by',
    ];

    protected $casts = [
        'last_accessed_at' => 'datetime',
        'dentist_notes_encrypted' => 'encrypted',
        'findings_encrypted' => 'encrypted',
        'treatment_plan_encrypted' => 'encrypted',
    ];

    // Relationships
    public function patientVisit()
    {
        return $this->belongsTo(PatientVisit::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function lastAccessedBy()
    {
        return $this->belongsTo(User::class, 'last_accessed_by');
    }

    // Add snake_case accessors for API compatibility
    public function getDentistNotesAttribute()
    {
        return $this->dentist_notes_encrypted;
    }

    public function getTreatmentPlanAttribute()
    {
        return $this->treatment_plan_encrypted;
    }

    // Helper method to track access
    public function recordAccess($userId)
    {
        $this->update([
            'last_accessed_at' => now(),
            'last_accessed_by' => $userId,
        ]);
    }
}
