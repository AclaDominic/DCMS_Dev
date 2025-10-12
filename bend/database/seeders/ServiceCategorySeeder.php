<?php

namespace Database\Seeders;

use App\Models\ServiceCategory;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ServiceCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
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
}
