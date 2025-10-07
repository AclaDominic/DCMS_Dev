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
        Schema::create('sms_whitelist', function (Blueprint $table) {
            $table->id();
            $table->string('phone_e164')->unique(); // e.g., +639171234567
            $table->string('label')->nullable();    // e.g., "Dev phone – Dr. Reyes"
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index('phone_e164');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sms_whitelist');
    }
};
