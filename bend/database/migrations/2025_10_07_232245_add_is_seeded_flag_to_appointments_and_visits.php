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
        Schema::table('appointments', function (Blueprint $table) {
            $table->boolean('is_seeded')->default(false)->after('receipt_sent_to');
        });

        Schema::table('patient_visits', function (Blueprint $table) {
            $table->boolean('is_seeded')->default(false)->after('receipt_sent_to');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('is_seeded');
        });

        Schema::table('patient_visits', function (Blueprint $table) {
            $table->dropColumn('is_seeded');
        });
    }
};