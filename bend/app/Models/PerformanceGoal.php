<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PerformanceGoal extends Model
{
    use HasFactory;

    protected $fillable = [
        'period_type',
        'period_start',
        'period_end',
        'metric',
        'target_value',
        'status',
        'created_by',
        'service_id',
        'package_id',
        'promo_id',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'target_value' => 'integer',
    ];

    public function snapshots()
    {
        return $this->hasMany(GoalProgressSnapshot::class, 'goal_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function package()
    {
        return $this->belongsTo(Service::class, 'package_id');
    }

    public function promo()
    {
        return $this->belongsTo(ServiceDiscount::class, 'promo_id');
    }
}

