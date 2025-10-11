<?php

namespace App\Http\Controllers\Admin;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Http\Controllers\Controller;
use Illuminate\Validation\Rules;

class StaffAccountController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $staff = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => 'staff',
            'status' => 'activated', // default status
        ]);

        return response()->json([
            'message' => 'Staff account created successfully.',
            'user' => $staff,
        ]);
    }

    /**
     * Get all staff accounts with pagination and search
     */
    public function index(Request $request)
    {
        $query = User::where('role', 'staff');

        // Search functionality
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Pagination
        $staff = $query->orderBy('created_at', 'desc')
                      ->paginate(10);

        return response()->json($staff);
    }

    /**
     * Toggle staff account status (activate/deactivate)
     */
    public function toggleStatus(Request $request, $id)
    {
        $staff = User::where('role', 'staff')->findOrFail($id);
        
        $newStatus = $staff->status === 'activated' ? 'deactivated' : 'activated';
        $staff->update(['status' => $newStatus]);

        return response()->json([
            'message' => "Staff account {$newStatus} successfully.",
            'user' => $staff,
        ]);
    }

    /**
     * Get specific staff account
     */
    public function show($id)
    {
        $staff = User::where('role', 'staff')->findOrFail($id);
        
        return response()->json($staff);
    }
}
