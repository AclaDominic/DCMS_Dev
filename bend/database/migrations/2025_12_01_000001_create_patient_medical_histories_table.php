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
        Schema::create('patient_medical_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained()->onDelete('cascade');
            $table->foreignId('patient_visit_id')->unique()->constrained()->onDelete('cascade');
            
            // Patient Information (pre-filled but editable)
            $table->string('full_name')->nullable();
            $table->integer('age')->nullable();
            $table->enum('sex', ['male', 'female'])->nullable();
            $table->string('address')->nullable();
            $table->string('contact_number')->nullable();
            $table->string('occupation')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('email')->nullable();
            $table->string('previous_dentist')->nullable();
            $table->date('last_dental_visit')->nullable();
            $table->string('physician_name')->nullable();
            $table->string('physician_address')->nullable();
            
            // Health Questions (Yes/No/Details)
            $table->boolean('in_good_health')->nullable();
            $table->boolean('under_medical_treatment')->nullable();
            $table->text('medical_treatment_details')->nullable();
            $table->boolean('serious_illness_surgery')->nullable();
            $table->text('illness_surgery_details')->nullable();
            $table->boolean('hospitalized')->nullable();
            $table->text('hospitalization_details')->nullable();
            $table->boolean('taking_medications')->nullable();
            $table->text('medications_list')->nullable();
            $table->boolean('uses_tobacco')->nullable();
            $table->boolean('uses_alcohol_drugs')->nullable();
            
            // Allergies
            $table->boolean('allergic_local_anesthetic')->default(false);
            $table->boolean('allergic_penicillin')->default(false);
            $table->boolean('allergic_sulfa')->default(false);
            $table->boolean('allergic_aspirin')->default(false);
            $table->boolean('allergic_latex')->default(false);
            $table->text('allergic_others')->nullable();
            
            // For Women Only
            $table->boolean('is_pregnant')->nullable();
            $table->boolean('is_nursing')->nullable();
            $table->boolean('taking_birth_control')->nullable();
            
            // Vital Information
            $table->string('blood_type')->nullable();
            $table->string('blood_pressure')->nullable();
            $table->string('bleeding_time')->nullable();
            
            // Medical Conditions (all boolean)
            $table->boolean('high_blood_pressure')->default(false);
            $table->boolean('low_blood_pressure')->default(false);
            $table->boolean('heart_disease')->default(false);
            $table->boolean('heart_murmur')->default(false);
            $table->boolean('chest_pain')->default(false);
            $table->boolean('stroke')->default(false);
            $table->boolean('diabetes')->default(false);
            $table->boolean('hepatitis')->default(false);
            $table->boolean('tuberculosis')->default(false);
            $table->boolean('kidney_disease')->default(false);
            $table->boolean('cancer')->default(false);
            $table->boolean('asthma')->default(false);
            $table->boolean('anemia')->default(false);
            $table->boolean('arthritis')->default(false);
            $table->boolean('epilepsy')->default(false);
            $table->boolean('aids_hiv')->default(false);
            $table->boolean('stomach_troubles')->default(false);
            $table->boolean('thyroid_problems')->default(false);
            $table->boolean('hay_fever')->default(false);
            $table->boolean('head_injuries')->default(false);
            $table->boolean('rapid_weight_loss')->default(false);
            $table->boolean('joint_replacement')->default(false);
            $table->boolean('radiation_therapy')->default(false);
            $table->boolean('swollen_ankles')->default(false);
            $table->text('other_conditions')->nullable();
            
            // Tracking
            $table->foreignId('completed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            
            $table->index(['patient_id', 'patient_visit_id']);
            $table->index('completed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patient_medical_histories');
    }
};
