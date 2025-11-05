<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('refund_settings', function (Blueprint $table) {
            $table->id();
            $table->integer('cancellation_deadline_hours')->default(24);
            $table->integer('monthly_cancellation_limit')->default(3);
            $table->boolean('create_zero_refund_request')->default(false);
            $table->integer('reminder_days')->default(5);
            $table->timestamps();
        });

        // Insert default settings
        DB::table('refund_settings')->insert([
            'cancellation_deadline_hours' => 24,
            'monthly_cancellation_limit' => 3,
            'create_zero_refund_request' => false,
            'reminder_days' => 5,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('refund_settings');
    }
};
