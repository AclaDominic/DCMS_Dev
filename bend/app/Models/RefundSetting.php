<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class RefundSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'cancellation_deadline_hours',
        'monthly_cancellation_limit',
        'create_zero_refund_request',
        'reminder_days',
    ];

    protected $casts = [
        'cancellation_deadline_hours' => 'integer',
        'monthly_cancellation_limit' => 'integer',
        'create_zero_refund_request' => 'boolean',
        'reminder_days' => 'integer',
    ];

    /**
     * Get the current refund settings (singleton pattern)
     */
    public static function getSettings(): self
    {
        return self::first() ?? self::create([
            'cancellation_deadline_hours' => 24,
            'monthly_cancellation_limit' => 3,
            'create_zero_refund_request' => false,
            'reminder_days' => 5,
        ]);
    }
}
