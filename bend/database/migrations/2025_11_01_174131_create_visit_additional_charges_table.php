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
        Schema::create('visit_additional_charges', function (Blueprint $table) {
            $table->id();
            
            $table->foreignId('patient_visit_id')
                ->constrained('patient_visits')
                ->cascadeOnDelete();
            
            $table->foreignId('inventory_item_id')
                ->constrained('inventory_items')
                ->onDelete('restrict');
            
            $table->decimal('quantity', 14, 3);
            $table->decimal('unit_price', 10, 2);
            $table->decimal('total_price', 10, 2);
            
            // Track which batch was used
            $table->foreignId('batch_id')
                ->nullable()
                ->constrained('inventory_batches')
                ->nullOnDelete();
            
            $table->text('notes')->nullable();
            
            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            
            $table->timestamps();
            
            $table->index(['patient_visit_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('visit_additional_charges');
    }
};
