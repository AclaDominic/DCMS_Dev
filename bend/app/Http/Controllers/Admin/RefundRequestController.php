<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\RefundRequest;
use App\Models\Payment;
use App\Models\Appointment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\SystemLogService;
use App\Services\ReceiptService;
use App\Services\RefundCommunicationService;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class RefundRequestController extends Controller
{
    protected $receiptService;

    public function __construct(ReceiptService $receiptService)
    {
        $this->receiptService = $receiptService;
    }
    /**
     * List refund requests with optional status filtering
     */
    public function index(Request $request)
    {
        $query = RefundRequest::with(['patient.user', 'appointment', 'payment', 'processedBy', 'deadlineExtendedBy']);

        // Filter by status if provided
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $refundRequests = $query->orderByDesc('created_at')->get();

        return response()->json($refundRequests);
    }

    /**
     * Create a new refund request (typically called from appointment cancellation)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'appointment_id' => 'nullable|exists:appointments,id',
            'payment_id' => 'nullable|exists:payments,id',
            'original_amount' => 'required|numeric|min:0',
            'cancellation_fee' => 'required|numeric|min:0',
            'refund_amount' => 'required|numeric|min:0',
            'reason' => 'nullable|string|max:1000',
        ]);

        $refundRequest = RefundRequest::create([
            'patient_id' => $validated['patient_id'],
            'appointment_id' => $validated['appointment_id'] ?? null,
            'payment_id' => $validated['payment_id'] ?? null,
            'original_amount' => $validated['original_amount'],
            'cancellation_fee' => $validated['cancellation_fee'],
            'refund_amount' => $validated['refund_amount'],
            'reason' => $validated['reason'] ?? null,
            'status' => RefundRequest::STATUS_PENDING,
            'requested_at' => now(),
        ]);

        SystemLogService::logRefund(
            'created',
            $refundRequest->id,
            'Refund request created for appointment #' . $refundRequest->appointment_id,
            [
                'refund_request_id' => $refundRequest->id,
                'appointment_id' => $refundRequest->appointment_id,
                'payment_id' => $refundRequest->payment_id,
                'patient_id' => $refundRequest->patient_id,
                'original_amount' => $refundRequest->original_amount,
                'cancellation_fee' => $refundRequest->cancellation_fee,
                'refund_amount' => $refundRequest->refund_amount,
                'reason' => $refundRequest->reason,
            ]
        );

        return response()->json($refundRequest->load(['patient.user', 'appointment', 'payment']), 201);
    }

    /**
     * Get single refund request details
     */
    public function show($id)
    {
        $refundRequest = RefundRequest::with(['patient.user', 'appointment', 'payment', 'processedBy'])
            ->findOrFail($id);

        return response()->json($refundRequest);
    }

    /**
     * Approve a pending refund request
     */
    public function approve(Request $request, $id)
    {
        $refundRequest = RefundRequest::findOrFail($id);

        if ($refundRequest->status !== RefundRequest::STATUS_PENDING) {
            return response()->json([
                'message' => 'Only pending refund requests can be approved.'
            ], 422);
        }

        $validated = $request->validate([
            'admin_notes' => 'nullable|string|max:1000',
        ]);

        $refundRequest->update([
            'status' => RefundRequest::STATUS_APPROVED,
            'approved_at' => now(),
            'admin_notes' => $validated['admin_notes'] ?? $refundRequest->admin_notes,
        ]);

        SystemLogService::logRefund(
            'approved',
            $refundRequest->id,
            'Refund request #' . $refundRequest->id . ' approved by ' . Auth::user()->name,
            [
                'refund_request_id' => $refundRequest->id,
                'appointment_id' => $refundRequest->appointment_id,
                'payment_id' => $refundRequest->payment_id,
                'patient_id' => $refundRequest->patient_id,
                'refund_amount' => $refundRequest->refund_amount,
                'approved_by' => Auth::id(),
                'approved_by_name' => Auth::user()->name,
                'approved_by_role' => Auth::user()->role,
                'admin_notes' => $refundRequest->admin_notes,
            ]
        );

        return response()->json([
            'message' => 'Refund request approved.',
            'refund_request' => $refundRequest->load(['patient.user', 'appointment', 'payment']),
        ]);
    }

    /**
     * Reject a pending refund request
     */
    public function reject(Request $request, $id)
    {
        $refundRequest = RefundRequest::findOrFail($id);

        if ($refundRequest->status !== RefundRequest::STATUS_PENDING) {
            return response()->json([
                'message' => 'Only pending refund requests can be rejected.'
            ], 422);
        }

        $validated = $request->validate([
            'admin_notes' => 'nullable|string|max:1000',
        ]);

        $refundRequest->update([
            'status' => RefundRequest::STATUS_REJECTED,
            'admin_notes' => $validated['admin_notes'] ?? $refundRequest->admin_notes,
        ]);

        SystemLogService::logRefund(
            'rejected',
            $refundRequest->id,
            'Refund request #' . $refundRequest->id . ' rejected by ' . Auth::user()->name,
            [
                'refund_request_id' => $refundRequest->id,
                'appointment_id' => $refundRequest->appointment_id,
                'payment_id' => $refundRequest->payment_id,
                'patient_id' => $refundRequest->patient_id,
                'refund_amount' => $refundRequest->refund_amount,
                'rejected_by' => Auth::id(),
                'rejected_by_name' => Auth::user()->name,
                'rejected_by_role' => Auth::user()->role,
                'admin_notes' => $refundRequest->admin_notes,
            ]
        );

        return response()->json([
            'message' => 'Refund request rejected.',
            'refund_request' => $refundRequest->load(['patient.user', 'appointment', 'payment']),
        ]);
    }

    /**
     * Mark refund as processed (manual processing)
     */
    public function process(Request $request, $id)
    {
        $refundRequest = RefundRequest::findOrFail($id);

        if ($refundRequest->status !== RefundRequest::STATUS_APPROVED) {
            return response()->json([
                'message' => 'Only approved refund requests can be marked as processed.'
            ], 422);
        }

        $validated = $request->validate([
            'admin_notes' => 'nullable|string|max:1000',
        ]);

        $refundRequest->update([
            'status' => RefundRequest::STATUS_PROCESSED,
            'processed_at' => now(),
            'processed_by' => Auth::id(),
            'admin_notes' => $validated['admin_notes'] ?? $refundRequest->admin_notes,
        ]);

        // Update payment status to refunded if payment exists
        $payment = null;
        if ($refundRequest->payment_id) {
            $payment = Payment::find($refundRequest->payment_id);
            if ($payment) {
                $payment->markRefunded(Auth::id());
            }
        }

        if ($refundRequest->appointment_id) {
            $appointment = Appointment::find($refundRequest->appointment_id);
            if ($appointment) {
                $appointment->forceFill([
                    'payment_status' => Payment::STATUS_REFUNDED,
                ])->save();
            }
        }

        SystemLogService::logRefund(
            'processed',
            $refundRequest->id,
            'Refund request #' . $refundRequest->id . ' marked as processed by ' . Auth::user()->name,
            [
                'refund_request_id' => $refundRequest->id,
                'appointment_id' => $refundRequest->appointment_id,
                'payment_id' => $refundRequest->payment_id,
                'patient_id' => $refundRequest->patient_id,
                'refund_amount' => $refundRequest->refund_amount,
                'processed_by' => Auth::id(),
                'processed_by_name' => Auth::user()->name,
                'processed_by_role' => Auth::user()->role,
                'admin_notes' => $refundRequest->admin_notes,
            ]
        );

        // Send refund receipt email to patient
        try {
            $this->receiptService->sendRefundReceiptEmail($refundRequest);
        } catch (\Exception $e) {
            // Log error but don't fail the request
            \Log::error('Failed to send refund receipt email', [
                'refund_request_id' => $refundRequest->id,
                'error' => $e->getMessage(),
            ]);
        }

        RefundCommunicationService::sendReadyForPickup($refundRequest->fresh());

        return response()->json([
            'message' => 'Refund request marked as processed.',
            'refund_request' => $refundRequest->refresh()->load(['patient.user', 'appointment', 'payment', 'processedBy', 'deadlineExtendedBy']),
        ]);
    }

    /**
     * Mark refund as completed (patient confirmed pickup)
     */
    public function complete(Request $request, $id)
    {
        $refundRequest = RefundRequest::findOrFail($id);

        if ($refundRequest->status !== RefundRequest::STATUS_PROCESSED) {
            return response()->json([
                'message' => 'Only processed refund requests can be marked as completed.'
            ], 422);
        }

        $validated = $request->validate([
            'admin_notes' => 'nullable|string|max:1000',
        ]);

        $refundRequest->update([
            'status' => RefundRequest::STATUS_COMPLETED,
            'completed_at' => now(),
            'admin_notes' => $validated['admin_notes'] ?? $refundRequest->admin_notes,
        ]);

        SystemLogService::logRefund(
            'completed',
            $refundRequest->id,
            'Refund request #' . $refundRequest->id . ' marked as completed by ' . Auth::user()->name,
            [
                'refund_request_id' => $refundRequest->id,
                'appointment_id' => $refundRequest->appointment_id,
                'payment_id' => $refundRequest->payment_id,
                'patient_id' => $refundRequest->patient_id,
                'refund_amount' => $refundRequest->refund_amount,
                'completed_by' => Auth::id(),
                'completed_by_name' => Auth::user()->name,
                'completed_by_role' => Auth::user()->role,
                'admin_notes' => $refundRequest->admin_notes,
            ]
        );

        return response()->json([
            'message' => 'Refund request marked as completed.',
            'refund_request' => $refundRequest->refresh()->load(['patient.user', 'appointment', 'payment', 'processedBy', 'deadlineExtendedBy']),
        ]);
    }

    public function extendDeadline(Request $request, $id)
    {
        $refundRequest = RefundRequest::with(['patient.user'])->findOrFail($id);

        if (!in_array($refundRequest->status, [
            RefundRequest::STATUS_PENDING,
            RefundRequest::STATUS_APPROVED,
            RefundRequest::STATUS_PROCESSED,
        ])) {
            return response()->json([
                'message' => 'Only pending, approved, or processed refunds can have their deadlines extended.'
            ], 422);
        }

        $validated = Validator::make($request->all(), [
            'new_deadline' => ['required', 'date_format:Y-m-d'],
            'reason' => ['required', 'string', 'max:1000'],
        ])->validate();

        $newDeadline = Carbon::createFromFormat('Y-m-d', $validated['new_deadline'])->endOfDay();
        $minimumDeadline = $refundRequest->minimumExtendDeadline();

        if ($newDeadline->lt($minimumDeadline)) {
            return response()->json([
                'message' => 'New deadline must be at least 7 business days from the refund request creation.',
                'minimum_deadline' => $minimumDeadline->toDateString(),
            ], 422);
        }

        if ($refundRequest->deadline_at && $newDeadline->lte($refundRequest->deadline_at)) {
            return response()->json([
                'message' => 'New deadline must be after the current deadline.',
            ], 422);
        }

        $oldDeadline = $refundRequest->deadline_at ? $refundRequest->deadline_at->copy() : $minimumDeadline;

        $refundRequest->update([
            'deadline_at' => $newDeadline,
            'deadline_extended_at' => now(),
            'deadline_extended_by' => Auth::id(),
            'deadline_extension_reason' => $validated['reason'],
            'pickup_reminder_sent_at' => null,
        ]);

        RefundCommunicationService::sendDeadlineExtended(
            $refundRequest->fresh(),
            $oldDeadline,
            $newDeadline,
            $validated['reason'],
            Auth::user()
        );

        return response()->json([
            'message' => 'Refund deadline extended.',
            'refund_request' => $refundRequest->refresh()->load(['patient.user', 'appointment', 'payment', 'processedBy', 'deadlineExtendedBy']),
        ]);
    }
}
