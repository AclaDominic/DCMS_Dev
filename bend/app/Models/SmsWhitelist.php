<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SmsWhitelist extends Model
{
    protected $table = 'sms_whitelist';
    
    protected $fillable = ['phone_e164','label','created_by'];
}
