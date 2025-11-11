<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_visits', function (Blueprint $table) {
            $table->foreignId('dentist_schedule_id')
                ->nullable()
                ->after('service_id')
                ->constrained()
                ->nullOnDelete();

            $table->timestamp('visit_code_sent_at')
                ->nullable()
                ->after('consultation_started_at');
        });
    }

    public function down(): void
    {
        Schema::table('patient_visits', function (Blueprint $table) {
            $table->dropForeign(['dentist_schedule_id']);
            $table->dropColumn(['dentist_schedule_id', 'visit_code_sent_at']);
        });
    }
};

