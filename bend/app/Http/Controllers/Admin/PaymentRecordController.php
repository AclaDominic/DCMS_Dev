<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\PatientVisit;
use App\Models\Appointment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentRecordController extends Controller
{
    /**
     * Get all paid payment records with search and filters
     */
    public function index(Request $request)
    {
        try {
            $query = Payment::with([
                'patientVisit.patient.user',
                'patientVisit.service',
                'appointment.patient.user',
                'appointment.service'
            ])->where('status', Payment::STATUS_PAID);

            // Search by patient name
            if ($request->has('search') && $request->search) {
                $searchTerm = $request->search;
                $query->where(function ($q) use ($searchTerm) {
                    // Search in patient visit patients
                    $q->whereHas('patientVisit.patient', function ($patientQuery) use ($searchTerm) {
                        $patientQuery->where('first_name', 'LIKE', "%{$searchTerm}%")
                            ->orWhere('last_name', 'LIKE', "%{$searchTerm}%");
                    })
                    // Search in appointment patients
                    ->orWhereHas('appointment.patient', function ($patientQuery) use ($searchTerm) {
                        $patientQuery->where('first_name', 'LIKE', "%{$searchTerm}%")
                            ->orWhere('last_name', 'LIKE', "%{$searchTerm}%");
                    });
                });
            }

            // Filter by appointment date
            if ($request->has('appointment_date') && $request->appointment_date) {
                $query->whereHas('appointment', function ($appointmentQuery) use ($request) {
                    $appointmentQuery->whereDate('date', $request->appointment_date);
                });
            }

            // Filter by visit date
            if ($request->has('visit_date') && $request->visit_date) {
                $query->whereHas('patientVisit', function ($visitQuery) use ($request) {
                    $visitQuery->whereDate('visit_date', $request->visit_date);
                });
            }

            // Order by most recent payments first
            $payments = $query->orderBy('paid_at', 'desc')->paginate(20);

            // Format the response
            $formattedPayments = $payments->map(function ($payment) {
                // Determine if this is from a visit or appointment
                $isVisit = $payment->patient_visit_id !== null;
                
                $patientName = '';
                $serviceName = '';
                $appointmentDate = null;
                $visitDate = null;
                $receiptNumber = '';

                if ($isVisit && $payment->patientVisit) {
                    $patient = $payment->patientVisit->patient;
                    $patientName = $patient ? "{$patient->first_name} {$patient->last_name}" : 'N/A';
                    $serviceName = $payment->patientVisit->service ? $payment->patientVisit->service->name : 'Walk-in Consultation';
                    $visitDate = $payment->patientVisit->visit_date;
                    $receiptNumber = 'VISIT-' . $payment->patientVisit->id;
                    
                    // If visit is linked to appointment, get appointment date
                    if ($payment->patientVisit->appointment_id) {
                        $appointmentDate = $payment->patientVisit->appointment ? $payment->patientVisit->appointment->date : null;
                    }
                } else if ($payment->appointment) {
                    $patient = $payment->appointment->patient;
                    $patientName = $patient ? "{$patient->first_name} {$patient->last_name}" : 'N/A';
                    $serviceName = $payment->appointment->service ? $payment->appointment->service->name : 'N/A';
                    $appointmentDate = $payment->appointment->date;
                    $receiptNumber = $payment->appointment->reference_code;
                }

                return [
                    'id' => $payment->id,
                    'receipt_number' => $receiptNumber,
                    'patient_name' => $patientName,
                    'service_name' => $serviceName,
                    'appointment_date' => $appointmentDate,
                    'visit_date' => $visitDate,
                    'amount_paid' => $payment->amount_paid,
                    'payment_method' => ucfirst($payment->method),
                    'reference_no' => $payment->reference_no,
                    'paid_at' => $payment->paid_at ? $payment->paid_at->format('M d, Y h:i A') : null,
                    'type' => $isVisit ? 'visit' : 'appointment',
                    'visit_id' => $payment->patient_visit_id,
                    'appointment_id' => $payment->appointment_id,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $formattedPayments,
                'pagination' => [
                    'current_page' => $payments->currentPage(),
                    'last_page' => $payments->lastPage(),
                    'per_page' => $payments->perPage(),
                    'total' => $payments->total(),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch payment records', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payment records',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get receipt data for display in modal
     */
    public function getReceiptData(Request $request, $paymentId)
    {
        try {
            $payment = Payment::with([
                'patientVisit.patient.user',
                'patientVisit.service',
                'patientVisit.visitNotes',
                'appointment.patient.user',
                'appointment.service'
            ])->findOrFail($paymentId);

            // Determine if this is from a visit or appointment
            $isVisit = $payment->patient_visit_id !== null;

            if ($isVisit) {
                $receiptData = $this->prepareVisitReceiptData($payment->patientVisit, $payment);
            } else {
                $receiptData = $this->prepareAppointmentReceiptData($payment->appointment, $payment);
            }

            return response()->json([
                'success' => true,
                'data' => $receiptData,
                'type' => $isVisit ? 'visit' : 'appointment'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch receipt data', [
                'payment_id' => $paymentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch receipt data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Prepare receipt data for appointment
     */
    private function prepareAppointmentReceiptData(Appointment $appointment, Payment $payment)
    {
        $patient = $appointment->patient;
        $service = $appointment->service;
        $user = $patient->user;

        // Calculate total amount
        $totalAmount = $appointment->calculateTotalCost();

        return [
            'receipt_type' => 'appointment',
            'receipt_number' => $appointment->reference_code,
            'receipt_date' => now()->format('M d, Y'),
            'receipt_time' => now()->format('h:i A'),
            
            // Clinic information
            'clinic_name' => 'Kreative Dental & Orthodontics',
            'clinic_address' => '123 Dental Street, City, Province 1234',
            'clinic_phone' => '+63 123 456 7890',
            'clinic_email' => 'info@kreativedental.com',
            
            // Patient information
            'patient_name' => $patient->first_name . ' ' . $patient->last_name,
            'patient_email' => $user ? $user->email : null,
            'patient_phone' => $patient->contact_number,
            'patient_address' => $patient->address,
            
            // Service information
            'service_name' => $service->name,
            'service_description' => $service->description,
            'service_date' => $appointment->date ? \Carbon\Carbon::parse($appointment->date)->format('M d, Y') : null,
            'service_time' => $appointment->time_slot,
            'teeth_count' => $appointment->teeth_count,
            'teeth_description' => $appointment->getFormattedTeethCountAttribute(),
            
            // Payment information
            'total_amount' => $totalAmount,
            'total_paid' => $payment->amount_paid,
            'payment_method' => ucfirst($payment->method),
            'payment_status' => 'Paid',
            'payment_details' => [[
                'method' => ucfirst($payment->method),
                'amount' => $payment->amount_paid,
                'reference' => $payment->reference_no,
                'paid_at' => $payment->paid_at ? $payment->paid_at->format('M d, Y h:i A') : null,
                'status' => 'paid'
            ]],
            
            // Additional information
            'notes' => $appointment->notes,
            'appointment_status' => ucfirst($appointment->status),
        ];
    }

    /**
     * Prepare receipt data for visit
     */
    private function prepareVisitReceiptData(PatientVisit $visit, Payment $payment)
    {
        $patient = $visit->patient;
        $service = $visit->service;
        $user = $patient->user;
        $visitNotes = $visit->visitNotes;

        // Calculate total amount
        $totalAmount = $service ? $service->price : 0;

        return [
            'receipt_type' => 'visit',
            'receipt_number' => 'VISIT-' . $visit->id,
            'receipt_date' => now()->format('M d, Y'),
            'receipt_time' => now()->format('h:i A'),
            
            // Clinic information
            'clinic_name' => 'Kreative Dental & Orthodontics',
            'clinic_address' => '123 Dental Street, City, Province 1234',
            'clinic_phone' => '+63 123 456 7890',
            'clinic_email' => 'info@kreativedental.com',
            
            // Patient information
            'patient_name' => $patient->first_name . ' ' . $patient->last_name,
            'patient_email' => $user ? $user->email : null,
            'patient_phone' => $patient->contact_number,
            'patient_address' => $patient->address,
            
            // Service information
            'service_name' => $service ? $service->name : 'Walk-in Consultation',
            'service_description' => $service ? $service->description : null,
            'visit_date' => $visit->visit_date ? \Carbon\Carbon::parse($visit->visit_date)->format('M d, Y') : null,
            'start_time' => $visit->start_time ? $visit->start_time->format('h:i A') : null,
            'end_time' => $visit->end_time ? $visit->end_time->format('h:i A') : null,
            'teeth_treated' => $visitNotes ? $visitNotes->teeth_treated : null,
            
            // Payment information
            'total_amount' => $totalAmount,
            'total_paid' => $payment->amount_paid,
            'payment_details' => [[
                'method' => ucfirst($payment->method),
                'amount' => $payment->amount_paid,
                'reference' => $payment->reference_no,
                'paid_at' => $payment->paid_at ? $payment->paid_at->format('M d, Y h:i A') : null,
                'status' => 'paid'
            ]],
            
            // Additional information
            'visit_status' => ucfirst($visit->status),
            'has_notes' => $visitNotes ? true : false,
        ];
    }
}

