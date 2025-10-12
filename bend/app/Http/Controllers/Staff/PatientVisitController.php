<?php

namespace App\Http\Controllers\Staff;

use App\Models\Patient;
use App\Models\Payment;
use App\Models\SystemLog;
use App\Models\Appointment;
use App\Models\VisitNote;
use Illuminate\Support\Str;
use App\Models\PatientVisit;
use Illuminate\Http\Request;
use App\Models\InventoryItem;
use Illuminate\Support\Carbon;
use App\Models\InventoryMovement;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use App\Models\DentistSchedule;
use App\Models\Notification;
use App\Models\NotificationTarget;


class PatientVisitController extends Controller
{
    // 🟢 List visits (e.g. for tracker)
    public function index()
    {
        // First, let's check if there are any visits with null start_time
        $nullStartTimeVisits = PatientVisit::whereNull('start_time')->count();
        Log::info('🔍 INDEX: Found ' . $nullStartTimeVisits . ' visits with null start_time');
        
        // Check total visits count
        $totalVisits = PatientVisit::count();
        Log::info('🔍 INDEX: Total visits in database: ' . $totalVisits);
        
        $visits = PatientVisit::with(['patient', 'service', 'visitNotes', 'payments'])
            ->orderBy('created_at', 'desc')
            ->take(50)
            ->get();
        
        Log::info('🔍 INDEX: Returning ' . $visits->count() . ' visits from index method');
        Log::info('🔍 INDEX: Latest created_at in results: ' . ($visits->first()?->created_at ?? 'null'));
        
        foreach ($visits as $visit) {
            Log::info('📋 INDEX: Visit ID: ' . $visit->id . ', Status: ' . $visit->status . ', Patient: ' . $visit->patient?->first_name . ' ' . $visit->patient?->last_name . ', Start Time: ' . $visit->start_time . ', Patient ID: ' . $visit->patient_id);
        }

        return response()->json($visits);
    }

    // 🟢 Create a new patient visit (start timer)
    public function store(Request $request)
    {
        $visitType = $request->input('visit_type');
        Log::info('🚀 STORE: Creating visit with type: ' . $visitType);

        if ($visitType === 'walkin') {
            return DB::transaction(function () {
                // ✅ Create placeholder patient
                $patient = Patient::create([
                    'first_name' => 'Patient',
                    'last_name' => strtoupper(Str::random(6)),
                    'user_id' => null,
                ]);
                Log::info('👤 STORE: Created patient with ID: ' . $patient->id . ', Name: ' . $patient->first_name . ' ' . $patient->last_name);

                // ✅ Create the visit
                $startTime = now();
                $visit = PatientVisit::create([
                    'patient_id' => $patient->id,
                    'service_id' => null, // to be selected later
                    'visit_date' => now()->toDateString(),
                    'start_time' => $startTime,
                    'status' => 'pending',
                    'visit_code' => PatientVisit::generateVisitCode(),
                ]);
                Log::info('✅ STORE: Created visit with ID: ' . $visit->id . ', status: ' . $visit->status . ', patient_id: ' . $visit->patient_id . ', visit_code: ' . $visit->visit_code . ', start_time: ' . $visit->start_time . ', created_at: ' . $visit->created_at);

                // Load the visit with relationships before returning
                $visit->load(['patient', 'service', 'visitNotes']);
                
                return response()->json($visit, 201);
            });
        } elseif ($visitType === 'appointment') {
            $data = $request->validate([
                'reference_code' => ['required', 'string', 'size:8'],
            ]);

            $code = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $data['reference_code']));

            $appointment = Appointment::with(['patient', 'service'])
                ->whereRaw('UPPER(reference_code) = ?', [$code])
                ->where('status', 'approved')
                // ->whereDate('date', now()->toDateString()) // re-enable if you want “today only”
                ->first();

            if (!$appointment) {
                return response()->json(['message' => 'Invalid or unavailable reference code.'], 422);
            }

