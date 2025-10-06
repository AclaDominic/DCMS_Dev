<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\DentistSchedule;

class DentistScheduleSeeder extends Seeder
{
    public function run(): void
    {
        // Dr. A works Mon-Fri
        DentistSchedule::create([
            'dentist_code' => 'DENT-A',
            'dentist_name' => 'Dr. A',
            'is_pseudonymous' => false,
            'employment_type' => 'full_time',
            'contract_end_date' => null,
            'status' => 'active',
            'email' => 'd@gmail.com',
            'temporary_password' => 'temp123456',
            'password_changed' => true,
            'password_changed_at' => now(),
            'sun' => false,
            'mon' => true,
            'tue' => true,
            'wed' => true,
            'thu' => true,
            'fri' => true,
            'sat' => false,
        ]);

        // Dr. B works Tue/Thu/Sat
        DentistSchedule::create([
            'dentist_code' => 'DENT-B',
            'dentist_name' => 'Dr. B',
            'is_pseudonymous' => true,
            'employment_type' => 'part_time',
            'contract_end_date' => null,
            'status' => 'active',
            'email' => 'dr@gmail.com',
            'temporary_password' => 'temp789012',
            'password_changed' => false,
            'password_changed_at' => null,
            'sun' => false,
            'mon' => false,
            'tue' => true,
            'wed' => false,
            'thu' => true,
            'fri' => false,
            'sat' => true,
        ]);
    }
}
