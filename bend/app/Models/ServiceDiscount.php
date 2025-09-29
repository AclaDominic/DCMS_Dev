<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceDiscount extends Model
{
    protected $fillable = [
        'service_id', 
        'start_date', 
        'end_date', 
        'discounted_price',
        'status',
        'activated_at'
    ];

    protected $casts = [
        'activated_at' => 'datetime',
    ];

    public function service()
    {
        return $this->belongsTo(Service::class);
    }
}
