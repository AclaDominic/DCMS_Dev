<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('notification_logs', function (Blueprint $table) {
            $table->id();
            $table->string('channel');              // e.g. 'sms'
            $table->string('to');                   // E.164 phone number
            $table->text('message');                // generic; no PHI
            $table->string('status')->default('pending'); // pending|sent|failed|blocked_sandbox
            $table->string('provider_message_id')->nullable();
            $table->text('error')->nullable();
            $table->json('meta')->nullable();       // {"reason":"appt_reminder","appointment_id":123}
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['channel','to','status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_logs');
    }
};
