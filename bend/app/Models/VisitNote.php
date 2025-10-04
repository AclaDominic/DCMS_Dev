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

    // Encrypted attribute accessors and mutators
    protected function dentistNotes(): Attribute
    {
        return Attribute::make(
            get: fn ($value, $attributes) => $attributes['dentist_notes_encrypted'] 
                ? decrypt($attributes['dentist_notes_encrypted']) 
                : null,
            set: fn ($value) => ['dentist_notes_encrypted' => $value ? encrypt($value) : null],
        );
    }

    protected function findings(): Attribute
    {
        return Attribute::make(
            get: fn ($value, $attributes) => $attributes['findings_encrypted'] 
                ? decrypt($attributes['findings_encrypted']) 
                : null,
            set: fn ($value) => ['findings_encrypted' => $value ? encrypt($value) : null],
        );
    }

    protected function treatmentPlan(): Attribute
    {
        return Attribute::make(
            get: fn ($value, $attributes) => $attributes['treatment_plan_encrypted'] 
                ? decrypt($attributes['treatment_plan_encrypted']) 
                : null,
            set: fn ($value) => ['treatment_plan_encrypted' => $value ? encrypt($value) : null],
        );
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
