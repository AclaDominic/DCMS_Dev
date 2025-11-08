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
        Schema::table('refund_requests', function (Blueprint $table) {
            $table->timestamp('pickup_notified_at')->nullable()->after('processed_at');
            $table->timestamp('pickup_reminder_sent_at')->nullable()->after('pickup_notified_at');
            $table->timestamp('deadline_extended_at')->nullable()->after('pickup_reminder_sent_at');
            $table->foreignId('deadline_extended_by')->nullable()->after('deadline_extended_at')->constrained('users')->nullOnDelete();
            $table->text('deadline_extension_reason')->nullable()->after('deadline_extended_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('refund_requests', function (Blueprint $table) {
            $table->dropForeign(['deadline_extended_by']);
            $table->dropColumn([
                'pickup_notified_at',
                'pickup_reminder_sent_at',
                'deadline_extended_at',
                'deadline_extended_by',
                'deadline_extension_reason',
            ]);
        });
    }
};

