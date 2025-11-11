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
        Schema::table('appointments', function (Blueprint $table) {
            $table->foreignId('dentist_schedule_id')
                ->nullable()
                ->after('service_id')
                ->constrained('dentist_schedules')
                ->nullOnDelete();

            $table->boolean('honor_preferred_dentist')
                ->default(true)
                ->after('dentist_schedule_id')
                ->comment('When false, patient opted out of automatic preferred dentist assignment for this appointment.');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('honor_preferred_dentist');
            $table->dropConstrainedForeignId('dentist_schedule_id');
        });
    }
};


