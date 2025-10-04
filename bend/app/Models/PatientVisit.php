<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\Log;

class PatientVisit extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'service_id',
        'visit_date',
        'start_time',
        'end_time',
        'status',
        'visit_code',
        'consultation_started_at',
    ];

    protected $casts = [
        'visit_date' => 'date',
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'consultation_started_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($visit) {
            Log::info('🗑️ VISIT: About to delete visit ID: ' . $visit->id . ', Status: ' . $visit->status . ', Patient ID: ' . $visit->patient_id);
        });

        static::deleted(function ($visit) {
            Log::info('🗑️ VISIT: Deleted visit ID: ' . $visit->id . ', Status: ' . $visit->status . ', Patient ID: ' . $visit->patient_id);
        });
    }

    // Relationships

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function payments()
    {
        return $this->hasMany(\App\Models\Payment::class);
    }

    public function latestPayment()
    {
        return $this->hasOne(\App\Models\Payment::class)->latestOfMany();
    }

    public function visitNotes()
    {
        return $this->hasOne(VisitNote::class);
    }

    // Helper method to get encrypted notes
    public function getEncryptedNotes()
    {
        return $this->visitNotes;
    }

    /**
     * Generate a unique visit code
     * Format: 6-character uppercase alphanumeric code
     */
    public static function generateVisitCode()
    {
        $maxAttempts = 100;
        $attempt = 0;
        $characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        
        do {
            // Generate 6-character code using random selection
            $code = '';
            for ($i = 0; $i < 6; $i++) {
                $code .= $characters[random_int(0, strlen($characters) - 1)];
            }
            
            // Check if code already exists
            $exists = self::where('visit_code', $code)->exists();
            $attempt++;
            
            if ($attempt >= $maxAttempts) {
                throw new \Exception('Unable to generate unique visit code after ' . $maxAttempts . ' attempts');
            }
        } while ($exists);

        return $code;
    }

    /**
     * Get patient's recent visit history (last 5 completed visits)
     */
    public function getPatientHistory()
    {
        return self::where('patient_id', $this->patient_id)
            ->where('id', '!=', $this->id)
            ->where('status', 'completed')
            ->with(['service', 'visitNotes'])
            ->orderBy('visit_date', 'desc')
            ->take(5)
            ->get()
            ->map(function ($visit) {
                return [
                    'id' => $visit->id,
                    'visit_date' => $visit->visit_date,
                    'service_name' => $visit->service?->name,
                    'has_notes' => $visit->visitNotes ? true : false,
                    'notes_created_at' => $visit->visitNotes?->created_at,
                ];
            });
    }
}
