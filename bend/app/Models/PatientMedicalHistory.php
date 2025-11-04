<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\User;

class PatientMedicalHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'patient_visit_id',
        // Patient Information
        'full_name',
        'age',
        'sex',
        'address',
        'contact_number',
        'occupation',
        'date_of_birth',
        'email',
        'previous_dentist',
        'last_dental_visit',
        'physician_name',
        'physician_address',
        // Health Questions
        'in_good_health',
        'under_medical_treatment',
        'medical_treatment_details',
        'serious_illness_surgery',
        'illness_surgery_details',
        'hospitalized',
        'hospitalization_details',
        'taking_medications',
        'medications_list',
        'uses_tobacco',
        'uses_alcohol_drugs',
        // Allergies
        'allergic_local_anesthetic',
        'allergic_penicillin',
        'allergic_sulfa',
        'allergic_aspirin',
        'allergic_latex',
        'allergic_others',
        // For Women Only
        'is_pregnant',
        'is_nursing',
        'taking_birth_control',
        // Vital Information
        'blood_type',
        'blood_pressure',
        'bleeding_time',
        // Medical Conditions
        'high_blood_pressure',
        'low_blood_pressure',
        'heart_disease',
        'heart_murmur',
        'chest_pain',
        'stroke',
        'diabetes',
        'hepatitis',
        'tuberculosis',
        'kidney_disease',
        'cancer',
        'asthma',
        'anemia',
        'arthritis',
        'epilepsy',
        'aids_hiv',
        'stomach_troubles',
        'thyroid_problems',
        'hay_fever',
        'head_injuries',
        'rapid_weight_loss',
        'joint_replacement',
        'radiation_therapy',
        'swollen_ankles',
        'other_conditions',
        // Tracking
        'completed_by',
        'completed_at',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'last_dental_visit' => 'date',
        'completed_at' => 'datetime',
        // Health Questions
        'in_good_health' => 'boolean',
        'under_medical_treatment' => 'boolean',
        'serious_illness_surgery' => 'boolean',
        'hospitalized' => 'boolean',
        'taking_medications' => 'boolean',
        'uses_tobacco' => 'boolean',
        'uses_alcohol_drugs' => 'boolean',
        // Allergies
        'allergic_local_anesthetic' => 'boolean',
        'allergic_penicillin' => 'boolean',
        'allergic_sulfa' => 'boolean',
        'allergic_aspirin' => 'boolean',
        'allergic_latex' => 'boolean',
        // For Women Only
        'is_pregnant' => 'boolean',
        'is_nursing' => 'boolean',
        'taking_birth_control' => 'boolean',
        // Medical Conditions
        'high_blood_pressure' => 'boolean',
        'low_blood_pressure' => 'boolean',
        'heart_disease' => 'boolean',
        'heart_murmur' => 'boolean',
        'chest_pain' => 'boolean',
        'stroke' => 'boolean',
        'diabetes' => 'boolean',
        'hepatitis' => 'boolean',
        'tuberculosis' => 'boolean',
        'kidney_disease' => 'boolean',
        'cancer' => 'boolean',
        'asthma' => 'boolean',
        'anemia' => 'boolean',
        'arthritis' => 'boolean',
        'epilepsy' => 'boolean',
        'aids_hiv' => 'boolean',
        'stomach_troubles' => 'boolean',
        'thyroid_problems' => 'boolean',
        'hay_fever' => 'boolean',
        'head_injuries' => 'boolean',
        'rapid_weight_loss' => 'boolean',
        'joint_replacement' => 'boolean',
        'radiation_therapy' => 'boolean',
        'swollen_ankles' => 'boolean',
    ];

    // Relationships
    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function visit()
    {
        return $this->belongsTo(PatientVisit::class, 'patient_visit_id');
    }

    public function completedBy()
    {
        return $this->belongsTo(User::class, 'completed_by');
    }
}
