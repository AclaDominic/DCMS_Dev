<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PatientHmo extends Model
{
    use SoftDeletes;

    protected $table = 'patient_hmos';

    protected $fillable = [
        'patient_id',
        'provider_name',
        'hmo_number',
        'patient_fullname_on_card',
        'is_primary',
        'author_id',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}