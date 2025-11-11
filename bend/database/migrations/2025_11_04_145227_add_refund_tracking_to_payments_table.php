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
        Schema::table('payments', function (Blueprint $table) {
            $table->timestamp('refunded_at')->nullable()->after('cancelled_at');
            $table->foreignId('refunded_by')->nullable()->after('refunded_at')->constrained('users')->nullOnDelete();
        });

        // Update enum to include 'refunded' status when supported (skip on SQLite)
        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
        DB::statement("ALTER TABLE payments MODIFY COLUMN status ENUM('unpaid', 'awaiting_payment', 'paid', 'cancelled', 'failed', 'refunded') DEFAULT 'unpaid'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['refunded_by']);
            $table->dropColumn(['refunded_at', 'refunded_by']);
        });

        // Revert enum when supported (skip on SQLite)
        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
        DB::statement("ALTER TABLE payments MODIFY COLUMN status ENUM('unpaid', 'awaiting_payment', 'paid', 'cancelled', 'failed') DEFAULT 'unpaid'");
        }
    }
};
