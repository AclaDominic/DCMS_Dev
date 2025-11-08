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
        Schema::create('policy_history', function (Blueprint $table) {
            $table->id();
            $table->text('privacy_policy')->nullable();
            $table->text('terms_conditions')->nullable();
            $table->date('effective_date');
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            
            // Indexes for efficient querying
            $table->index('effective_date');
            $table->index('created_at');
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->foreign('policy_history_id')
                ->references('id')
                ->on('policy_history')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropForeign(['policy_history_id']);
        });

        Schema::dropIfExists('policy_history');
    }
};

