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
        Schema::table('patient_visits', function (Blueprint $table) {
            $table->enum('medical_history_status', ['pending', 'completed', 'skipped'])
                  ->default('pending')
                  ->after('status');
            $table->foreignId('medical_history_id')
                  ->nullable()
                  ->constrained('patient_medical_histories')
                  ->onDelete('set null')
                  ->after('medical_history_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patient_visits', function (Blueprint $table) {
            $table->dropForeign(['medical_history_id']);
            $table->dropColumn(['medical_history_status', 'medical_history_id']);
        });
    }
};