            // Create the visit
            $visit = PatientVisit::create([
                'patient_id' => $appointment->patient_id,
                'service_id' => $appointment->service_id,
                'visit_date' => now()->toDateString(),
                'start_time' => now(),
                'status' => 'pending',
                'visit_code' => PatientVisit::generateVisitCode(),
            ]);

            // Prevent code reuse (recommended)
            $appointment->reference_code = null;
            $appointment->save();

            return response()->json($visit, 201);
        }

        return response()->json(['message' => 'Invalid visit type.'], 422);
    }

    // 🟡 Update visit details (e.g. service selection)
    public function updatePatient(Request $request, $id)
    {
        $visit = PatientVisit::findOrFail($id);
        $patient = $visit->patient;

        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'contact_number' => 'nullable|string|max:20',
            'service_id' => 'nullable|exists:services,id',
        ]);

        $patient->update([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'contact_number' => $validated['contact_number'],
        ]);

        $visit->update([
            'service_id' => $validated['service_id'],
        ]);

        // Optional audit log (can be saved into a `visit_logs` table or something)
        // \Log::info("Patient visit #{$visit->id} updated by staff", [
        //     'edited_fields' => $validated,
        //     'edited_by' => auth()->user()->id
        // ]);

        return response()->json(['message' => 'Patient updated']);
    }



    // 🟡 Mark a visit as finished (end timer)
    public function finish($id)
    {
        $visit = PatientVisit::findOrFail($id);

        if ($visit->status !== 'pending') {
            return response()->json(['message' => 'Only pending visits can be processed.'], 422);
        }

        $visit->update([
            'end_time' => now(),
            'status' => 'completed',
            'visit_code' => null, // Clear the code to make it unusable
        ]);

        return response()->json(['message' => 'Visit completed.']);
    }

    /**
     * POST /api/visits/{id}/complete-with-details
     * Complete visit with stock consumption, encrypted notes, and payment verification
     */
    public function completeWithDetails(Request $request, $id)
    {
        $visit = PatientVisit::with(['patient', 'service', 'payments', 'visitNotes'])->findOrFail($id);

        if ($visit->status !== 'pending') {
            return response()->json(['message' => 'Only pending visits can be completed.'], 422);
        }

        $validated = $request->validate([
            'stock_items' => ['required', 'array'],
            'stock_items.*.item_id' => ['required', 'exists:inventory_items,id'],
            'stock_items.*.quantity' => ['required', 'numeric', 'min:0.001'],
            'stock_items.*.notes' => ['nullable', 'string'],
            'dentist_notes' => ['nullable', 'string', 'max:2000'],
            'findings' => ['nullable', 'string', 'max:2000'],
            'treatment_plan' => ['nullable', 'string', 'max:2000'],
            'teeth_treated' => ['nullable', 'string', 'max:200'],
            'payment_status' => ['required', 'in:paid,hmo_fully_covered,partial,unpaid'],
            'onsite_payment_amount' => ['nullable', 'numeric', 'min:0'],
            'payment_method_change' => ['nullable', 'in:maya_to_cash'],
        ]);

        $userId = $request->user()->id;
        return DB::transaction(function () use ($visit, $validated, $userId) {
            // 1. Consume stock items and update batch quantities
            foreach ($validated['stock_items'] as $item) {
                $inventoryItem = InventoryItem::with([
                    'batches' => function ($q) {
                        $q->where('qty_on_hand', '>', 0)
                            ->orderByRaw('CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END')
                            ->orderBy('expiry_date', 'asc')
                            ->orderBy('received_at', 'asc')
                            ->lockForUpdate();
                    }
                ])->findOrFail($item['item_id']);

                $totalOnHand = (float) $inventoryItem->batches->sum('qty_on_hand');
                if ((float) $item['quantity'] > $totalOnHand) {
                    throw new \Exception("Insufficient stock for {$inventoryItem->name}. Requested {$item['quantity']} but only {$totalOnHand} available.");
                }

                $remaining = (float) $item['quantity'];
                foreach ($inventoryItem->batches as $batch) {
                    if ($remaining <= 0)
                        break;

                    $take = min($remaining, (float) $batch->qty_on_hand);
                    $batch->qty_on_hand = (float) $batch->qty_on_hand - $take;
                    $batch->save();

                    InventoryMovement::create([
                        'item_id' => $item['item_id'],
                        'batch_id' => $batch->id,
                        'type' => 'consume',
                        'quantity' => $take,
                        'ref_type' => 'visit',
                        'ref_id' => $visit->id,
                        'user_id' => $userId,
                        'notes' => $item['notes'] ?? null,
                    ]);

                    $remaining -= $take;
                }

                // Check for low stock threshold after consumption
                $inventoryItem->refresh();
                if ($inventoryItem->low_stock_threshold > 0) {
                    $total = (float) $inventoryItem->batches()->sum('qty_on_hand');
                    if ($total <= (float) $inventoryItem->low_stock_threshold) {
                        \App\Services\NotificationService::notifyLowStock($inventoryItem, $total);
                    }
                }
            }

            // 2. Create or update encrypted visit notes
            if ($visit->visitNotes) {
                // Update existing notes
                $visit->visitNotes->update([
                    'dentist_notes_encrypted' => $validated['dentist_notes'] ?? $visit->visitNotes->dentist_notes_encrypted,
                    'findings_encrypted' => $validated['findings'] ?? $visit->visitNotes->findings_encrypted,
                    'treatment_plan_encrypted' => $validated['treatment_plan'] ?? $visit->visitNotes->treatment_plan_encrypted,
                    'teeth_treated' => $validated['teeth_treated'] ?? $visit->visitNotes->teeth_treated,
                    'updated_by' => $userId,
                ]);
            } else {
                // Create new notes
                $visit->visitNotes()->create([
                    'dentist_notes_encrypted' => $validated['dentist_notes'] ?? null,
                    'findings_encrypted' => $validated['findings'] ?? null,
                    'treatment_plan_encrypted' => $validated['treatment_plan'] ?? null,
                    'teeth_treated' => $validated['teeth_treated'] ?? null,
                    'created_by' => $userId,
                ]);
            }

            // 3. Update visit status
            $visit->update([
                'end_time' => now(),
                'status' => 'completed',
            ]);

            // 4. Handle payment verification/adjustment
            $totalPaid = $visit->payments->sum('amount_paid');
            $servicePrice = $visit->service?->price ?? 0;

            if ($validated['payment_status'] === 'paid') {
                // If already fully paid, no action needed
                // If not fully paid, create a cash payment to cover the balance
                if ($totalPaid < $servicePrice) {
                    $balance = $servicePrice - $totalPaid;
                    Payment::create([
                        'patient_visit_id' => $visit->id,
                        'amount_due' => $balance,
                        'amount_paid' => $balance,
                        'method' => 'cash',
                        'status' => 'paid',
                        'reference_no' => 'CASH-' . $visit->id . '-' . time(),
                        'created_by' => $userId,
                        'paid_at' => now(),
                    ]);
                }
            } elseif ($validated['payment_status'] === 'hmo_fully_covered') {
                // HMO fully covered - create HMO payment record
                Payment::create([
                    'patient_visit_id' => $visit->id,
                    'amount_due' => $servicePrice,
                    'amount_paid' => $servicePrice,
                    'method' => 'hmo',
                    'status' => 'paid',
                    'reference_no' => 'HMO-' . $visit->id . '-' . time(),
                    'created_by' => $userId,
                    'paid_at' => now(),
                ]);
            } elseif ($validated['payment_status'] === 'partial' && isset($validated['onsite_payment_amount'])) {
                // Add on-site payment
                Payment::create([
                    'patient_visit_id' => $visit->id,
                    'amount_due' => $validated['onsite_payment_amount'],
                    'amount_paid' => $validated['onsite_payment_amount'],
                    'method' => 'cash',
                    'status' => 'paid',
                    'reference_no' => 'CASH-' . $visit->id . '-' . time(),
                    'created_by' => $userId,
                    'paid_at' => now(),
                ]);
            } elseif ($validated['payment_status'] === 'unpaid' && isset($validated['payment_method_change'])) {
                // Change Maya to cash payment
                $mayaPayment = $visit->payments->where('method', 'maya')->first();
                if ($mayaPayment) {
                    $mayaPayment->update([
                        'method' => 'cash',
                        'status' => 'paid',
                        'amount_paid' => $mayaPayment->amount_due,
                        'paid_at' => now(),
                    ]);
                }
            }

            // 4) Update appointment.payment_status based on the processed visit payment_status
            // Map visit payment status -> appointment's simple enum
            $appointmentPaymentStatus = match ($validated['payment_status']) {
                'paid', 'hmo_fully_covered', 'partial' => 'paid', // any payment -> paid
                'unpaid' => 'unpaid',
                default => 'unpaid',
            };

            // Find and update matching appointments
            $matchingAppointments = Appointment::where('patient_id', $visit->patient_id)
                ->where('service_id', $visit->service_id)
                ->whereDate('date', $visit->visit_date)
                ->whereIn('status', ['approved', 'completed'])
                ->get();

            Log::info('Updating appointment payment status', [
                'visit_id' => $visit->id,
                'patient_id' => $visit->patient_id,
                'service_id' => $visit->service_id,
                'visit_date' => $visit->visit_date,
                'payment_status' => $validated['payment_status'],
                'appointment_payment_status' => $appointmentPaymentStatus,
                'matching_appointments_count' => $matchingAppointments->count()
            ]);

            foreach ($matchingAppointments as $appointment) {
                $oldStatus = $appointment->payment_status;
                $appointment->update(['payment_status' => $appointmentPaymentStatus]);
                
                Log::info('Appointment payment status updated', [
                    'appointment_id' => $appointment->id,
                    'old_status' => $oldStatus,
                    'new_status' => $appointmentPaymentStatus
                ]);
            }


            return response()->json([
                'message' => 'Visit completed successfully',
                'visit' => $visit->fresh(['patient', 'service', 'payments']),
            ]);
        });
    }

    // 🔴 Reject visit
    public function reject($id, Request $request)
    {
        $visit = PatientVisit::findOrFail($id);

        if ($visit->status !== 'pending') {
            return response()->json(['message' => 'Only pending visits can be processed.'], 422);
        }

        $reason = $request->input('reason');
        $status = $reason === 'inquiry_only' ? 'inquiry' : 'rejected';

        $visit->update([
            'end_time' => now(),
            'status' => $status,
            'note' => $this->buildRejectionNote($request),
            'visit_code' => null, // Clear the code to make it unusable
        ]);

        $message = $status === 'inquiry' ? 'Visit marked as inquiry only.' : 'Visit rejected.';
        return response()->json(['message' => $message]);
    }

    private function buildRejectionNote(Request $request)
    {
        $reason = $request->input('reason'); // 'human_error', 'left', 'line_too_long', 'inquiry_only'
        $offered = $request->input('offered_appointment'); // true or false

        if ($reason === 'line_too_long') {
            return "Rejected: Line too long. Offered appointment: " . ($offered ? 'Yes' : 'No');
        }

        return match ($reason) {
            'human_error' => 'Rejected: Human error',
            'left' => 'Rejected: Patient left',
            'inquiry_only' => 'Inquiry only: Patient inquired about services but did not proceed with treatment',
            default => 'Rejected: Unknown reason'
        };
    }

    public function linkToExistingPatient(Request $request, $visitId)
    {
        $request->validate([
            'target_patient_id' => 'required|exists:patients,id',
        ]);

        $visit = PatientVisit::findOrFail($visitId);
        $oldPatient = Patient::findOrFail($visit->patient_id);
        $targetPatient = Patient::findOrFail($request->target_patient_id);

        // Replace the link to the correct patient profile
        $visit->update([
            'patient_id' => $targetPatient->id,
        ]);

        // Log example: "Linked visit from Patient #12 → #4 by Staff #2"
        // In future, insert this into system_logs with performed_by, note, etc.

        // Delete the temporary patient profile
        Log::info('🗑️ LINK: About to delete temporary patient ID: ' . $oldPatient->id . ', Name: ' . $oldPatient->first_name . ' ' . $oldPatient->last_name);
        $oldPatient->delete(); // full delete for now
        Log::info('🗑️ LINK: Deleted temporary patient ID: ' . $oldPatient->id);

        return response()->json([
            'message' => 'Visit successfully linked to existing patient profile.',
            'visit' => $visit->load('patient'),
        ]);
    }

    /**
     * POST /api/visits/{id}/view-notes
     * View encrypted visit notes with current user's password verification
     */
    public function viewNotes(Request $request, $id)
    {
        $visit = PatientVisit::with(['patient', 'visitNotes'])->findOrFail($id);
        $user = $request->user();

        if (!$visit->visitNotes) {
            return response()->json(['message' => 'No notes found for this visit.'], 404);
        }

        $validated = $request->validate([
            'password' => 'required|string',
        ]);

        // Verify the current user's password
        if (!Hash::check($validated['password'], $user->password)) {
            // Log failed access attempt
            SystemLog::create([
                'user_id' => $user->id,
                'category' => 'visit_notes',
                'action' => 'access_denied',
                'subject_id' => $visit->id,
                'message' => 'Failed to access visit notes - invalid password',
                'context' => [
                    'visit_id' => $visit->id,
                    'patient_name' => $visit->patient ? $visit->patient->first_name . ' ' . $visit->patient->last_name : 'Unknown',
                    'attempted_at' => now()->toISOString(),
                ],
            ]);

            return response()->json(['message' => 'Invalid password.'], 401);
        }

        try {
            // Access the encrypted notes (Laravel will decrypt automatically)
            $notes = $visit->visitNotes;
            
            // Record access for audit trail
            $notes->recordAccess($user->id);

            // Log successful access
            SystemLog::create([
                'user_id' => $user->id,
                'category' => 'visit_notes',
                'action' => 'viewed',
                'subject_id' => $visit->id,
                'message' => 'Successfully accessed encrypted visit notes',
                'context' => [
                    'visit_id' => $visit->id,
                    'patient_name' => $visit->patient ? $visit->patient->first_name . ' ' . $visit->patient->last_name : 'Unknown',
                    'accessed_at' => now()->toISOString(),
                    'notes_contained' => [
                        'dentist_notes' => !empty($notes->dentist_notes),
                        'findings' => !empty($notes->findings),
                        'treatment_plan' => !empty($notes->treatment_plan),
                    ],
                ],
            ]);

            return response()->json([
                'message' => 'Notes decrypted successfully.',
                'notes' => [
                    'dentist_notes' => $notes->dentist_notes,
                    'findings' => $notes->findings,
                    'treatment_plan' => $notes->treatment_plan,
                    'completed_by' => $notes->created_by,
                    'completed_at' => $notes->created_at->toISOString(),
                    'last_accessed_at' => $notes->last_accessed_at?->toISOString(),
                    'last_accessed_by' => $notes->last_accessed_by,
                ],
            ]);
        } catch (\Exception $e) {
            // Log decryption failure
            SystemLog::create([
                'user_id' => $user->id,
                'category' => 'visit_notes',
                'action' => 'decryption_failed',
                'subject_id' => $visit->id,
                'message' => 'Failed to decrypt visit notes',
                'context' => [
                    'visit_id' => $visit->id,
                    'patient_name' => $visit->patient ? $visit->patient->first_name . ' ' . $visit->patient->last_name : 'Unknown',
                    'error' => $e->getMessage(),
                    'attempted_at' => now()->toISOString(),
                ],
            ]);

            return response()->json(['message' => 'Failed to decrypt notes.'], 500);
        }
    }

    /**
     * POST /api/visits/{id}/save-dentist-notes
     * Save dentist notes during visit (before completion)
     */
    public function saveDentistNotes(Request $request, $id)
    {
        $visit = PatientVisit::with(['visitNotes'])->findOrFail($id);
        
        if ($visit->status !== 'pending') {
            return response()->json(['message' => 'Only pending visits can have notes updated.'], 422);
        }

        $validated = $request->validate([
            'dentist_notes' => ['nullable', 'string', 'max:2000'],
            'findings' => ['nullable', 'string', 'max:2000'],
            'treatment_plan' => ['nullable', 'string', 'max:2000'],
            'teeth_treated' => ['nullable', 'string', 'max:200'],
        ]);

        $userId = $request->user()->id;
        $userRole = $request->user()->role;

        // Check if notes already exist for this visit
        if ($visit->visitNotes) {
            // Update existing notes
            $visit->visitNotes->update([
                'dentist_notes_encrypted' => $validated['dentist_notes'] ?? $visit->visitNotes->dentist_notes_encrypted,
                'findings_encrypted' => $validated['findings'] ?? $visit->visitNotes->findings_encrypted,
                'treatment_plan_encrypted' => $validated['treatment_plan'] ?? $visit->visitNotes->treatment_plan_encrypted,
                'teeth_treated' => $validated['teeth_treated'] ?? $visit->visitNotes->teeth_treated,
                'updated_by' => $userId,
            ]);
            
            $action = 'notes_updated';
        } else {
            // Create new notes
            $visit->visitNotes()->create([
                'dentist_notes_encrypted' => $validated['dentist_notes'] ?? null,
                'findings_encrypted' => $validated['findings'] ?? null,
                'treatment_plan_encrypted' => $validated['treatment_plan'] ?? null,
                'teeth_treated' => $validated['teeth_treated'] ?? null,
                'created_by' => $userId,
            ]);
            
            $action = 'notes_created';
        }

        // Log the notes save action
        SystemLog::create([
            'category' => 'visit',
            'action' => $action,
            'message' => "Dentist notes saved for visit #{$visit->id} by {$userRole}",
            'user_id' => $userId,
            'subject_id' => $visit->id,
            'context' => [
                'visit_id' => $visit->id,
                'patient_id' => $visit->patient_id,
                'visit_code' => $visit->visit_code,
                'user_role' => $userRole,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        return response()->json(['message' => 'Dentist notes saved successfully.']);
    }

    /**
     * GET /api/visits/resolve/{code}
     * Resolve visit code and return patient summary with history
     */
    public function resolveCode(Request $request, $code)
    {
        // Check authorization - only dentist, staff, or admin can resolve codes
        $user = $request->user();
        if (!in_array($user->role, ['dentist', 'staff', 'admin'])) {
            return response()->json(['message' => 'Unauthorized: Only dentists, staff, and admins can resolve visit codes.'], 403);
        }

        // Normalize the code
        $code = strtoupper(trim($code));
        
        if (empty($code)) {
            return response()->json(['message' => 'Invalid visit code.'], 422);
        }

        // Find the visit by code
        $visit = PatientVisit::with(['patient', 'service', 'visitNotes'])
            ->where('visit_code', $code)
            ->first();

        if (!$visit) {
            // Log failed code resolution attempt
            SystemLog::create([
                'category' => 'visit',
                'action' => 'code_resolution_failed',
                'message' => "Failed to resolve visit code: {$code} (not found)",
                'user_id' => $user->id,
                'context' => [
                    'code' => $code,
                    'user_role' => $user->role,
                    'reason' => 'code_not_found',
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ],
            ]);
            
            return response()->json(['message' => 'Visit code not found.'], 404);
        }

        // Check if visit is in allowed state
        if (!in_array($visit->status, ['pending', 'inquiry'])) {
            // Log failed code resolution attempt
            SystemLog::create([
                'category' => 'visit',
                'action' => 'code_resolution_failed',
                'message' => "Failed to resolve visit code: {$code} (inactive status: {$visit->status})",
                'user_id' => $user->id,
                'subject_id' => $visit->id,
                'context' => [
                    'code' => $code,
                    'visit_id' => $visit->id,
                    'visit_status' => $visit->status,
                    'user_role' => $user->role,
                    'reason' => 'inactive_status',
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ],
            ]);
            
            return response()->json(['message' => 'Visit code is no longer active.'], 422);
        }

        // Set consultation started time if not already set
        if (!$visit->consultation_started_at) {
            $visit->update(['consultation_started_at' => now()]);
            
            // Log the consultation start
            SystemLog::create([
                'category' => 'visit',
                'action' => 'consultation_started',
                'message' => "Consultation started for visit code: {$code}",
                'user_id' => $request->user()->id,
                'subject_id' => $visit->id,
                'context' => [
                    'visit_id' => $visit->id,
                    'patient_id' => $visit->patient_id,
                    'visit_code' => $code,
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ],
            ]);
        }

        // Get complete patient history
        $patientHistory = $visit->getCompletePatientHistory();

        // Return minimal patient summary and history
        return response()->json([
            'visit' => [
                'id' => $visit->id,
                'visit_code' => $visit->visit_code,
                'visit_date' => $visit->visit_date,
                'start_time' => $visit->start_time,
                'consultation_started_at' => $visit->consultation_started_at,
                'status' => $visit->status,
            ],
            'patient' => [
                'id' => $visit->patient->id,
                'first_name' => $visit->patient->first_name,
                'last_name' => $visit->patient->last_name,
                'contact_number' => $visit->patient->contact_number,
            ],
            'service' => $visit->service ? [
                'id' => $visit->service->id,
                'name' => $visit->service->name,
            ] : null,
            'patient_history' => $patientHistory,
            'has_existing_notes' => $visit->visitNotes ? true : false,
        ]);
    }

    /**
     * GET /api/visits/{id}/dentist-notes
     * Get dentist notes for pre-filling staff completion form
     */
    public function getDentistNotes(Request $request, $id)
    {
        $visit = PatientVisit::with(['visitNotes'])->findOrFail($id);
        $userId = $request->user()->id;
        $userRole = $request->user()->role;
        
        if (!$visit->visitNotes) {
            // Log access attempt even if no notes exist
            SystemLog::create([
                'category' => 'visit',
                'action' => 'notes_accessed',
                'message' => "Attempted to access notes for visit #{$visit->id} (no notes found) by {$userRole}",
                'user_id' => $userId,
                'subject_id' => $visit->id,
                'context' => [
                    'visit_id' => $visit->id,
                    'patient_id' => $visit->patient_id,
                    'visit_code' => $visit->visit_code,
                    'user_role' => $userRole,
                    'notes_found' => false,
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ],
            ]);
            
            return response()->json([
                'dentist_notes' => null,
                'findings' => null,
                'treatment_plan' => null,
                'teeth_treated' => null,
            ]);
        }

        // Record access to existing notes
        $visit->visitNotes->recordAccess($userId);
        
        // Log the notes access
        SystemLog::create([
            'category' => 'visit',
            'action' => 'notes_accessed',
            'message' => "Accessed notes for visit #{$visit->id} by {$userRole}",
            'user_id' => $userId,
            'subject_id' => $visit->id,
            'context' => [
                'visit_id' => $visit->id,
                'patient_id' => $visit->patient_id,
                'visit_code' => $visit->visit_code,
                'user_role' => $userRole,
                'notes_found' => true,
                'notes_created_by' => $visit->visitNotes->created_by,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        return response()->json([
            'dentist_notes' => $visit->visitNotes->dentist_notes_encrypted,
            'findings' => $visit->visitNotes->findings_encrypted,
            'treatment_plan' => $visit->visitNotes->treatment_plan_encrypted,
            'teeth_treated' => $visit->visitNotes->teeth_treated,
            'created_by' => $visit->visitNotes->createdBy?->name,
            'created_at' => $visit->visitNotes->created_at,
            'updated_by' => $visit->visitNotes->updatedBy?->name,
            'updated_at' => $visit->visitNotes->updated_at,
        ]);
    }

    /**
     * POST /api/visits/send-visit-code
     * Send visit code notification to a specific dentist
     */
    public function sendVisitCode(Request $request)
    {
        $validated = $request->validate([
            'visit_id' => 'required|exists:patient_visits,id',
            'dentist_id' => 'required|exists:dentist_schedules,id',
            'dentist_email' => 'required|email',
        ]);

        $visit = PatientVisit::with(['patient', 'service'])->findOrFail($validated['visit_id']);
        $dentist = DentistSchedule::findOrFail($validated['dentist_id']);

        // Verify the dentist is working today
        $today = now();
        $dayOfWeek = strtolower($today->format('D')); // sun, mon, tue, etc.
        
        if (!$dentist->{$dayOfWeek} || $dentist->status !== 'active') {
            return response()->json(['message' => 'Selected dentist is not working today.'], 422);
        }

        // Check if visit is still pending
        if ($visit->status !== 'pending') {
            return response()->json(['message' => 'Visit is no longer pending.'], 422);
        }

        // Create notification for the dentist
        $notification = Notification::create([
            'type' => 'visit_code',
            'title' => "New Patient Visit - {$visit->patient->first_name} {$visit->patient->last_name}",
            'body' => "Visit Code: {$visit->visit_code}\nPatient: {$visit->patient->first_name} {$visit->patient->last_name}\nService: " . ($visit->service?->name ?? 'Not specified') . "\nStarted: " . $visit->start_time->format('M j, Y g:i A'),
            'severity' => 'info',
            'scope' => 'targeted',
            'audience_roles' => null,
            'effective_from' => now(),
            'effective_until' => null,
            'data' => [
                'visit_id' => $visit->id,
                'visit_code' => $visit->visit_code,
                'patient_name' => "{$visit->patient->first_name} {$visit->patient->last_name}",
                'service_name' => $visit->service?->name ?? 'Not specified',
                'start_time' => $visit->start_time->toISOString(),
                'dentist_id' => $dentist->id,
                'dentist_name' => $dentist->dentist_name ?? $dentist->dentist_code,
                'action_url' => "/dentist/visit/{$visit->visit_code}", // This will be handled by frontend routing
            ],
            'created_by' => $request->user()->id,
        ]);

        // Find the dentist user by email
        $dentistUser = \App\Models\User::where('email', $validated['dentist_email'])->first();
        
        if (!$dentistUser) {
            return response()->json(['message' => 'Dentist user not found with the provided email.'], 422);
        }

        // Create targeted notification for the dentist
        NotificationTarget::create([
            'notification_id' => $notification->id,
            'user_id' => $dentistUser->id,
            'user_email' => $validated['dentist_email'],
            'read_at' => null,
        ]);

        // Log the action
        SystemLog::create([
            'category' => 'visit',
            'action' => 'visit_code_sent',
            'message' => "Visit code sent to dentist: " . ($dentist->dentist_name ?? $dentist->dentist_code),
            'user_id' => $request->user()->id,
            'subject_id' => $visit->id,
            'context' => [
                'visit_id' => $visit->id,
                'visit_code' => $visit->visit_code,
                'patient_name' => "{$visit->patient->first_name} {$visit->patient->last_name}",
                'dentist_id' => $dentist->id,
                'dentist_name' => $dentist->dentist_name ?? $dentist->dentist_code,
                'dentist_email' => $validated['dentist_email'],
                'sent_by' => $request->user()->name,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        return response()->json([
            'message' => 'Visit code sent successfully to dentist.',
            'notification_id' => $notification->id,
            'dentist_name' => $dentist->dentist_name ?? $dentist->dentist_code,
        ]);
    }

}
