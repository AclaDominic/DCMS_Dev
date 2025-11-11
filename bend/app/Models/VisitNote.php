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
        'teeth_treated',
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

    public function getFindingsAttribute()
    {
        return $this->findings_encrypted;
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

    // Helper method to get formatted teeth treated
    public function getFormattedTeethTreatedAttribute(): string
    {
        return Service::formatTeethTreated($this->teeth_treated);
    }

    // Helper method to set sanitized teeth treated
    public function setTeethTreatedAttribute($value)
    {
        // Validate teeth format before sanitizing
        $errors = Service::validateTeethFormat($value);
        if (!empty($errors)) {
            // Log validation errors but don't throw exception to avoid breaking the flow
            \Log::warning('Teeth format validation errors: ' . implode(', ', $errors));
        }
        
        $this->attributes['teeth_treated'] = Service::sanitizeTeethTreated($value);
    }

    // Method to calculate total cost for per-teeth services in this visit
    public function calculatePerTeethCost()
    {
        if (!$this->teeth_treated) {
            return 0;
        }

        $teethCount = Service::countTeeth($this->teeth_treated);
        
        // Get the services for this visit that are per-teeth
        $visit = $this->patientVisit;
        if (!$visit) {
            return 0;
        }

        $totalCost = 0;
        
        // Assuming there's a relationship to get services for this visit
        // This would need to be implemented based on your visit structure
        // For now, we'll return the teeth count for calculation
        
        return $teethCount;
    }

    // Method to get formatted teeth treated with count
    public function getTeethTreatedWithCountAttribute(): string
    {
        if (!$this->teeth_treated) {
            return '';
        }

        $formatted = $this->formatted_teeth_treated;
        $count = Service::countTeeth($this->teeth_treated);
        $type = Service::getTeethTypeDescription($this->teeth_treated);
        
        return $formatted . " ({$count} {$type})";
    }

    // Method to get teeth type information
    public function getTeethTypeAttribute(): string
    {
        return Service::getTeethTypeDescription($this->teeth_treated);
    }

    // Method to check if teeth are primary
    public function getIsPrimaryTeethAttribute(): bool
    {
        return Service::isPrimaryTeeth($this->teeth_treated);
    }
}
