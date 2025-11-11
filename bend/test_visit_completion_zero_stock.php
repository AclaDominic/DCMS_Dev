<?php

declare(strict_types=1);

use App\Http\Controllers\Staff\PatientVisitController;
use App\Models\DentistSchedule;
use App\Models\Patient;
use App\Models\PatientVisit;
use App\Models\Service;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

require __DIR__ . '/vendor/autoload.php';

$app = require __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "[Simulation] Starting zero-consumable visit completion test..." . PHP_EOL;

DB::beginTransaction();

try {
    $staff = User::factory()->create([
        'role' => 'staff',
        'status' => 'activated',
    ]);

    $patientUser = User::factory()->create([
        'role' => 'patient',
        'status' => 'activated',
    ]);

    $patient = Patient::factory()->create([
        'user_id' => $patientUser->id,
        'is_linked' => true,
        'first_name' => 'Simulated',
        'last_name' => 'Patient',
    ]);

    $service = Service::factory()->create([
        'name' => 'Zero Stock Simulation',
        'price' => 1500,
    ]);

    $dentistSchedule = DentistSchedule::create([
        'dentist_code' => 'SIM001',
        'dentist_name' => 'Dr. Simulation',
        'status' => 'active',
        'employment_type' => 'full_time',
        'mon' => true,
        'tue' => true,
        'wed' => true,
        'thu' => true,
        'fri' => true,
        'sat' => false,
        'sun' => false,
    ]);

    $visit = PatientVisit::create([
        'patient_id' => $patient->id,
        'service_id' => $service->id,
        'dentist_schedule_id' => $dentistSchedule->id,
        'visit_date' => now()->toDateString(),
        'start_time' => now(),
        'status' => 'pending',
        'visit_code' => PatientVisit::generateVisitCode(),
        'visit_code_sent_at' => now(),
    ]);

    Auth::login($staff);

    /** @var PatientVisitController $controller */
    $controller = app(PatientVisitController::class);

    $payload = [
        'stock_items' => [],
        'billable_items' => [],
        'dentist_notes' => 'Simulation run with zero consumables.',
        'findings' => 'Routine check-up.',
        'treatment_plan' => 'Return after six months.',
        'teeth_treated' => null,
        'payment_status' => 'paid',
        'onsite_payment_amount' => null,
        'payment_method_change' => null,
    ];

    $request = Request::create(
        "/api/visits/{$visit->id}/complete-with-details",
        'POST',
        $payload
    );

    $response = $controller->completeWithDetails($request, $visit->id);

    echo "[Simulation] Response status: {$response->getStatusCode()}" . PHP_EOL;
    echo "[Simulation] Response payload:" . PHP_EOL;
    echo json_encode($response->getData(true), JSON_PRETTY_PRINT) . PHP_EOL;

    Auth::logout();
    DB::rollBack();

    echo "[Simulation] Completed successfully. Database changes were rolled back." . PHP_EOL;
} catch (Throwable $throwable) {
    DB::rollBack();
    Auth::logout();
    fwrite(STDERR, "[Simulation] Failed: {$throwable->getMessage()}" . PHP_EOL);
    $code = $throwable->getCode() ?: 1;
    exit(is_int($code) ? $code : 1);
}

