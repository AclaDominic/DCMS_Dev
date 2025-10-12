<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Patient;
use App\Models\Service;
use App\Models\PatientVisit;
use App\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PatientVisitControllerTest extends TestCase
{
    use RefreshDatabase;

    protected $staff;

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
    public function staff_can_view_visits_with_payments_relationship()
    {
        $this->actingAs($this->staff);

        // Create a visit with Maya payment
        $visit = PatientVisit::factory()->create([
            'status' => 'pending'
        ]);

        // Create a completed Maya payment for the visit
        $payment = Payment::factory()->maya()->paid()->create([
            'patient_visit_id' => $visit->id,
            'amount_due' => 1500.00,
            'amount_paid' => 1500.00,
        ]);

        $response = $this->getJson('/api/visits');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    '*' => [
                        'id',
                        'patient_id',
                        'service_id',
                        'visit_date',
                        'status',
                        'patient' => [
                            'id',
                            'first_name',
                            'last_name',
                        ],
                        'service' => [
                            'id',
                            'name',
                            'price',
                        ],
                        'payments' => [
                            '*' => [
                                'id',
                                'method',
                                'status',
                                'amount_due',
                                'amount_paid',
                                'paid_at',
                            ]
                        ]
                    ]
                ]);

        // Verify the payment data is included
        $visitData = collect($response->json())->firstWhere('id', $visit->id);
        $this->assertNotNull($visitData);
        $this->assertArrayHasKey('payments', $visitData);
        $this->assertCount(1, $visitData['payments']);
        
        $paymentData = $visitData['payments'][0];
        $this->assertEquals('maya', $paymentData['method']);
        $this->assertEquals('paid', $paymentData['status']);
        $this->assertEquals(1500.00, $paymentData['amount_due']);
        $this->assertEquals(1500.00, $paymentData['amount_paid']);
        $this->assertNotNull($paymentData['paid_at']);
    }

    /** @test */
    public function visit_index_includes_multiple_payment_methods()
    {
        $this->actingAs($this->staff);

        // Create visits with different payment methods
        $mayaVisit = PatientVisit::factory()->create();
        $cashVisit = PatientVisit::factory()->create();
        $hmoVisit = PatientVisit::factory()->create();

        // Create different payment types
        Payment::factory()->maya()->paid()->create([
            'patient_visit_id' => $mayaVisit->id,
        ]);

        Payment::factory()->cash()->paid()->create([
            'patient_visit_id' => $cashVisit->id,
        ]);

        Payment::factory()->hmo()->paid()->create([
            'patient_visit_id' => $hmoVisit->id,
        ]);

        $response = $this->getJson('/api/visits');

        $response->assertStatus(200);

        $visits = $response->json();
        $this->assertCount(3, $visits);

        // Verify each visit has its payment method
        $mayaVisitData = collect($visits)->firstWhere('id', $mayaVisit->id);
        $cashVisitData = collect($visits)->firstWhere('id', $cashVisit->id);
        $hmoVisitData = collect($visits)->firstWhere('id', $hmoVisit->id);

        $this->assertEquals('maya', $mayaVisitData['payments'][0]['method']);
        $this->assertEquals('cash', $cashVisitData['payments'][0]['method']);
        $this->assertEquals('hmo', $hmoVisitData['payments'][0]['method']);
    }

    /** @test */
    public function visit_index_handles_visits_without_payments()
    {
        $this->actingAs($this->staff);

        // Create a visit without any payments
        $visit = PatientVisit::factory()->create();

        $response = $this->getJson('/api/visits');

        $response->assertStatus(200);

        $visitData = collect($response->json())->firstWhere('id', $visit->id);
        $this->assertNotNull($visitData);
        $this->assertArrayHasKey('payments', $visitData);
        $this->assertEmpty($visitData['payments']);
    }

    /** @test */
    public function visit_index_handles_visits_with_multiple_payments()
    {
        $this->actingAs($this->staff);

        // Create a visit with multiple payments (e.g., partial payment scenario)
        $visit = PatientVisit::factory()->create();

        // Create initial Maya payment (failed)
        Payment::factory()->maya()->create([
            'patient_visit_id' => $visit->id,
            'status' => 'failed',
            'amount_due' => 1500.00,
            'amount_paid' => 0,
        ]);

        // Create cash payment to cover the amount
        Payment::factory()->cash()->paid()->create([
            'patient_visit_id' => $visit->id,
            'amount_due' => 1500.00,
            'amount_paid' => 1500.00,
        ]);

        $response = $this->getJson('/api/visits');

        $response->assertStatus(200);

        $visitData = collect($response->json())->firstWhere('id', $visit->id);
        $this->assertCount(2, $visitData['payments']);

        // Verify both payments are included
        $methods = collect($visitData['payments'])->pluck('method')->toArray();
        $this->assertContains('maya', $methods);
        $this->assertContains('cash', $methods);
    }

    /** @test */
    public function visit_index_limits_results_to_50_visits()
    {
        $this->actingAs($this->staff);

        // Create 55 visits
        PatientVisit::factory()->count(55)->create();

        $response = $this->getJson('/api/visits');

        $response->assertStatus(200);
        
        $visits = $response->json();
        $this->assertCount(50, $visits);
    }

    /** @test */
    public function visit_index_orders_by_created_at_desc()
    {
        $this->actingAs($this->staff);

        // Create visits with different timestamps
        $oldVisit = PatientVisit::factory()->create([
            'created_at' => now()->subDays(2)
        ]);
        
        $newVisit = PatientVisit::factory()->create([
            'created_at' => now()->subDay()
        ]);

        $response = $this->getJson('/api/visits');

        $response->assertStatus(200);

        $visits = $response->json();
        $this->assertEquals($newVisit->id, $visits[0]['id']);
        $this->assertEquals($oldVisit->id, $visits[1]['id']);
    }

    /** @test */
    public function non_authenticated_user_cannot_access_visits()
    {
        $response = $this->getJson('/api/visits');

        $response->assertStatus(401);
    }

    /** @test */
    public function patient_user_can_access_visits()
    {
        $patient = User::factory()->create([
            'role' => 'patient',
            'status' => 'activated',
        ]);

        $this->actingAs($patient);

        $response = $this->getJson('/api/visits');

        // Patient users can access visits (device middleware only applies to staff)
        $response->assertStatus(200);
    }

    /** @test */
    public function visit_index_includes_all_required_relationships()
    {
        $this->actingAs($this->staff);

        // Create a complete visit with all relationships
        $visit = PatientVisit::factory()->create();

        $response = $this->getJson('/api/visits');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    '*' => [
                        'id',
                        'patient_id',
                        'service_id',
                        'visit_date',
                        'status',
                        'patient' => [
                            'id',
                            'first_name',
                            'last_name',
                            'contact_number',
                        ],
                        'service' => [
                            'id',
                            'name',
                            'price',
                        ],
                        'visit_notes',
                        'payments' => [
                            '*' => [
                                'id',
                                'method',
                                'status',
                                'amount_due',
                                'amount_paid',
                                'paid_at',
                                'reference_no',
                            ]
                        ]
                    ]
                ]);
    }
}
