<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('visit_notes', function (Blueprint $table) {
            $table->id();
            
            // Link to the visit
            $table->foreignId('patient_visit_id')
                ->constrained('patient_visits')
                ->cascadeOnDelete();
            
            // Encrypted note fields (Laravel will handle encryption automatically)
            $table->text('dentist_notes_encrypted')->nullable();
            $table->text('findings_encrypted')->nullable();
            $table->text('treatment_plan_encrypted')->nullable();
            
            // Metadata
            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->foreignId('updated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            
            // Audit fields
            $table->timestamp('last_accessed_at')->nullable();
            $table->foreignId('last_accessed_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            
            $table->timestamps();
            
            // Ensure one note record per visit
            $table->unique('patient_visit_id');
            
            // Indexes for performance
            $table->index(['created_by', 'created_at']);
            $table->index('last_accessed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visit_notes');
    }
};
