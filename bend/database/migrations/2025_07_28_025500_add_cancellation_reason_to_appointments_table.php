<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->enum('cancellation_reason', [
                'patient_request',
                'admin_cancellation',
                'health_safety_concern',
                'clinic_cancellation',
                'medical_contraindication',
                'other'
            ])->nullable()->after('notes');
            
            $table->text('treatment_adjustment_notes')->nullable()->after('cancellation_reason');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['cancellation_reason', 'treatment_adjustment_notes']);
        });
    }
};

