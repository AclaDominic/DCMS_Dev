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
        Schema::create('patient_hmos', function (Blueprint $table) {
            $table->id();

            // Who owns this HMO record
            $table->unsignedBigInteger('patient_id')->index();

            // Required: HMO provider name (patient-typed)
            $table->string('provider_name');

            // Required: HMO number/ID
            $table->string('hmo_number');

            // Required: Patient full name as it appears on the HMO card
            $table->string('patient_fullname_on_card');

            // Mark one as primary if patient stores multiple later
            $table->boolean('is_primary')->default(false);

            // Audit: who encoded/edited last (users.id); nullable to allow system actions
            $table->unsignedBigInteger('author_id')->nullable()->index();

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('patient_id')->references('id')->on('patients')->cascadeOnDelete();
            $table->foreign('author_id')->references('id')->on('users')->nullOnDelete();

            // A patient may have multiple HMOs; allow multiple provider names.
            // But keep (patient_id, provider_name, hmo_number) unique-ish if you prefer:
            // $table->unique(['patient_id','provider_name','hmo_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patient_hmos');
    }
};
