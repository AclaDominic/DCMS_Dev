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
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->boolean('is_sellable')->default(false)->after('is_controlled');
            $table->decimal('patient_price', 10, 2)->nullable()->after('is_sellable');
            $table->text('sellable_notes')->nullable()->after('patient_price');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->dropColumn(['is_sellable', 'patient_price', 'sellable_notes']);
        });
    }
};
