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
        Schema::create('queued_emails', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('email');
            $table->string('type'); // email_verification, password_reset, etc.
            $table->text('reason')->nullable(); // Why it was queued
            $table->enum('status', ['queued', 'sent', 'failed'])->default('queued');
            $table->timestamp('sent_at')->nullable();
            $table->integer('attempts')->default(0);
            $table->timestamps();
            
            $table->index(['status', 'created_at']);
            $table->index(['user_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('queued_emails');
    }
};
