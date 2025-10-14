<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\PatientManager;
use App\Models\Appointment;
use App\Services\PatientManagerService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Services\SystemLogService;

class PatientManagerController extends Controller
{
    /**
     * Get all patients with no-show tracking data
     */
    public function index(Request $request): JsonResponse
    {
        try {
            // Start with all patients who have user accounts
            $query = Patient::with(['user', 'patientManager.blockedBy', 'patientManager.lastUpdatedBy'])
                ->whereNotNull('user_id')
                ->where('is_linked', true);

            // Filter by block status
            if ($request->has('status')) {
                $status = $request->get('status');
                if (in_array($status, ['active', 'warning', 'blocked'])) {
                    if ($status === 'active') {
                        // Active: no PatientManager record OR block_status = 'active'
                        $query->where(function ($q) {
                            $q->whereDoesntHave('patientManager')
                              ->orWhereHas('patientManager', function ($subQ) {
                                  $subQ->where('block_status', 'active');
                              });
                        });
                    } else {
                        // Warning or blocked: must have PatientManager record with that status
                        $query->whereHas('patientManager', function ($q) use ($status) {
                            $q->where('block_status', $status);
                        });
                    }
                }
            }

            // Filter by minimum no-show count
            if ($request->has('min_no_shows')) {
                $minNoShows = (int) $request->get('min_no_shows');
                if ($minNoShows > 0) {
                    $query->whereHas('patientManager', function ($q) use ($minNoShows) {
                        $q->where('no_show_count', '>=', $minNoShows);
                    });
                }
            }

            // Search by patient name or email
            if ($request->has('search')) {
                $search = $request->get('search');
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                      ->orWhere('last_name', 'like', "%{$search}%")
                      ->orWhere('contact_number', 'like', "%{$search}%")
                      ->orWhereHas('user', function ($userQ) use ($search) {
                          $userQ->where('email', 'like', "%{$search}%");
                      });
                });
            }

            // Order by no-show count or last no-show date
            $sortBy = $request->get('sort_by', 'no_show_count');
            $sortOrder = $request->get('sort_order', 'desc');
            
            if ($sortBy === 'last_no_show') {
                $query->leftJoin('patient_manager', 'patients.id', '=', 'patient_manager.patient_id')
                      ->orderBy('patient_manager.last_no_show_at', $sortOrder);
            } else {
                $query->leftJoin('patient_manager', 'patients.id', '=', 'patient_manager.patient_id')
                      ->orderBy('patient_manager.no_show_count', $sortOrder);
            }

            $patients = $query->select('patients.*')->paginate(20);

            // Transform the data to match the expected format
            $transformedPatients = $patients->getCollection()->map(function ($patient) {
                $patientManager = $patient->patientManager;
                
                // If no PatientManager record exists, create one
                if (!$patientManager) {
                    $patientManager = \App\Models\PatientManager::create([
                        'patient_id' => $patient->id,
                        'no_show_count' => 0,
                        'block_status' => 'active',
                    ]);
                }
                
                return [
                    'id' => $patientManager->id,
                    'patient_id' => $patient->id,
                    'no_show_count' => $patientManager->no_show_count,
                    'last_no_show_at' => $patientManager->last_no_show_at,
                    'warning_count' => $patientManager->warning_count,
                    'last_warning_sent_at' => $patientManager->last_warning_sent_at,
                    'last_warning_message' => $patientManager->last_warning_message,
                    'block_status' => $patientManager->block_status,
                    'blocked_at' => $patientManager->blocked_at,
                    'block_reason' => $patientManager->block_reason,
                    'block_type' => $patientManager->block_type,
                    'blocked_ip' => $patientManager->blocked_ip,
                    'blocked_by' => $patientManager->blockedBy,
                    'admin_notes' => $patientManager->admin_notes,
                    'last_updated_at' => $patientManager->last_updated_at,
                    'last_updated_by' => $patientManager->lastUpdatedBy,
                    'created_at' => $patientManager->created_at,
                    'updated_at' => $patientManager->updated_at,
                    'patient' => [
                        'id' => $patient->id,
                        'user_id' => $patient->user_id,
                        'first_name' => $patient->first_name,
                        'last_name' => $patient->last_name,
                        'middle_name' => $patient->middle_name,
                        'birthdate' => $patient->birthdate,
                        'sex' => $patient->sex,
                        'contact_number' => $patient->contact_number,
                        'address' => $patient->address,
                        'is_linked' => $patient->is_linked,
                        'flag_manual_review' => $patient->flag_manual_review,
                        'created_at' => $patient->created_at,
                        'updated_at' => $patient->updated_at,
                        'user' => $patient->user,
                    ],
                ];
            });

