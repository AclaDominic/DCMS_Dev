<?php

namespace App\Http\Controllers\API;

use App\Models\User;
use App\Models\Patient;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Services\SystemLogService;

class PatientController extends Controller
{
    // 🔹 For staff: list all patients
    public function index()
    {
        return Patient::with('user')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    // 🔹 Staff adds a new walk-in patient
    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'birthdate' => 'nullable|date',
            'sex' => 'nullable|in:male,female',
            'contact_number' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
        ]);

        $patient = Patient::create($validated);

        return response()->json([
            'message' => 'Patient added successfully.',
            'patient' => $patient
        ], 201);
    }

    // 🔹 Link patient to a registered account
    public function linkToUser(Request $request, Patient $patient)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $user = User::find($validated['user_id']);
        if ($user->role !== 'patient') {
            return response()->json(['message' => 'User is not a patient account.'], 422);
        }

        if ($patient->is_linked) {
            return response()->json(['message' => 'Patient is already linked.'], 409);
        }

        $patient->update([
            'user_id' => $validated['user_id'],
            'is_linked' => true,
            'flag_manual_review' => false,
        ]);

        return response()->json(['message' => 'Patient successfully linked.']);
    }

    // 🔹 Optional: flag patient for manual review
    public function flagReview($id)
    {
        $patient = Patient::findOrFail($id);
        $patient->update(['flag_manual_review' => true]);

        return response()->json(['message' => 'Patient flagged for review.']);
    }

    // 🔍 Search patients by name/contact (for linking modal)
    public function search(Request $request)
    {
        $query = $request->input('q');

        $results = Patient::where(function ($qbuilder) use ($query) {
            $qbuilder->where('first_name', 'like', "%{$query}%")
                ->orWhere('last_name', 'like', "%{$query}%")
                ->orWhere('contact_number', 'like', "%{$query}%");
        })
            ->orderBy('last_name')
            ->take(10)
            ->get();

        return response()->json($results);
    }

    // 🔗 Link self to a patient record (for registered users)
    public function linkSelf(Request $request)
    {
        $user = Auth::user();

        // Validate input
        $request->validate([
            'contact_number' => 'required|string|max:20|unique:users,contact_number,' . $user->id,
            'first_name' => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'last_name' => 'required|string|max:100',
            'birthdate' => 'required|date|before:today',
            'sex' => 'required|in:male,female',
        ]);

        // Prevent duplicate linking
        if (Patient::byUser($user->id)) {
            return response()->json(['message' => 'Already linked.'], 400);
        }

        // Wrap in transaction to prevent partial data on failure
        try {
            $userId = $user->id;
            
            DB::transaction(function () use ($request, $userId) {
                // 🟢 Update user table as well
                $userToUpdate = User::findOrFail($userId);
                $userToUpdate->contact_number = $request->contact_number;
                $userToUpdate->save();

                // Create new patient record
                Patient::create([
                    'first_name' => $request->first_name,
                    'middle_name' => $request->middle_name,
                    'last_name' => $request->last_name,
                    'contact_number' => $request->contact_number,
                    'birthdate' => $request->birthdate,
                    'sex' => $request->sex,
                    'user_id' => $userId,
                    'is_linked' => 1,
                ]);
            });

            return response()->json(['message' => 'Linked successfully.']);
        } catch (\Exception $e) {
            // Log the error for debugging
            \Illuminate\Support\Facades\Log::error('Patient linking failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to link patient record. Please try again.',
            ], 500);
        }
    }

    // 🔍 Search unlinked patients (for admin/staff binding)
    public function searchUnlinkedPatients(Request $request)
    {
        $query = $request->input('q', '');

        $results = Patient::whereNull('user_id')
            ->where(function ($qbuilder) use ($query) {
                if (!empty($query)) {
                    $qbuilder->where('first_name', 'like', "%{$query}%")
                        ->orWhere('last_name', 'like', "%{$query}%")
                        ->orWhere('contact_number', 'like', "%{$query}%");
                }
            })
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->limit(50)
            ->get();

        return response()->json($results);
    }

    // 🔍 Search unlinked users (patient role without patient record)
    public function searchUnlinkedUsers(Request $request)
    {
        $query = $request->input('q', '');

        $results = User::where('role', 'patient')
            ->whereDoesntHave('patient')
            ->where(function ($qbuilder) use ($query) {
                if (!empty($query)) {
                    $qbuilder->where('name', 'like', "%{$query}%")
                        ->orWhere('email', 'like', "%{$query}%")
                        ->orWhere('contact_number', 'like', "%{$query}%");
                }
            })
            ->orderBy('name')
            ->limit(50)
            ->get();

        return response()->json($results);
    }

    // 🔗 Bind existing patient to existing user (admin/staff action)
    public function bindPatientToUser(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'user_id' => 'required|exists:users,id',
        ]);

        $actorUser = Auth::user(); // The admin/staff performing the action

        try {
            $patient = null;
            $user = null;

            DB::transaction(function () use ($validated, $actorUser, &$patient, &$user) {
                // Verify patient is not already linked
                $patient = Patient::findOrFail($validated['patient_id']);
                if ($patient->user_id !== null) {
                    throw new \Exception('This patient is already linked to a user account.');
                }

                // Verify user is a patient and not already linked
                $user = User::findOrFail($validated['user_id']);
                if ($user->role !== 'patient') {
                    throw new \Exception('The selected user is not a patient account.');
                }

                if ($user->patient()->exists()) {
                    throw new \Exception('This user already has a linked patient record.');
                }

                // Update patient record with user_id
                $patient->update([
                    'user_id' => $user->id,
                    'is_linked' => true,
                    'flag_manual_review' => false,
                ]);

                // Update user contact number if patient has one and user doesn't
                if ($patient->contact_number && !$user->contact_number) {
                    $user->update(['contact_number' => $patient->contact_number]);
                }

                // Log the binding event with complete details
                SystemLogService::logPatient(
                    'bind_to_user',
                    $patient->id,
                    "Patient '{$patient->first_name} {$patient->last_name}' (ID: {$patient->id}) bound to user '{$user->name}' (ID: {$user->id}) by {$actorUser->role} '{$actorUser->name}'",
                    [
                        'patient' => [
                            'id' => $patient->id,
                            'name' => "{$patient->first_name} {$patient->middle_name} {$patient->last_name}",
                            'contact_number' => $patient->contact_number,
                            'birthdate' => $patient->birthdate ? $patient->birthdate->format('Y-m-d') : null,
                        ],
                        'user' => [
                            'id' => $user->id,
                            'name' => $user->name,
                            'email' => $user->email,
                            'contact_number' => $user->contact_number,
                        ],
                        'performed_by' => [
                            'id' => $actorUser->id,
                            'name' => $actorUser->name,
                            'email' => $actorUser->email,
                            'role' => $actorUser->role,
                        ],
                        'contact_updated' => $patient->contact_number && !$user->contact_number,
                    ]
                );
            });

            return response()->json([
                'message' => 'Patient successfully bound to user account.',
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Patient-User binding failed', [
                'patient_id' => $validated['patient_id'],
                'user_id' => $validated['user_id'],
                'performed_by' => [
                    'id' => $actorUser->id,
                    'name' => $actorUser->name,
                    'role' => $actorUser->role,
                ],
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

}
