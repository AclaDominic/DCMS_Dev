<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('performance_goals', function (Blueprint $table) {
            $table->date('period_end')->nullable()->after('period_start');
            $table->foreignId('service_id')->nullable()->constrained('services')->onDelete('cascade')->after('target_value');
            $table->foreignId('package_id')->nullable()->constrained('services')->onDelete('cascade')->after('service_id');
            $table->foreignId('promo_id')->nullable()->constrained('service_discounts')->onDelete('cascade')->after('package_id');
            
            // Update the unique constraint to include the new fields
            $table->dropUnique('uniq_goal_period_metric');
            $table->unique(['period_type', 'period_start', 'metric', 'service_id', 'package_id', 'promo_id'], 'uniq_goal_period_metric_specific');
        });
    }

    public function down(): void
    {
        Schema::table('performance_goals', function (Blueprint $table) {
            $table->dropUnique('uniq_goal_period_metric_specific');
            $table->dropForeign(['service_id']);
            $table->dropForeign(['package_id']);
            $table->dropForeign(['promo_id']);
            $table->dropColumn(['period_end', 'service_id', 'package_id', 'promo_id']);
            
            // Restore original unique constraint
            $table->unique(['period_type', 'period_start', 'metric'], 'uniq_goal_period_metric');
        });
    }
};
