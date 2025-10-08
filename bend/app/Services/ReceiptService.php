<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\PatientVisit;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ReceiptService
{
    /**
     * Generate PDF receipt for an appointment
     */
    public function generateAppointmentReceipt(Appointment $appointment)
    {
        $data = $this->prepareAppointmentData($appointment);
        
        $pdf = Pdf::loadView('receipts.appointment', $data)
            ->setPaper('a4', 'portrait')
            ->setOptions([
                'defaultFont' => 'DejaVu Sans',
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => true,
                'isPhpEnabled' => true
            ]);

        return $pdf->output();
    }

    /**
     * Generate PDF receipt for a patient visit
     */
    public function generateVisitReceipt(PatientVisit $visit)
    {
        $data = $this->prepareVisitData($visit);
        
        $pdf = Pdf::loadView('receipts.visit', $data)
            ->setPaper('a4', 'portrait')
            ->setOptions([
                'defaultFont' => 'DejaVu Sans',
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => true,
                'isPhpEnabled' => true
            ]);

        return $pdf->output();
    }

    /**
     * Send appointment receipt via email
     */
    public function sendReceiptEmail(Appointment $appointment)
    {
        // Don't send emails for seeded data to prevent sandbox flooding
        if ($appointment->is_seeded) {
            Log::info('Skipping email for seeded appointment', [
                'appointment_id' => $appointment->id,
                'reason' => 'Seeded data - email sending disabled'
            ]);
            return false;
        }

        $data = $this->prepareAppointmentData($appointment);
        
        $pdf = Pdf::loadView('receipts.appointment', $data)
            ->setPaper('a4', 'portrait')
            ->setOptions([
                'defaultFont' => 'DejaVu Sans',
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => true,
                'isPhpEnabled' => true
            ]);

        $pdfContent = $pdf->output();
        $filename = 'receipt-' . $appointment->reference_code . '.pdf';

        // Store PDF temporarily
        $tempPath = 'temp/receipts/' . $filename;
        Storage::put($tempPath, $pdfContent);

        try {
            Mail::send('emails.receipt', $data, function ($message) use ($appointment, $tempPath, $filename) {
                $message->to($appointment->patient->user->email)
                        ->subject('Your Receipt - Kreative Dental & Orthodontics')
                        ->attach(Storage::path($tempPath), [
                            'as' => $filename,
                            'mime' => 'application/pdf'
                        ]);
            });

            // Clean up temporary file
            Storage::delete($tempPath);

            // Update appointment with receipt tracking
            $appointment->update([
                'receipt_sent_at' => now(),
                'receipt_sent_to' => $appointment->patient->user->email
            ]);

            Log::info('Receipt email sent successfully', [
                'appointment_id' => $appointment->id,
                'patient_email' => $appointment->patient->user->email
            ]);

            return true;

        } catch (\Exception $e) {
            // Clean up temporary file on error
            if (Storage::exists($tempPath)) {
                Storage::delete($tempPath);
            }
            throw $e;
        }
    }

    /**
     * Send visit receipt via email
     */
    public function sendVisitReceiptEmail(PatientVisit $visit)
    {
        // Don't send emails for seeded data to prevent sandbox flooding
        if ($visit->is_seeded) {
            Log::info('Skipping email for seeded visit', [
                'visit_id' => $visit->id,
                'reason' => 'Seeded data - email sending disabled'
            ]);
            return false;
        }

        $data = $this->prepareVisitData($visit);
        
        $pdf = Pdf::loadView('receipts.visit', $data)
            ->setPaper('a4', 'portrait')
            ->setOptions([
                'defaultFont' => 'DejaVu Sans',
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => true,
                'isPhpEnabled' => true
            ]);

        $pdfContent = $pdf->output();
        $filename = 'receipt-visit-' . $visit->id . '.pdf';

        // Store PDF temporarily
        $tempPath = 'temp/receipts/' . $filename;
        Storage::put($tempPath, $pdfContent);

        try {
            Mail::send('emails.receipt', $data, function ($message) use ($visit, $tempPath, $filename) {
                $message->to($visit->patient->user->email)
                        ->subject('Your Receipt - Kreative Dental & Orthodontics')
                        ->attach(Storage::path($tempPath), [
                            'as' => $filename,
                            'mime' => 'application/pdf'
                        ]);
            });

            // Clean up temporary file
            Storage::delete($tempPath);

            // Update visit with receipt tracking
            $visit->update([
                'receipt_sent_at' => now(),
                'receipt_sent_to' => $visit->patient->user->email
            ]);

            Log::info('Visit receipt email sent successfully', [
                'visit_id' => $visit->id,
                'patient_email' => $visit->patient->user->email
            ]);

            return true;

        } catch (\Exception $e) {
            // Clean up temporary file on error
            if (Storage::exists($tempPath)) {
                Storage::delete($tempPath);
            }
            throw $e;
        }
    }

    /**
     * Prepare data for appointment receipt
     */
    private function prepareAppointmentData(Appointment $appointment)
    {
        $patient = $appointment->patient;
        $service = $appointment->service;
        $payments = $appointment->payments;
        $user = $patient->user;

        // Debug logging to identify payment data issues
        Log::info('Receipt generation debug', [
            'appointment_id' => $appointment->id,
            'payment_status' => $appointment->payment_status,
            'payments_count' => $payments->count(),
            'payments_data' => $payments->toArray(),
        ]);

        // Calculate total amount
        $totalAmount = $appointment->calculateTotalCost();
        $totalPaid = $payments->sum('amount_paid');

        // Handle case where payment_status is 'paid' but no Payment records exist
        // This can happen with manual status updates, cash payments, or HMO coverage
        if ($appointment->payment_status === 'paid' && $payments->isEmpty()) {
            // Create a synthetic payment record for display purposes
            $paymentDetails = collect([[
                'method' => ucfirst($appointment->payment_method ?? 'cash'),
                'amount' => $totalAmount,
                'reference' => 'SYNTHETIC-' . $appointment->reference_code,
                'paid_at' => $appointment->updated_at ? $appointment->updated_at->format('M d, Y h:i A') : 'N/A',
                'status' => 'paid'
            ]]);
            $totalPaid = $totalAmount; // Set total paid to match total amount
        } else {
            // Get payment details from actual Payment records
            $paymentDetails = $payments->map(function ($payment) {
                return [
                    'method' => ucfirst($payment->method),
                    'amount' => $payment->amount_paid,
                    'reference' => $payment->reference_no,
                    'paid_at' => $payment->paid_at ? $payment->paid_at->format('M d, Y h:i A') : null,
                    'status' => $payment->status
                ];
            });
        }

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
            'total_paid' => $totalPaid,
            'payment_method' => ucfirst($appointment->payment_method),
            'payment_status' => ucfirst(str_replace('_', ' ', $appointment->payment_status)),
            'payment_details' => $paymentDetails,
            
            // Additional information
            'notes' => $appointment->notes,
            'appointment_status' => ucfirst($appointment->status),
        ];
    }

    /**
     * Prepare data for visit receipt
     */
    private function prepareVisitData(PatientVisit $visit)
    {
        $patient = $visit->patient;
        $service = $visit->service;
        $payments = $visit->payments;
        $user = $patient->user;
        $visitNotes = $visit->visitNotes;

        // Debug logging to identify payment data issues
        Log::info('Visit receipt generation debug', [
            'visit_id' => $visit->id,
            'visit_status' => $visit->status,
            'payments_count' => $payments->count(),
            'payments_data' => $payments->toArray(),
        ]);

        // Calculate total amount
        $totalAmount = $service ? $service->price : 0;
        $totalPaid = $payments->sum('amount_paid');

        // Handle case where visit is completed but no Payment records exist
        // This can happen with manual status updates, cash payments, or HMO coverage
        if ($visit->status === 'completed' && $payments->isEmpty()) {
            // Create a synthetic payment record for display purposes
            $paymentDetails = collect([[
                'method' => 'Cash', // Default to cash for visits without payment records
                'amount' => $totalAmount,
                'reference' => 'SYNTHETIC-VISIT-' . $visit->id,
                'paid_at' => $visit->updated_at ? $visit->updated_at->format('M d, Y h:i A') : 'N/A',
                'status' => 'paid'
            ]]);
            $totalPaid = $totalAmount; // Set total paid to match total amount
        } else {
            // Get payment details from actual Payment records
            $paymentDetails = $payments->map(function ($payment) {
                return [
                    'method' => ucfirst($payment->method),
                    'amount' => $payment->amount_paid,
                    'reference' => $payment->reference_no,
                    'paid_at' => $payment->paid_at ? $payment->paid_at->format('M d, Y h:i A') : null,
                    'status' => $payment->status
                ];
            });
        }

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
            'total_paid' => $totalPaid,
            'payment_details' => $paymentDetails,
            
            // Additional information
            'visit_status' => ucfirst($visit->status),
            'has_notes' => $visitNotes ? true : false,
        ];
    }
}
