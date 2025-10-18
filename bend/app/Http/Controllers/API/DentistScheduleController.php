<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\DentistSchedule;
use App\Models\User;
use App\Services\SystemLogService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class DentistScheduleController extends Controller
{
    public function index(Request $request)
    {
        // Optional filter by status; always return a PLAIN ARRAY for the UI.
        $q = DentistSchedule::query();
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        $items = $q->orderBy('dentist_code')->get();   // ← not paginate()
        return response()->json($items);               // ← []
    }

    public function show($id)
    {
        return response()->json(DentistSchedule::findOrFail($id));
    }

    public function store(Request $request)
    {
        $data = $this->validatedData($request, isUpdate: false);
        $row  = DentistSchedule::create($data);
        
        return response()->json($row, 201);
    }

    public function update(Request $request, $id)
    {
        $row  = DentistSchedule::findOrFail($id);
        $data = $this->validatedData($request, isUpdate: true, currentId: $row->id);
        
        $row->update($data);
        
        return response()->json($row);
    }


    public function destroy($id)
    {
        $row = DentistSchedule::findOrFail($id);
        $row->delete();
        return response()->noContent(); // 204
    }

    /**
     * Get the current authenticated dentist's schedule
     */
    public function mySchedule(Request $request)
    {
        $user = $request->user();
        
        if (!$user || $user->role !== 'dentist') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $dentistSchedule = DentistSchedule::where('email', $user->email)->first();
        
        if (!$dentistSchedule) {
            return response()->json(['message' => 'Dentist schedule not found'], 404);
        }

        return response()->json($dentistSchedule);
    }

    /**
     * Get available dentists for a specific date
     */
    public function availableForDate(Request $request)
    {
        $request->validate([
            'date' => 'required|date_format:Y-m-d'
        ]);

        $date = $request->date;
        $dentists = DentistSchedule::activeOnDate($date)
            ->select('dentist_code', 'dentist_name')
            ->orderBy('dentist_code')
            ->get();

        return response()->json([
            'date' => $date,
            'dentists' => $dentists,
            'count' => $dentists->count()
        ]);
    }

    private function validatedData(Request $request, bool $isUpdate, ?int $currentId = null): array
    {
        $days = ['sun','mon','tue','wed','thu','fri','sat'];

        $rules = [
            // Frontend expects code REQUIRED & UNIQUE; name optional (pseudonymous allowed)
            'dentist_code'      => ['required','string','max:32', Rule::unique('dentist_schedules','dentist_code')->ignore($currentId)],
            'dentist_name'      => ['nullable','string','max:120'],
            'is_pseudonymous'   => ['nullable','boolean'],

            // Frontend sends 'full_time' | 'part_time' | 'locum'
            'employment_type'   => ['required', Rule::in(['full_time','part_time','locum'])],

            'contract_end_date' => ['nullable','date','after_or_equal:today'],
            'status'            => ['required', Rule::in(['active','inactive'])],
            
            // Email fields
            'email'             => ['required','email','max:255', Rule::unique('dentist_schedules','email')->ignore($currentId)],
        ];

        // Weekdays as booleans (not required, UI sends them; we default later)
        foreach ($days as $d) {
            $rules[$d] = ['nullable','boolean'];
        }

        $data = $request->validate($rules);

        // Normalize booleans (default false) and pseudonym flag (default true)
        foreach ($days as $d) {
            $data[$d] = (bool) ($request->boolean($d));
        }
        $data['is_pseudonymous'] = (bool) ($data['is_pseudonymous'] ?? true);
        
        // Email is required, no need to handle nullable

        // Enforce: at least one working day must be selected
        $hasAny = false;
        foreach ($days as $d) {
            if ($data[$d] === true) { $hasAny = true; break; }
        }
        if (!$hasAny) {
            abort(response()->json([
                'message' => 'Select at least one working day.',
                'errors'  => ['weekdays' => ['Select at least one working day.']],
            ], 422));
        }

        return $data;
    }

}
