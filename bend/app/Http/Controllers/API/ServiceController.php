<?php

namespace App\Http\Controllers\API;

use App\Models\Service;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class ServiceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(Service::with(['bundledServices', 'bundleItems', 'category'])->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'service_category_id' => 'required|exists:service_categories,id',
            'is_excluded_from_analytics' => 'boolean',
            'is_special' => 'boolean',
            'special_start_date' => 'nullable|date',
            'special_end_date' => 'nullable|date|after_or_equal:special_start_date',
            'estimated_minutes' => 'required|integer|min:1',
            'bundled_service_ids' => 'array',
            'bundled_service_ids.*' => 'exists:services,id',
        ]);

        // Round up estimated time to nearest 30 mins
        $validated['estimated_minutes'] = ceil($validated['estimated_minutes'] / 30) * 30;

        $service = Service::create($validated);

        // Sync bundled services (if any)
        if ($request->has('bundled_service_ids')) {
            $service->bundledServices()->sync($request->input('bundled_service_ids'));
        }

        return response()->json($service->load(['bundledServices', 'bundleItems', 'category']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        return response()->json(Service::with(['bundledServices', 'bundleItems', 'category'])->findOrFail($id));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $service = Service::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'sometimes|required|numeric|min:0',
            'service_category_id' => 'nullable|exists:service_categories,id',
            'is_excluded_from_analytics' => 'boolean',
            'is_special' => 'boolean',
            'special_start_date' => 'nullable|date',
            'special_end_date' => 'nullable|date|after_or_equal:special_start_date',
            'estimated_minutes' => 'sometimes|required|integer|min:1',
            'bundled_service_ids' => 'array',
            'bundled_service_ids.*' => 'exists:services,id',
        ]);

        if (isset($validated['estimated_minutes'])) {
            $validated['estimated_minutes'] = ceil($validated['estimated_minutes'] / 30) * 30;
        }

        $service->update($validated);

        // Sync bundled services
        if ($request->has('bundled_service_ids')) {
            $service->bundledServices()->sync($request->input('bundled_service_ids'));
        }

        return response()->json($service->load(['bundledServices', 'bundleItems', 'category']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $service = Service::findOrFail($id);
        $service->delete();
        return response()->json(null, 204);
    }

    /**
     * Public endpoint for landing page - returns active services with current promos
     */
    public function publicIndex()
    {
        $services = Service::where('is_active', true)
            ->with(['bundledServices', 'bundleItems', 'category', 'discounts' => function($query) {
                $query->whereIn('status', ['planned', 'launched'])
                      ->orderBy('start_date');
            }])
            ->get()
            ->map(function($service) {
                // Clean up the service data for public display
                $serviceData = $service->toArray();
                
                // Remove internal fields that might cause rendering issues
                unset($serviceData['is_excluded_from_analytics']);
                
                // Clean up discounts data
                if (isset($serviceData['discounts'])) {
                    $serviceData['discounts'] = collect($serviceData['discounts'])->map(function($discount) {
                        return [
                            'id' => $discount['id'],
                            'service_id' => $discount['service_id'],
                            'start_date' => $discount['start_date'],
                            'end_date' => $discount['end_date'],
                            'discounted_price' => $discount['discounted_price'],
                            'status' => $discount['status'],
                            'created_at' => $discount['created_at'],
                            'updated_at' => $discount['updated_at']
                        ];
                    })->toArray();
                }
                
                return $serviceData;
            });

        return response()->json($services);
    }
}
