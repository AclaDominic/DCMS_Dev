<?php

namespace Database\Seeders;

use App\Models\SmsWhitelist;
use App\Models\User;
use Illuminate\Database\Seeder;

class SmsWhitelistSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Creating SMS whitelist entries...');

        // Get admin user for created_by
        $adminUser = User::where('role', 'admin')->first();
        
        if (!$adminUser) {
            $this->command->warn('No admin user found. Skipping SmsWhitelistSeeder.');
            return;
        }

        // Create sample SMS whitelist entries for testing
        $whitelistEntries = [
            [
                'phone_e164' => '+639171234567',
                'label' => 'Dev phone – Dr. Reyes',
                'created_by' => $adminUser->id,
            ],
            [
                'phone_e164' => '+639187654321',
                'label' => 'Test phone – Dr. Santos',
                'created_by' => $adminUser->id,
            ],
            [
                'phone_e164' => '+639195556789',
                'label' => 'Staff phone – Nurse Maria',
                'created_by' => $adminUser->id,
            ],
            [
                'phone_e164' => '+639176543210',
                'label' => 'Admin phone – Clinic Manager',
                'created_by' => $adminUser->id,
            ],
            [
                'phone_e164' => '+639123456789',
                'label' => 'Sandbox test phone',
                'created_by' => $adminUser->id,
            ],
            [
                'phone_e164' => '+639987654321',
                'label' => 'Emergency contact phone',
                'created_by' => $adminUser->id,
            ],
            [
                'phone_e164' => '+639555123456',
                'label' => 'Marketing team phone',
                'created_by' => $adminUser->id,
            ],
            [
                'phone_e164' => '+639444987654',
                'label' => 'IT support phone',
                'created_by' => $adminUser->id,
            ],
        ];

        // Insert whitelist entries
        foreach ($whitelistEntries as $entry) {
            SmsWhitelist::updateOrCreate(
                ['phone_e164' => $entry['phone_e164']],
                $entry
            );
        }

        $this->command->info('Created ' . count($whitelistEntries) . ' SMS whitelist entries.');
        $this->command->info('These phone numbers are whitelisted for SMS notifications in development/testing environments.');
    }
}
