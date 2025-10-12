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
        Schema::table('services', function (Blueprint $table) {
            // Add the foreign key column
            $table->unsignedBigInteger('service_category_id')->nullable()->after('price');
            
            // Add foreign key constraint
            $table->foreign('service_category_id')->references('id')->on('service_categories')->onDelete('set null');
            
            // Add index for better performance
            $table->index('service_category_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            // Drop the foreign key constraint first
            $table->dropForeign(['service_category_id']);
            
            // Drop the index
            $table->dropIndex(['service_category_id']);
            
            // Drop the column
            $table->dropColumn('service_category_id');
        });
    }
};
