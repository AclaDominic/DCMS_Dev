<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Patient;
use App\Models\Appointment;
use App\Models\PatientVisit;
use App\Models\PatientMedicalHistory;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class MedicalHistoryFlowTest extends TestCase
{
    use RefreshDatabase;

    protected User $staffUser;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create staff user for authentication
        $this->staffUser = User::factory()->create([
            'role' => 'staff',
            'status' => 'activated',
        ]);
    }

    /** @test */
    public function appointment_visit_requires_medical_history_before_visit_code()
    {
        $this->actingAs($this->staffUser);

        // Create test data
        $service = Service::factory()->create();
        $patient = Patient::factory()->create([
            'first_name' => 'John',
            'last_name' => 'Doe',
            'sex' => 'male',
            'birthdate' => '1990-01-15',
            'address' => '123 Test St',
            'contact_number' => '09123456789',
        ]);

        // Create an approved appointment with reference code
        $appointment = Appointment::factory()->create([
            'patient_id' => $patient->id,
            'service_id' => $service->id,
            'status' => 'approved',
            'reference_code' => 'TEST1234',
        ]);

        // Test 1: Create visit from appointment (should NOT have visit_code yet)
        $response = $this->postJson('/api/visits', [
            'visit_type' => 'appointment',
            'reference_code' => 'TEST1234',
        ]);

        $response->assertStatus(201);
        $visitData = $response->json();
        
        // Verify response structure
        $this->assertArrayHasKey('visit', $visitData);
        $this->assertArrayHasKey('requires_medical_history', $visitData);
        $this->assertArrayHasKey('message', $visitData);
        $this->assertTrue($visitData['requires_medical_history']);
        $this->assertNull($visitData['visit']['visit_code']);
        $this->assertEquals('pending', $visitData['visit']['medical_history_status']);

        $visitId = $visitData['visit']['id'];

        // Test 2: Get medical history form (should return pre-filled data)
        $formResponse = $this->getJson("/api/visits/{$visitId}/medical-history-form");
        
        $formResponse->assertStatus(200);
        $formData = $formResponse->json();
        
        // Verify response structure
        $this->assertArrayHasKey('form_data', $formData);
        $this->assertArrayHasKey('visit', $formData);
        $this->assertArrayHasKey('patient', $formData);
        $this->assertArrayHasKey('previous_history_exists', $formData);
        $this->assertArrayHasKey('requires_medical_history', $formData);
        $this->assertArrayHasKey('message', $formData);
        
        // Verify pre-filled data from patient record
        $this->assertEquals('John Doe', $formData['form_data']['full_name']);
        $this->assertEquals('male', $formData['form_data']['sex']);
        $this->assertEquals('123 Test St', $formData['form_data']['address']);
        $this->assertFalse($formData['previous_history_exists']); // First time, no previous history

        // Test 3: Submit medical history
        $submitResponse = $this->postJson("/api/visits/{$visitId}/medical-history", [
            'full_name' => 'John Doe',
            'age' => 34,
            'sex' => 'male',
            'address' => '123 Test St',
            'contact_number' => '09123456789',
            'occupation' => 'Engineer',
            'date_of_birth' => '1990-01-15',
            'in_good_health' => true,
            'taking_medications' => false,
            'allergic_penicillin' => true,
            'diabetes' => false,
            'blood_type' => 'O+',
        ]);

        $submitResponse->assertStatus(200);
        $submitData = $submitResponse->json();
        
        // Verify response structure
        $this->assertArrayHasKey('visit', $submitData);
        $this->assertArrayHasKey('medical_history', $submitData);
        $this->assertArrayHasKey('message', $submitData);
        
        // Verify visit code was generated
        $this->assertNotNull($submitData['visit']['visit_code']);
        $this->assertEquals('completed', $submitData['visit']['medical_history_status']);
        $this->assertEquals(6, strlen($submitData['visit']['visit_code'])); // Should be 6 characters

        // Verify medical history was saved
        $medicalHistory = PatientMedicalHistory::where('patient_visit_id', $visitId)->first();
        $this->assertNotNull($medicalHistory);
        $this->assertEquals('John Doe', $medicalHistory->full_name);
        $this->assertEquals(true, $medicalHistory->allergic_penicillin);
        $this->assertEquals('O+', $medicalHistory->blood_type);

        // Test 4: Get completed medical history
        $getHistoryResponse = $this->getJson("/api/visits/{$visitId}/medical-history");
        $getHistoryResponse->assertStatus(200);
        $historyData = $getHistoryResponse->json();
        
        $this->assertArrayHasKey('medical_history', $historyData);
        $this->assertArrayHasKey('visit', $historyData);
        $this->assertArrayHasKey('requires_medical_history', $historyData);
        $this->assertNotNull($historyData['medical_history']);
        $this->assertFalse($historyData['requires_medical_history']);
    }

    /** @test */
    public function form_prefills_from_previous_medical_history()
    {
        $this->actingAs($this->staffUser);

        $service = Service::factory()->create();
        $patient = Patient::factory()->create([
            'first_name' => 'Jane',
            'last_name' => 'Smith',
            'sex' => 'female',
            'birthdate' => '1985-05-20',
        ]);

        // Create first visit and complete medical history
        $appointment1 = Appointment::factory()->create([
            'patient_id' => $patient->id,
            'service_id' => $service->id,
            'status' => 'approved',
            'reference_code' => 'FIRST12',
        ]);

        $visit1Response = $this->postJson('/api/visits', [
            'visit_type' => 'appointment',
            'reference_code' => 'FIRST12',
        ]);

        $visit1Id = $visit1Response->json()['visit']['id'];

        // Submit first medical history
        $this->postJson("/api/visits/{$visit1Id}/medical-history", [
            'full_name' => 'Jane Smith',
            'age' => 39,
            'sex' => 'female',
            'occupation' => 'Doctor',
            'allergic_latex' => true,
            'diabetes' => true,
            'blood_type' => 'A-',
        ]);

        // Create second visit for same patient
        $appointment2 = Appointment::factory()->create([
            'patient_id' => $patient->id,
            'service_id' => $service->id,
            'status' => 'approved',
            'reference_code' => 'SECOND3',
        ]);

        $visit2Response = $this->postJson('/api/visits', [
            'visit_type' => 'appointment',
            'reference_code' => 'SECOND3',
        ]);

        $visit2Id = $visit2Response->json()['visit']['id'];

        // Get form for second visit - should pre-fill from first visit
        $formResponse = $this->getJson("/api/visits/{$visit2Id}/medical-history-form");
        $formData = $formResponse->json();
        
        $this->assertTrue($formData['previous_history_exists']);
        $this->assertEquals('Jane Smith', $formData['form_data']['full_name']);
        $this->assertEquals('Doctor', $formData['form_data']['occupation']); // Pre-filled from previous
        $this->assertEquals(true, $formData['form_data']['allergic_latex']); // Pre-filled allergies
        $this->assertEquals(true, $formData['form_data']['diabetes']); // Pre-filled conditions
        $this->assertEquals('A-', $formData['form_data']['blood_type']); // Pre-filled blood type
    }
}
