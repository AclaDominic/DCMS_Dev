<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use App\Models\ServiceCategory;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, seed the service categories if they don't exist
        $this->seedServiceCategories();

        // Then migrate the data
        $categories = ServiceCategory::all()->keyBy('name');
        
        DB::table('services')->whereNotNull('category')->orderBy('id')->chunk(100, function ($services) use ($categories) {
            foreach ($services as $service) {
                $category = $categories->get($service->category);
                if ($category) {
                    DB::table('services')
                        ->where('id', $service->id)
                        ->update(['service_category_id' => $category->id]);
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration is not reversible as we don't want to lose the foreign key data
        // If you need to reverse, you would need to manually map back to category strings
    }

    /**
     * Seed service categories if they don't exist
     */
    private function seedServiceCategories(): void
    {
        $categories = [
            [
                'name' => 'Preventive',
                'description' => 'Preventive dental care services to maintain oral health',
                'is_active' => true,
            ],
            [
                'name' => 'Restorative',
                'description' => 'Services to restore damaged teeth and oral function',
                'is_active' => true,
            ],
            [
                'name' => 'Cosmetic',
                'description' => 'Aesthetic dental treatments to improve appearance',
                'is_active' => true,
            ],
            [
                'name' => 'Surgical',
                'description' => 'Oral and dental surgical procedures',
                'is_active' => true,
            ],
            [
                'name' => 'Orthodontic',
                'description' => 'Teeth alignment and bite correction services',
                'is_active' => true,
            ],
            [
                'name' => 'Other',
                'description' => 'Other dental services not categorized above',
                'is_active' => true,
            ],
        ];

        foreach ($categories as $category) {
            ServiceCategory::firstOrCreate(
                ['name' => $category['name']],
                $category
            );
        }
    }
};
