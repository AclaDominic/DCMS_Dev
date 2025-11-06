<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PolicyHistory extends Model
{
    use HasFactory;

    protected $table = 'policy_history';

    protected $fillable = [
        'privacy_policy',
        'terms_conditions',
        'effective_date',
        'contact_email',
        'contact_phone',
        'created_by',
    ];

    protected $casts = [
        'effective_date' => 'date',
    ];

    /**
     * Get the user who created this policy version
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

