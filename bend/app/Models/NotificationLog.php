<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificationLog extends Model
{
    protected $fillable = [
        'channel','to','message','status',
        'provider_message_id','error','meta','created_by',
    ];
    
    protected $casts = ['meta' => 'array'];
}