            // Replace the collection in pagination
            $patients->setCollection($transformedPatients);

            return response()->json([
                'success' => true,
                'data' => $patients,
                'statistics' => PatientManagerService::getStatistics(),
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching patient manager data', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch patient data',
            ], 500);
        }
    }

    /**
     * Get specific patient manager record
     */
    public function show(int $id): JsonResponse
    {
        try {
            $patientManager = PatientManager::with([
                'patient.user', 
                'blockedBy', 
                'lastUpdatedBy',
                'patient.appointments' => function ($query) {
                    $query->where('status', 'no_show')->orderBy('date', 'desc')->limit(10);
                }
            ])->findOrFail($id);

            // Add recent IP addresses to the response
            $patientManager->patient->recent_ip_addresses = $patientManager->patient->getRecentIpAddresses();
            $patientManager->patient->last_login_ip = $patientManager->patient->getLastLoginIp();

            return response()->json([
                'success' => true,
                'data' => $patientManager,
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Patient manager record not found',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Error fetching patient manager record', [
                'id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch patient data',
            ], 500);
        }
    }

    /**
     * Send warning to patient
     */
    public function sendWarning(Request $request, int $id): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'message' => 'required|string|max:500',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $patientManager = PatientManager::with('patient.user')->findOrFail($id);
            
            if (!$patientManager->patient || !$patientManager->patient->user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Patient not linked to user account',
                ], 422);
            }

            $success = PatientManagerService::sendWarning(
                $patientManager, 
                null, 
                $request->get('message')
            );

            if ($success) {
                // Log warning sent
                SystemLogService::logPatientManager(
                    'warning_sent',
                    $id,
                    "Warning sent to patient: {$patientManager->patient->first_name} {$patientManager->patient->last_name}",
                    [
                        'patient_id' => $patientManager->patient_id,
                        'patient_name' => $patientManager->patient->first_name . ' ' . $patientManager->patient->last_name,
                        'warning_message' => $request->get('message'),
                        'warning_count' => $patientManager->warning_count,
                        'no_show_count' => $patientManager->no_show_count
                    ]
                );

                return response()->json([
                    'success' => true,
                    'message' => 'Warning sent successfully',
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to send warning',
                ], 500);
            }

        } catch (\Exception $e) {
            Log::error('Error sending warning', [
                'patient_manager_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send warning',
            ], 500);
        }
    }

    /**
     * Block patient
     */
    public function blockPatient(Request $request, int $id): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'reason' => 'required|string|max:500',
                'block_type' => 'required|in:account,ip,both',
                'ip' => 'nullable|ip',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $patientManager = PatientManager::findOrFail($id);
            
            $success = PatientManagerService::blockPatient(
                $patientManager,
                null,
                $request->get('reason'),
                $request->get('block_type'),
                $request->get('ip')
            );

            if ($success) {
                // Log patient blocking
                SystemLogService::logPatientManager(
                    'blocked',
                    $id,
                    "Patient blocked: {$patientManager->patient->first_name} {$patientManager->patient->last_name}",
                    [
                        'patient_id' => $patientManager->patient_id,
                        'patient_name' => $patientManager->patient->first_name . ' ' . $patientManager->patient->last_name,
                        'block_reason' => $request->get('reason'),
                        'block_type' => $request->get('block_type'),
                        'blocked_ip' => $request->get('ip'),
                        'no_show_count' => $patientManager->no_show_count
                    ]
                );

                return response()->json([
                    'success' => true,
                    'message' => 'Patient blocked successfully',
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to block patient',
                ], 500);
            }

        } catch (\Exception $e) {
            Log::error('Error blocking patient', [
                'patient_manager_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to block patient',
            ], 500);
        }
    }

    /**
     * Unblock patient
     */
    public function unblockPatient(Request $request, int $id): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'reason' => 'nullable|string|max:500',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $patientManager = PatientManager::findOrFail($id);
            
            if (!$patientManager->isBlocked()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Patient is not currently blocked',
                ], 422);
            }
            
            $success = PatientManagerService::unblockPatient(
                $patientManager,
                $request->get('reason')
            );

            if ($success) {
                // Log patient unblocking
                SystemLogService::logPatientManager(
                    'unblocked',
                    $id,
                    "Patient unblocked: {$patientManager->patient->first_name} {$patientManager->patient->last_name}",
                    [
                        'patient_id' => $patientManager->patient_id,
                        'patient_name' => $patientManager->patient->first_name . ' ' . $patientManager->patient->last_name,
                        'unblock_reason' => $request->get('reason'),
                        'no_show_count' => $patientManager->no_show_count
                    ]
                );

                return response()->json([
                    'success' => true,
                    'message' => 'Patient unblocked successfully',
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to unblock patient',
                ], 500);
            }

        } catch (\Exception $e) {
            Log::error('Error unblocking patient', [
                'patient_manager_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to unblock patient',
            ], 500);
        }
    }

    /**
     * Add admin note
     */
    public function addNote(Request $request, int $id): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'note' => 'required|string|max:1000',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $patientManager = PatientManager::findOrFail($id);
            $patientManager->addAdminNote($request->get('note'), Auth::id());

            // Log admin note addition
            SystemLogService::logPatientManager(
                'note_added',
                $id,
                "Admin note added to patient manager record",
                [
                    'patient_manager_id' => $id,
                    'note' => $request->get('note')
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Note added successfully',
            ]);

        } catch (\Exception $e) {
            Log::error('Error adding note', [
                'patient_manager_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to add note',
            ], 500);
        }
    }

    /**
     * Get patient's no-show history
     */
    public function getNoShowHistory(int $id): JsonResponse
    {
        try {
            $patientManager = PatientManager::with('patient')->findOrFail($id);
            
            $noShowAppointments = Appointment::with(['service'])
                ->where('patient_id', $patientManager->patient_id)
                ->where('status', 'no_show')
                ->orderBy('date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'patient_manager' => $patientManager,
                    'no_show_appointments' => $noShowAppointments,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch no-show history',
            ], 500);
        }
    }

    /**
     * Get dashboard statistics
     */
    public function getStatistics(): JsonResponse
    {
        try {
            $statistics = PatientManagerService::getStatistics();
            
            return response()->json([
                'success' => true,
                'data' => $statistics,
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching patient manager statistics', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch statistics',
            ], 500);
        }
    }

    /**
     * Reset patient's no-show count (admin override)
     */
    public function resetNoShowCount(Request $request, int $id): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'reason' => 'required|string|max:500',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $patientManager = PatientManager::findOrFail($id);
            
            $oldCount = $patientManager->no_show_count;
            
            $patientManager->update([
                'no_show_count' => 0,
                'last_no_show_at' => null,
                'warning_count' => 0,
                'last_warning_sent_at' => null,
                'block_status' => 'active',
                'blocked_at' => null,
                'block_reason' => null,
                'block_type' => null,
                'blocked_ip' => null,
                'blocked_by' => null,
                'last_updated_at' => now(),
                'last_updated_by' => Auth::id(),
            ]);

            // Add admin note about the reset
            $patientManager->addAdminNote(
                "No-show count reset from {$oldCount} to 0. Reason: " . $request->get('reason'),
                Auth::id()
            );

            // Log no-show count reset
            SystemLogService::logPatientManager(
                'no_show_reset',
                $id,
                "No-show count reset from {$oldCount} to 0",
                [
                    'patient_manager_id' => $id,
                    'patient_id' => $patientManager->patient_id,
                    'old_count' => $oldCount,
                    'new_count' => 0,
                    'reason' => $request->get('reason'),
                    'admin_id' => Auth::id()
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'No-show count reset successfully',
            ]);

        } catch (\Exception $e) {
            Log::error('Error resetting no-show count', [
                'patient_manager_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to reset no-show count',
            ], 500);
        }
    }
}
