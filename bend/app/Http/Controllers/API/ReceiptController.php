<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\PatientVisit;
use App\Services\ReceiptService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ReceiptController extends Controller
{
    protected $receiptService;

    public function __construct(ReceiptService $receiptService)
    {
        $this->receiptService = $receiptService;
    }

    /**
     * Generate receipt for an appointment
     */
    public function generateAppointmentReceipt(Request $request, $appointmentId)
    {
        try {
            $appointment = Appointment::with([
                'patient.user',
                'service',
                'payments',
                'patient.hmos'
            ])->findOrFail($appointmentId);

            // Ensure all required relationships are loaded
            if (!$appointment->patient) {
                return response()->json(['message' => 'Patient not found for this appointment'], 404);
            }
            
            if (!$appointment->service) {
                return response()->json(['message' => 'Service not found for this appointment'], 404);
            }

            // Check if user has access to this appointment
            $user = Auth::user();
            if ($user->role === 'patient') {
                $patient = $user->patient;
                if (!$patient || $appointment->patient_id !== $patient->id) {
                    return response()->json(['message' => 'Unauthorized access to this appointment'], 403);
                }
            }

            // Only generate receipt for completed appointments with paid status
            if ($appointment->status !== 'completed' || $appointment->payment_status !== 'paid') {
                return response()->json([
                    'message' => 'Receipt can only be generated for completed and paid appointments'
                ], 422);
            }

            $pdf = $this->receiptService->generateAppointmentReceipt($appointment);
            
            return response($pdf, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="receipt-' . $appointment->reference_code . '.pdf"'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to generate appointment receipt', [
                'appointment_id' => $appointmentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Failed to generate receipt',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate receipt for a patient visit
     */
    public function generateVisitReceipt(Request $request, $visitId)
    {
        try {
            $visit = PatientVisit::with([
                'patient.user',
                'service',
                'payments',
                'patient.hmos',
                'visitNotes',
                'additionalCharges.inventoryItem'
            ])->findOrFail($visitId);

            // Check if user has access to this visit
            $user = Auth::user();
            if ($user->role === 'patient') {
                $patient = $user->patient;
                if (!$patient || $visit->patient_id !== $patient->id) {
                    return response()->json(['message' => 'Unauthorized access to this visit'], 403);
                }
            }

            // Only generate receipt for completed visits
            if ($visit->status !== 'completed') {
                return response()->json([
                    'message' => 'Receipt can only be generated for completed visits'
                ], 422);
            }

            $pdf = $this->receiptService->generateVisitReceipt($visit);
            
            return response($pdf, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="receipt-visit-' . $visit->id . '.pdf"'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to generate visit receipt', [
                'visit_id' => $visitId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Failed to generate receipt',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send receipt via email
     */
    public function sendReceiptEmail(Request $request, $appointmentId)
    {
        try {
            $appointment = Appointment::with([
                'patient.user',
                'service',
                'payments',
                'patient.hmos'
            ])->findOrFail($appointmentId);

            // Check if user has access to this appointment
            $user = Auth::user();
            if ($user->role === 'patient') {
                $patient = $user->patient;
                if (!$patient || $appointment->patient_id !== $patient->id) {
                    return response()->json(['message' => 'Unauthorized access to this appointment'], 403);
                }
            }

            // Only send receipt for completed appointments with paid status
            if ($appointment->status !== 'completed' || $appointment->payment_status !== 'paid') {
                return response()->json([
                    'message' => 'Receipt can only be sent for completed and paid appointments'
                ], 422);
            }

            // Check if patient is linked to a user with email
            if (!$appointment->patient->user || !$appointment->patient->user->email) {
                return response()->json([
                    'message' => 'Patient must be linked to a user account with email to receive receipt'
                ], 422);
            }

            $result = $this->receiptService->sendReceiptEmail($appointment);
            
            if ($result === false) {
                return response()->json([
                    'message' => 'Receipt email skipped (seeded data)',
                    'email' => $appointment->patient->user->email,
                    'note' => 'Email sending is disabled for test data to prevent sandbox flooding'
                ]);
            }
            
            return response()->json([
                'message' => 'Receipt sent successfully',
                'email' => $appointment->patient->user->email
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to send receipt email', [
                'appointment_id' => $appointmentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Failed to send receipt email',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send visit receipt via email
     */
    public function sendVisitReceiptEmail(Request $request, $visitId)
    {
        try {
            $visit = PatientVisit::with([
                'patient.user',
                'service',
                'payments',
                'patient.hmos',
                'visitNotes',
                'additionalCharges.inventoryItem'
            ])->findOrFail($visitId);

            // Check if user has access to this visit
            $user = Auth::user();
            if ($user->role === 'patient') {
                $patient = $user->patient;
                if (!$patient || $visit->patient_id !== $patient->id) {
                    return response()->json(['message' => 'Unauthorized access to this visit'], 403);
                }
            }

            // Only send receipt for completed visits
            if ($visit->status !== 'completed') {
                return response()->json([
                    'message' => 'Receipt can only be sent for completed visits'
                ], 422);
            }

            // Check if patient is linked to a user with email
            if (!$visit->patient->user || !$visit->patient->user->email) {
                return response()->json([
                    'message' => 'Patient must be linked to a user account with email to receive receipt'
                ], 422);
            }

            $result = $this->receiptService->sendVisitReceiptEmail($visit);
            
            if ($result === false) {
                return response()->json([
                    'message' => 'Receipt email skipped (seeded data)',
                    'email' => $visit->patient->user->email,
                    'note' => 'Email sending is disabled for test data to prevent sandbox flooding'
                ]);
            }
            
            return response()->json([
                'message' => 'Receipt sent successfully',
                'email' => $visit->patient->user->email
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to send visit receipt email', [
                'visit_id' => $visitId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Failed to send receipt email',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
