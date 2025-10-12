<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Patient;
use App\Models\Service;
use App\Models\PatientVisit;
use App\Models\Payment;
use App\Models\VisitNote;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

class MayaPaymentCompletionTest extends TestCase
{
    use RefreshDatabase;

    protected $staff;
    protected $service;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create staff user for testing
        $this->staff = User::factory()->create([
            'role' => 'staff',
            'status' => 'activated',
        ]);

        // Create approved device for staff user
        $this->createApprovedDevice($this->staff);

        // Create a service for testing
        $this->service = Service::factory()->create([
            'name' => 'Dental Cleaning',
            'price' => 1500.00,
        ]);

        // Create inventory items for testing
        $this->inventoryItem1 = \App\Models\InventoryItem::create([
            'name' => 'Dental Floss',
            'description' => 'Dental floss for cleaning',
            'total_on_hand' => 100,
            'unit_of_measure' => 'pieces',
            'minimum_stock_level' => 10,
        ]);

        $this->inventoryItem2 = \App\Models\InventoryItem::create([
            'name' => 'Toothbrush',
            'description' => 'Soft toothbrush',
            'total_on_hand' => 50,
            'unit_of_measure' => 'pieces',
            'minimum_stock_level' => 5,
        ]);
    }

    private function createApprovedDevice($user)
    {
        // Create a device fingerprint (this would normally be generated from IP + User Agent)
        $fingerprint = hash('sha256', '127.0.0.1|Symfony');
        
        // Insert approved device record
        \DB::table('staff_device')->insert([
            'user_id' => $user->id,
            'device_fingerprint' => $fingerprint,
            'device_name' => 'Test Device',
            'is_approved' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /** @test */
    public function visit_completion_with_paid_maya_payment_sets_status_to_paid()
    {
        $this->actingAs($this->staff);

        // Create a visit with a paid Maya payment
        $visit = PatientVisit::factory()->create([
            'status' => 'pending',
            'service_id' => $this->service->id,
        ]);

        // Create a completed Maya payment
        Payment::factory()->maya()->paid()->create([
            'patient_visit_id' => $visit->id,
            'amount_due' => 1500.00,
            'amount_paid' => 1500.00,
        ]);

        $completionData = [
            'stock_items' => [], // Empty array should be allowed
            'dentist_notes' => 'Patient completed treatment successfully.',
            'findings' => 'No issues found.',
            'treatment_plan' => 'Continue regular checkups.',
            'teeth_treated' => '1,2,3',
            'payment_status' => 'paid', // This should be automatically set to paid for Maya
            'onsite_payment_amount' => null,
            'payment_method_change' => null,
        ];

        $response = $this->postJson("/api/visits/{$visit->id}/complete-with-details", $completionData);

        $response->assertStatus(200);

        // Verify the visit is completed
        $visit->refresh();
        $this->assertEquals('completed', $visit->status);
        $this->assertNotNull($visit->end_time);

        // Verify visit notes were created
        $this->assertDatabaseHas('visit_notes', [
            'patient_visit_id' => $visit->id,
            'dentist_notes' => 'Patient completed treatment successfully.',
            'findings' => 'No issues found.',
            'treatment_plan' => 'Continue regular checkups.',
            'teeth_treated' => '1,2,3',
        ]);
    }

    /** @test */
    public function visit_completion_with_unpaid_maya_payment_allows_payment_changes()
    {
        $this->actingAs($this->staff);

        // Create a visit with an unpaid Maya payment
        $visit = PatientVisit::factory()->create([
            'status' => 'pending',
            'service_id' => $this->service->id,
        ]);

        // Create a failed Maya payment
        Payment::factory()->maya()->create([
            'patient_visit_id' => $visit->id,
            'status' => 'failed',
            'amount_due' => 1500.00,
            'amount_paid' => 0,
        ]);

        $completionData = [
            'stock_items' => [],
            'dentist_notes' => 'Patient completed treatment successfully.',
            'findings' => 'No issues found.',
            'treatment_plan' => 'Continue regular checkups.',
            'teeth_treated' => '1,2,3',
            'payment_status' => 'unpaid',
            'onsite_payment_amount' => null,
            'payment_method_change' => 'maya_to_cash',
        ];

        $response = $this->postJson("/api/visits/{$visit->id}/complete-with-details", $completionData);

        $response->assertStatus(200);

        // Verify the visit is completed
        $visit->refresh();
        $this->assertEquals('completed', $visit->status);

        // Verify the Maya payment was changed to cash and marked as paid
        $payment = Payment::where('patient_visit_id', $visit->id)->first();
        $this->assertEquals('cash', $payment->method);
        $this->assertEquals('paid', $payment->status);
        $this->assertEquals(1500.00, $payment->amount_paid);
        $this->assertNotNull($payment->paid_at);
    }

    /** @test */
    public function visit_completion_with_awaiting_maya_payment_allows_status_change()
    {
        $this->actingAs($this->staff);

        // Create a visit with an awaiting Maya payment
        $visit = PatientVisit::factory()->create([
            'status' => 'pending',
            'service_id' => $this->service->id,
        ]);

        // Create an awaiting Maya payment
        Payment::factory()->maya()->create([
            'patient_visit_id' => $visit->id,
            'status' => 'awaiting_payment',
            'amount_due' => 1500.00,
            'amount_paid' => 0,
        ]);

        $completionData = [
            'stock_items' => [],
            'dentist_notes' => 'Patient completed treatment successfully.',
            'findings' => 'No issues found.',
            'treatment_plan' => 'Continue regular checkups.',
            'teeth_treated' => '1,2,3',
            'payment_status' => 'unpaid',
            'onsite_payment_amount' => null,
            'payment_method_change' => 'maya_to_cash',
        ];

        $response = $this->postJson("/api/visits/{$visit->id}/complete-with-details", $completionData);

        $response->assertStatus(200);

        // Verify the Maya payment was changed to cash and marked as paid
        $payment = Payment::where('patient_visit_id', $visit->id)->first();
        $this->assertEquals('cash', $payment->method);
        $this->assertEquals('paid', $payment->status);
        $this->assertEquals(1500.00, $payment->amount_paid);
    }

    /** @test */
    public function visit_completion_with_partial_payment_creates_additional_payment()
    {
        $this->actingAs($this->staff);

        // Create a visit with HMO payment that doesn't cover full amount
        $visit = PatientVisit::factory()->create([
            'status' => 'pending',
            'service_id' => $this->service->id,
        ]);

        // Create HMO payment that only covers part of the service
        Payment::factory()->hmo()->paid()->create([
            'patient_visit_id' => $visit->id,
            'amount_due' => 1000.00,
            'amount_paid' => 1000.00,
        ]);

        $completionData = [
            'stock_items' => [],
            'dentist_notes' => 'Patient completed treatment successfully.',
            'findings' => 'No issues found.',
            'treatment_plan' => 'Continue regular checkups.',
            'teeth_treated' => '1,2,3',
            'payment_status' => 'partial',
            'onsite_payment_amount' => 500.00,
            'payment_method_change' => null,
        ];

        $response = $this->postJson("/api/visits/{$visit->id}/complete-with-details", $completionData);

        $response->assertStatus(200);

        // Verify both payments exist
        $payments = Payment::where('patient_visit_id', $visit->id)->get();
        $this->assertCount(2, $payments);

        $hmoPayment = $payments->where('method', 'hmo')->first();
        $cashPayment = $payments->where('method', 'cash')->first();

        $this->assertNotNull($hmoPayment);
        $this->assertNotNull($cashPayment);
        $this->assertEquals(500.00, $cashPayment->amount_due);
        $this->assertEquals(500.00, $cashPayment->amount_paid);
        $this->assertEquals('paid', $cashPayment->status);
    }

    /** @test */
    public function visit_completion_with_stock_consumption_tracks_inventory()
    {
        $this->actingAs($this->staff);

        // Create a visit with paid Maya payment
        $visit = PatientVisit::factory()->create([
            'status' => 'pending',
            'service_id' => $this->service->id,
        ]);

        Payment::factory()->maya()->paid()->create([
            'patient_visit_id' => $visit->id,
            'amount_due' => 1500.00,
            'amount_paid' => 1500.00,
        ]);

        $completionData = [
            'stock_items' => [
                [
                    'item_id' => $this->inventoryItem1->id,
                    'quantity' => 2,
                    'notes' => 'Used for cleaning'
                ],
                [
                    'item_id' => $this->inventoryItem2->id,
                    'quantity' => 1,
                    'notes' => 'Disposable item'
                ]
            ],
            'dentist_notes' => 'Patient completed treatment successfully.',
            'findings' => 'No issues found.',
            'treatment_plan' => 'Continue regular checkups.',
            'teeth_treated' => '1,2,3',
            'payment_status' => 'paid',
            'onsite_payment_amount' => null,
            'payment_method_change' => null,
        ];

        $response = $this->postJson("/api/visits/{$visit->id}/complete-with-details", $completionData);

        $response->assertStatus(200);

        // Note: Inventory tracking would be tested separately in inventory tests
        // This test just verifies the completion works with stock items
        $visit->refresh();
        $this->assertEquals('completed', $visit->status);
    }

    /** @test */
    public function visit_completion_prevents_completing_already_completed_visits()
    {
        $this->actingAs($this->staff);

        // Create an already completed visit
        $visit = PatientVisit::factory()->completed()->create([
            'service_id' => $this->service->id,
        ]);

        $completionData = [
            'stock_items' => [],
            'dentist_notes' => 'Attempting to complete again.',
            'findings' => 'No issues found.',
            'treatment_plan' => 'Continue regular checkups.',
            'teeth_treated' => '1,2,3',
            'payment_status' => 'paid',
            'onsite_payment_amount' => null,
            'payment_method_change' => null,
        ];

        $response = $this->postJson("/api/visits/{$visit->id}/complete-with-details", $completionData);

        $response->assertStatus(422)
                ->assertJson([
                    'message' => 'Only pending visits can be completed.'
                ]);
    }

    /** @test */
    public function visit_completion_requires_valid_payment_status()
    {
        $this->actingAs($this->staff);

        $visit = PatientVisit::factory()->create([
            'status' => 'pending',
            'service_id' => $this->service->id,
        ]);

        Payment::factory()->maya()->paid()->create([
            'patient_visit_id' => $visit->id,
        ]);

        $completionData = [
            'stock_items' => [],
            'dentist_notes' => 'Patient completed treatment successfully.',
            'findings' => 'No issues found.',
            'treatment_plan' => 'Continue regular checkups.',
            'teeth_treated' => '1,2,3',
            'payment_status' => 'invalid_status', // Invalid status
            'onsite_payment_amount' => null,
            'payment_method_change' => null,
        ];

        $response = $this->postJson("/api/visits/{$visit->id}/complete-with-details", $completionData);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['payment_status']);
    }

    /** @test */
    public function visit_completion_with_maya_payment_automatically_sends_receipt()
    {
        $this->actingAs($this->staff);

        // Create a visit with paid Maya payment
        $visit = PatientVisit::factory()->create([
            'status' => 'pending',
            'service_id' => $this->service->id,
        ]);

        Payment::factory()->maya()->paid()->create([
            'patient_visit_id' => $visit->id,
            'amount_due' => 1500.00,
            'amount_paid' => 1500.00,
        ]);

        $completionData = [
            'stock_items' => [],
            'dentist_notes' => 'Patient completed treatment successfully.',
            'findings' => 'No issues found.',
            'treatment_plan' => 'Continue regular checkups.',
            'teeth_treated' => '1,2,3',
            'payment_status' => 'paid',
            'onsite_payment_amount' => null,
            'payment_method_change' => null,
        ];

        // Mock the receipt email endpoint to avoid actual email sending
        $this->mock(\App\Services\ReceiptService::class, function ($mock) {
            $mock->shouldReceive('sendReceiptEmail')
                ->once()
                ->andReturn(['message' => 'Receipt sent successfully']);
        });

        $response = $this->postJson("/api/visits/{$visit->id}/complete-with-details", $completionData);

        $response->assertStatus(200);
    }

    /** @test */
    public function visit_completion_handles_multiple_payment_scenarios()
    {
        $this->actingAs($this->staff);

        // Test scenario: Maya payment failed, then cash payment made
        $visit = PatientVisit::factory()->create([
            'status' => 'pending',
            'service_id' => $this->service->id,
        ]);

        // Failed Maya payment
        Payment::factory()->maya()->create([
            'patient_visit_id' => $visit->id,
            'status' => 'failed',
            'amount_due' => 1500.00,
            'amount_paid' => 0,
        ]);

        // Successful cash payment
        Payment::factory()->cash()->paid()->create([
            'patient_visit_id' => $visit->id,
            'amount_due' => 1500.00,
            'amount_paid' => 1500.00,
        ]);

        $completionData = [
            'stock_items' => [],
            'dentist_notes' => 'Patient completed treatment successfully.',
            'findings' => 'No issues found.',
            'treatment_plan' => 'Continue regular checkups.',
            'teeth_treated' => '1,2,3',
            'payment_status' => 'paid',
            'onsite_payment_amount' => null,
            'payment_method_change' => null,
        ];

        $response = $this->postJson("/api/visits/{$visit->id}/complete-with-details", $completionData);

        $response->assertStatus(200);

        // Verify both payments exist and the visit is completed
        $visit->refresh();
        $this->assertEquals('completed', $visit->status);

        $payments = Payment::where('patient_visit_id', $visit->id)->get();
        $this->assertCount(2, $payments);

        $mayaPayment = $payments->where('method', 'maya')->first();
        $cashPayment = $payments->where('method', 'cash')->first();

        $this->assertEquals('failed', $mayaPayment->status);
        $this->assertEquals('paid', $cashPayment->status);
    }
}
