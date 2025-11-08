<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Services\ClinicDateResolverService;
use Carbon\Carbon;

class RefundRequest extends Model
{
    use HasFactory;

    // Status constants
    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_PROCESSED = 'processed';

    protected $fillable = [
        'patient_id',
        'appointment_id',
        'payment_id',
        'original_amount',
        'cancellation_fee',
        'refund_amount',
        'reason',
        'status',
        'requested_at',
        'deadline_at',
        'approved_at',
        'processed_at',
        'admin_notes',
        'processed_by',
        'pickup_notified_at',
        'pickup_reminder_sent_at',
        'deadline_extended_at',
        'deadline_extended_by',
        'deadline_extension_reason',
        'patient_confirmed_at',
    ];

    protected $casts = [
        'original_amount' => 'decimal:2',
        'cancellation_fee' => 'decimal:2',
        'refund_amount' => 'decimal:2',
        'requested_at' => 'datetime',
        'deadline_at' => 'datetime',
        'approved_at' => 'datetime',
        'processed_at' => 'datetime',
        'pickup_notified_at' => 'datetime',
        'pickup_reminder_sent_at' => 'datetime',
        'deadline_extended_at' => 'datetime',
        'patient_confirmed_at' => 'datetime',
    ];

    protected $appends = [
        'minimum_extend_deadline_date',
    ];

    /**
     * Boot method to auto-calculate deadline when creating
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($refundRequest) {
            if (!$refundRequest->deadline_at && $refundRequest->requested_at) {
                $refundRequest->deadline_at = static::calculateBusinessDaysDeadline(
                    $refundRequest->requested_at,
                    7
                );
            }
        });
    }

    // Relationships
    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }

    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }

    public function processedBy()
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function deadlineExtendedBy()
    {
        return $this->belongsTo(User::class, 'deadline_extended_by');
    }

    // Query scopes
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeApproved($query)
    {
        return $query->where('status', self::STATUS_APPROVED);
    }

    public function scopeRejected($query)
    {
        return $query->where('status', self::STATUS_REJECTED);
    }

    public function scopeProcessed($query)
    {
        return $query->where('status', self::STATUS_PROCESSED);
    }

    /**
     * Calculate deadline date by counting business days (excluding clinic closed days)
     * 
     * @param Carbon|string $startDate The starting date
     * @param int $businessDays Number of business days to count (default: 7)
     * @return Carbon The deadline date
     */
    public static function calculateBusinessDaysDeadline($startDate, int $businessDays = 7): Carbon
    {
        $resolver = app(ClinicDateResolverService::class);
        $current = $startDate instanceof Carbon ? $startDate->copy() : Carbon::parse($startDate);
        $counted = 0;
        $maxDaysToCheck = 365; // Safety limit: prevent infinite loop if no clinic schedule exists
        $daysChecked = 0;

        // Start counting from the next day after requested_at
        $current->addDay();

        // Count business days (only days when clinic is open)
        while ($counted < $businessDays && $daysChecked < $maxDaysToCheck) {
            $snapshot = $resolver->resolve($current->toDateString());
            
            if ($snapshot['is_open']) {
                $counted++;
            }
            
            // Move to next day
            $current->addDay();
            $daysChecked++;
        }

        // If we hit the safety limit without finding enough business days,
        // it means clinic schedule is not configured - return a reasonable default
        if ($counted < $businessDays) {
            \Log::warning('RefundRequest deadline calculation: Could not find enough business days. Clinic schedule may not be configured.', [
                'required_days' => $businessDays,
                'found_days' => $counted,
                'days_checked' => $daysChecked,
            ]);
            // Return a default: startDate + 7 calendar days
            return $startDate instanceof Carbon ? $startDate->copy()->addDays(7)->endOfDay() : Carbon::parse($startDate)->addDays(7)->endOfDay();
        }

        // Return the date at end of day (23:59:59)
        return $current->copy()->subDay()->endOfDay();
    }

    /**
     * Check if the refund deadline has passed
     * 
     * @return bool True if deadline has passed
     */
    public function isOverdue(): bool
    {
        if (!$this->deadline_at) {
            return false; // No deadline set, not overdue
        }

        return now()->isAfter($this->deadline_at);
    }

    /**
     * Get remaining calendar days until deadline
     * Returns negative number if overdue
     * Note: This is a simplified calculation for display purposes.
     * The actual deadline is calculated using business days in calculateBusinessDaysDeadline()
     * 
     * @return int Number of calendar days remaining (negative if overdue)
     */
    public function daysUntilDeadline(): int
    {
        if (!$this->deadline_at) {
            return 0; // No deadline set
        }

        $now = now()->startOfDay();
        $deadline = $this->deadline_at->copy()->startOfDay();
        
        return $now->diffInDays($deadline, false); // false = return signed difference
    }

    /**
     * Get the minimum permissible deadline (inclusive) when extending.
     */
    public function minimumExtendDeadline(): Carbon
    {
        $base = $this->requested_at ?? now();
        return static::calculateBusinessDaysDeadline($base, 7);
    }

    public function getMinimumExtendDeadlineDateAttribute(): string
    {
        return $this->minimumExtendDeadline()->toDateString();
    }

    public function markPatientConfirmed(): void
    {
        $this->forceFill([
            'patient_confirmed_at' => now(),
        ])->save();
    }

    public function isPatientConfirmed(): bool
    {
        return $this->patient_confirmed_at !== null;
    }
}
