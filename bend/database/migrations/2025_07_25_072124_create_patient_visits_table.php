<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('patient_visits', function (Blueprint $table) {
            $table->id();

            $table->foreignId('patient_id')->constrained()->onDelete('cascade');
            $table->foreignId('service_id')->nullable()->constrained()->onDelete('cascade');

            $table->date('visit_date');
            $table->timestamp('start_time')->nullable(); // recorded upon visit creation
            $table->timestamp('end_time')->nullable();   // recorded on completion or rejection

            $table->enum('status', ['pending', 'completed', 'rejected', 'inquiry'])->default('pending');

            // Visit code for dentist access
            $table->string('visit_code', 10)->unique()->nullable();
            $table->timestamp('consultation_started_at')->nullable();

            // Note: visit notes are now stored in separate visit_notes table with encryption

            $table->timestamps();
            
            // Index for visit code lookups
            $table->index('visit_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patient_visits');
    }
};
