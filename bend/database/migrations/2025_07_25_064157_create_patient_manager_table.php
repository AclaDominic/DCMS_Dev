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
        Schema::create('patient_manager', function (Blueprint $table) {
            $table->id();
            
            // Link to patient
            $table->foreignId('patient_id')->constrained()->onDelete('cascade');
            
            // No-show tracking
            $table->integer('no_show_count')->default(0);
            $table->timestamp('last_no_show_at')->nullable();
            
            // Warning system
            $table->integer('warning_count')->default(0);
            $table->timestamp('last_warning_sent_at')->nullable();
            $table->text('last_warning_message')->nullable();
            
            // Blocking system
            $table->enum('block_status', ['active', 'blocked', 'warning'])->default('active');
            $table->timestamp('blocked_at')->nullable();
            $table->text('block_reason')->nullable();
            $table->enum('block_type', ['account', 'ip', 'both'])->nullable();
            $table->string('blocked_ip')->nullable();
            $table->foreignId('blocked_by')->nullable()->constrained('users')->onDelete('set null');
            
            // Admin notes
            $table->text('admin_notes')->nullable();
            
            // Tracking
            $table->timestamp('last_updated_at')->nullable();
            $table->foreignId('last_updated_by')->nullable()->constrained('users')->onDelete('set null');
            
            $table->timestamps();
            
            // Indexes
            $table->index(['patient_id', 'block_status']);
            $table->index(['no_show_count', 'block_status']);
            $table->index('blocked_ip');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patient_manager');
    }
};
