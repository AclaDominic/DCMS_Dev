<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class PatientManager extends Model
{
    use HasFactory;

    protected $table = 'patient_manager';

    protected $fillable = [
        'patient_id',
        'no_show_count',
        'last_no_show_at',
        'warning_count',
        'last_warning_sent_at',
        'last_warning_message',
        'block_status',
        'blocked_at',
        'block_reason',
        'block_type',
        'blocked_ip',
        'blocked_by',
        'admin_notes',
        'last_updated_at',
        'last_updated_by',
    ];

    protected $casts = [
        'last_no_show_at' => 'datetime',
        'last_warning_sent_at' => 'datetime',
        'blocked_at' => 'datetime',
        'last_updated_at' => 'datetime',
    ];

    // Relationships
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function blockedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'blocked_by');
    }

    public function lastUpdatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'last_updated_by');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('block_status', 'active');
    }

    public function scopeBlocked($query)
    {
        return $query->where('block_status', 'blocked');
    }

    public function scopeWarning($query)
    {
        return $query->where('block_status', 'warning');
    }

    public function scopeWithNoShows($query, $minCount = 1)
    {
        return $query->where('no_show_count', '>=', $minCount);
    }

    // Helper methods
    public function incrementNoShow(): void
    {
        $this->increment('no_show_count');
        $this->update([
            'last_no_show_at' => now(),
            'last_updated_at' => now(),
            'last_updated_by' => Auth::check() ? Auth::id() : 1,
        ]);
    }

    public function sendWarning(string $message, int $adminId): void
    {
        $this->increment('warning_count');
        $this->update([
            'last_warning_sent_at' => now(),
            'last_warning_message' => $message,
            'last_updated_at' => now(),
            'last_updated_by' => $adminId,
        ]);

        // Update block status to warning if not already blocked
        if ($this->block_status === 'active') {
            $this->update(['block_status' => 'warning']);
        }
    }

    public function blockPatient(string $reason, string $blockType = 'account', ?string $ip = null, ?int $adminId = null): void
    {
        $this->update([
            'block_status' => 'blocked',
            'blocked_at' => now(),
            'block_reason' => $reason,
            'block_type' => $blockType,
            'blocked_ip' => $ip,
            'blocked_by' => $adminId,
            'last_updated_at' => now(),
            'last_updated_by' => $adminId,
        ]);
    }

    public function unblockPatient(int $adminId): void
    {
        $this->update([
            'block_status' => 'active',
            'blocked_at' => null,
            'block_reason' => null,
            'block_type' => null,
            'blocked_ip' => null,
            'blocked_by' => null,
            'last_updated_at' => now(),
            'last_updated_by' => $adminId,
        ]);
    }

    public function addAdminNote(string $note, int $adminId): void
    {
        $existingNotes = $this->admin_notes ? $this->admin_notes . "\n\n" : '';
        $timestamp = now()->format('Y-m-d H:i:s');
        $admin = User::find($adminId);
        $adminName = $admin ? $admin->name : 'System';
        
        $this->update([
            'admin_notes' => $existingNotes . "[{$timestamp}] {$adminName}: {$note}",
            'last_updated_at' => now(),
            'last_updated_by' => $adminId,
        ]);
    }

    public function isBlocked(): bool
    {
        return $this->block_status === 'blocked';
    }

    public function isUnderWarning(): bool
    {
        return $this->block_status === 'warning';
    }

    public function getStatusColor(): string
    {
        return match ($this->block_status) {
            'active' => 'success',
            'warning' => 'warning',
            'blocked' => 'danger',
            default => 'secondary',
        };
    }

    public function getStatusText(): string
    {
        return match ($this->block_status) {
            'active' => 'Active',
            'warning' => 'Under Warning',
            'blocked' => 'Blocked',
            default => 'Unknown',
        };
    }

    public function shouldReceiveWarning(int $warningThreshold = 3): bool
    {
        return $this->no_show_count >= $warningThreshold && 
               $this->block_status !== 'blocked' &&
               $this->block_status !== 'warning';
    }

    public function shouldBeBlocked(int $blockThreshold = 5): bool
    {
        return $this->no_show_count >= $blockThreshold;
    }

    // Static methods
    public static function getOrCreateForPatient(int $patientId): self
    {
        return self::firstOrCreate(
            ['patient_id' => $patientId],
            [
                'no_show_count' => 0,
                'warning_count' => 0,
                'block_status' => 'active',
                'last_updated_at' => now(),
                'last_updated_by' => Auth::check() ? Auth::id() : 1,
            ]
        );
    }

    public static function getPatientsNeedingWarning(int $warningThreshold = 3): \Illuminate\Database\Eloquent\Collection
    {
        return self::with('patient.user')
            ->where('no_show_count', '>=', $warningThreshold)
            ->where('block_status', 'active')
            ->get();
    }

    public static function getPatientsNeedingBlock(int $blockThreshold = 5): \Illuminate\Database\Eloquent\Collection
    {
        return self::with('patient.user')
            ->where('no_show_count', '>=', $blockThreshold)
            ->where('block_status', '!=', 'blocked')
            ->get();
    }
}
