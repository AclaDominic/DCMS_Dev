<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Patient;
use App\Models\Service;
use App\Models\PatientVisit;
use App\Models\Payment;
use App\Models\InventoryItem;
use Illuminate\Foundation\Testing\RefreshDatabase;

class VisitCompletionIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected $staff;
    protected $service;
    protected $inventoryItem;

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

        // Create inventory item for testing
        $this->inventoryItem = InventoryItem::factory()->create([
            'name' => 'Dental Floss',
            'total_on_hand' => 100,
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
    public function visit_completion_workflow_with_paid_maya_payment()
    {
        $this->actingAs($this->staff);

        // Create a visit with a completed Maya payment
        $visit = PatientVisit::factory()->create([
            'status' => 'pending',
            'service_id' => $this->service->id,
        ]);

        // Create a paid Maya payment
        $mayaPayment = Payment::factory()->maya()->paid()->create([
            'patient_visit_id' => $visit->id,
            'amount_due' => 1500.00,
            'amount_paid' => 1500.00,
            'paid_at' => now()->subHour(),
        ]);

        // Step 1: Get visit data (simulates frontend fetching visit with payments)
        $visitResponse = $this->getJson('/api/visits');
        $visitResponse->assertStatus(200);
        
        $visitData = collect($visitResponse->json())->firstWhere('id', $visit->id);
        $this->assertNotNull($visitData);
        $this->assertCount(1, $visitData['payments']);
        $this->assertEquals('maya', $visitData['payments'][0]['method']);
        $this->assertEquals('paid', $visitData['payments'][0]['status']);

        // Step 2: Complete visit with stock consumption and notes
        $completionData = [
            'stock_items' => [
                [
                    'item_id' => $this->inventoryItem->id,
                    'quantity' => 2,
                    'notes' => 'Used for cleaning procedure'
                ]
            ],
            'dentist_notes' => 'Patient completed cleaning successfully. No complications.',
            'findings' => 'Minor plaque buildup found and removed.',
            'treatment_plan' => 'Continue regular 6-month cleanings.',
            'teeth_treated' => '1,2,3,4,5,6',
            'payment_status' => 'paid', // Should be automatically set to paid for Maya
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
            'dentist_notes' => 'Patient completed cleaning successfully. No complications.',
            'findings' => 'Minor plaque buildup found and removed.',
            'treatment_plan' => 'Continue regular 6-month cleanings.',
            'teeth_treated' => '1,2,3,4,5,6',
        ]);

        // Verify the Maya payment remains unchanged (no new payment created)
        $payments = Payment::where('patient_visit_id', $visit->id)->get();
        $this->assertCount(1, $payments);
        $this->assertEquals('maya', $payments->first()->method);
        $this->assertEquals('paid', $payments->first()->status);
    }

    /** @test */
    public function visit_completion_workflow_with_failed_maya_payment_converted_to_cash()
    {
        $this->actingAs($this->staff);

        // Create a visit with a failed Maya payment
        $visit = PatientVisit::factory()->create([
            'status' => 'pending',
            'service_id' => $this->service->id,
        ]);

        // Create a failed Maya payment
        $failedMayaPayment = Payment::factory()->maya()->create([
            'patient_visit_id' => $visit->id,
            'status' => 'failed',
            'amount_due' => 1500.00,
            'amount_paid' => 0,
        ]);

        // Step 1: Get visit data
        $visitResponse = $this->getJson('/api/visits');
        $visitResponse->assertStatus(200);
        
        $visitData = collect($visitResponse->json())->firstWhere('id', $visit->id);
        $this->assertEquals('failed', $visitData['payments'][0]['status']);

        // Step 2: Complete visit with payment method change
        $completionData = [
            'stock_items' => [],
            'dentist_notes' => 'Patient completed cleaning successfully.',
            'findings' => 'No issues found.',
            'treatment_plan' => 'Continue regular cleanings.',
            'teeth_treated' => '1,2,3,4,5,6',
            'payment_status' => 'unpaid',
            'onsite_payment_amount' => null,
            'payment_method_change' => 'maya_to_cash',
        ];

        $response = $this->postJson("/api/visits/{$visit->id}/complete-with-details", $completionData);

        $response->assertStatus(200);

        // Verify the Maya payment was converted to cash and marked as paid
        $payments = Payment::where('patient_visit_id', $visit->id)->get();
        $this->assertCount(1, $payments);
        
        $payment = $payments->first();
        $this->assertEquals('cash', $payment->method);
        $this->assertEquals('paid', $payment->status);
        $this->assertEquals(1500.00, $payment->amount_paid);
        $this->assertNotNull($payment->paid_at);
    }

    /** @test */
    public function visit_completion_workflow_with_partial_hmo_coverage()
    {
        $this->actingAs($this->staff);

        // Create a visit with HMO payment that doesn't cover full amount
        $visit = PatientVisit::factory()->create([
            'status' => 'pending',
            'service_id' => $this->service->id,
        ]);

        // Create HMO payment that only covers part of the service
        $hmoPayment = Payment::factory()->hmo()->paid()->create([
            'patient_visit_id' => $visit->id,
            'amount_due' => 1000.00,
            'amount_paid' => 1000.00,
        ]);

        // Step 1: Get visit data
        $visitResponse = $this->getJson('/api/visits');
        $visitResponse->assertStatus(200);

        // Step 2: Complete visit with additional cash payment
        $completionData = [
            'stock_items' => [
                [
                    'item_id' => $this->inventoryItem->id,
                    'quantity' => 1,
                    'notes' => 'Used for final cleaning'
                ]
            ],
            'dentist_notes' => 'Patient completed cleaning successfully.',
            'findings' => 'HMO covered most of the procedure.',
            'treatment_plan' => 'Continue regular cleanings.',
            'teeth_treated' => '1,2,3,4,5,6',
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
        $this->assertEquals(1000.00, $hmoPayment->amount_paid);
        $this->assertEquals(500.00, $cashPayment->amount_paid);
        $this->assertEquals('paid', $cashPayment->status);
    }

    /** @test */
    public function visit_completion_workflow_with_multiple_payment_scenarios()
    {
        $this->actingAs($this->staff);

        // Scenario: Maya payment failed, then cash payment made separately
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

        // Successful cash payment made separately
        Payment::factory()->cash()->paid()->create([
            'patient_visit_id' => $visit->id,
            'amount_due' => 1500.00,
            'amount_paid' => 1500.00,
        ]);

        // Step 1: Get visit data
        $visitResponse = $this->getJson('/api/visits');
        $visitResponse->assertStatus(200);
        
        $visitData = collect($visitResponse->json())->firstWhere('id', $visit->id);
        $this->assertCount(2, $visitData['payments']);

        // Step 2: Complete visit
        $completionData = [
            'stock_items' => [],
            'dentist_notes' => 'Patient completed cleaning successfully.',
            'findings' => 'No issues found.',
            'treatment_plan' => 'Continue regular cleanings.',
            'teeth_treated' => '1,2,3,4,5,6',
            'payment_status' => 'paid',
            'onsite_payment_amount' => null,
            'payment_method_change' => null,
        ];

        $response = $this->postJson("/api/visits/{$visit->id}/complete-with-details", $completionData);

        $response->assertStatus(200);

        // Verify both payments remain unchanged
        $payments = Payment::where('patient_visit_id', $visit->id)->get();
        $this->assertCount(2, $payments);

        $mayaPayment = $payments->where('method', 'maya')->first();
        $cashPayment = $payments->where('method', 'cash')->first();

        $this->assertEquals('failed', $mayaPayment->status);
        $this->assertEquals('paid', $cashPayment->status);
    }

    /** @test */
    public function visit_completion_validates_required_fields()
    {
        $this->actingAs($this->staff);

        $visit = PatientVisit::factory()->create([
            'status' => 'pending',
            'service_id' => $this->service->id,
        ]);

        Payment::factory()->maya()->paid()->create([
            'patient_visit_id' => $visit->id,
        ]);

        // Test missing required fields
        $response = $this->postJson("/api/visits/{$visit->id}/complete-with-details", [
            'stock_items' => 'not_an_array', // Should be array
            'payment_status' => 'invalid_status', // Invalid status
        ]);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['stock_items', 'payment_status']);
    }

    /** @test */
    public function visit_completion_validates_stock_items()
    {
        $this->actingAs($this->staff);

        $visit = PatientVisit::factory()->create([
            'status' => 'pending',
            'service_id' => $this->service->id,
        ]);

        Payment::factory()->maya()->paid()->create([
            'patient_visit_id' => $visit->id,
        ]);

        // Test invalid stock item
        $response = $this->postJson("/api/visits/{$visit->id}/complete-with-details", [
            'stock_items' => [
                [
                    'item_id' => 999, // Non-existent item
                    'quantity' => 2,
                    'notes' => 'Test notes'
                ]
            ],
            'dentist_notes' => 'Test notes',
            'findings' => 'Test findings',
            'treatment_plan' => 'Test plan',
            'teeth_treated' => '1,2,3',
            'payment_status' => 'paid',
            'onsite_payment_amount' => null,
            'payment_method_change' => null,
        ]);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['stock_items.0.item_id']);
    }

    /** @test */
    public function visit_completion_handles_empty_stock_items()
    {
        $this->actingAs($this->staff);

        $visit = PatientVisit::factory()->create([
            'status' => 'pending',
            'service_id' => $this->service->id,
        ]);

        Payment::factory()->maya()->paid()->create([
            'patient_visit_id' => $visit->id,
        ]);

        // Test with empty stock items
        $response = $this->postJson("/api/visits/{$visit->id}/complete-with-details", [
            'stock_items' => [],
            'dentist_notes' => 'Test notes',
            'findings' => 'Test findings',
            'treatment_plan' => 'Test plan',
            'teeth_treated' => '1,2,3',
            'payment_status' => 'paid',
            'onsite_payment_amount' => null,
            'payment_method_change' => null,
        ]);

        $response->assertStatus(200);

        $visit->refresh();
        $this->assertEquals('completed', $visit->status);
    }

    /** @test */
    public function visit_completion_requires_authenticated_staff()
    {
        $visit = PatientVisit::factory()->create([
            'status' => 'pending',
            'service_id' => $this->service->id,
        ]);

        Payment::factory()->maya()->paid()->create([
            'patient_visit_id' => $visit->id,
        ]);

        // Test without authentication
        $response = $this->postJson("/api/visits/{$visit->id}/complete-with-details", [
            'stock_items' => [],
            'dentist_notes' => 'Test notes',
            'findings' => 'Test findings',
            'treatment_plan' => 'Test plan',
            'teeth_treated' => '1,2,3',
            'payment_status' => 'paid',
            'onsite_payment_amount' => null,
            'payment_method_change' => null,
        ]);

        $response->assertStatus(401);
    }
}
