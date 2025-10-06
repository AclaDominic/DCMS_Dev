<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Appointment extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'service_id',
        'patient_hmo_id',
        'date',
        'time_slot',
        'reference_code',
        'status',
        'payment_method',
        'payment_status',
        'notes',
        'teeth_count',
    ];

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

    // Helper method to calculate total cost for per-teeth services
    public function calculateTotalCost(): float
    {
        if (!$this->service) {
            return 0;
        }

        if (!$this->service->per_teeth_service) {
            return $this->service->price;
        }

        $teethCount = $this->teeth_count ?? 0;
        return $this->service->price * $teethCount;
    }

    // Helper method to calculate estimated time for this appointment
    public function calculateEstimatedTime(): int
    {
        if (!$this->service) {
            return 30; // Default fallback
        }

        return $this->service->calculateEstimatedMinutes($this->teeth_count);
    }

    // Helper method to get formatted teeth count display
    public function getFormattedTeethCountAttribute(): string
    {
        if (!$this->teeth_count || $this->teeth_count <= 0) {
            return '';
        }

        return $this->teeth_count . ' tooth' . ($this->teeth_count > 1 ? 's' : '');
    }
}
