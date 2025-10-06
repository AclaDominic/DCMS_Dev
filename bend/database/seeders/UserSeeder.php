<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use DB;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        \DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        User::truncate();
        \DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $users = [
            [
                'name' => 'Admin User',
                'email' => 'admin@gmail.com',
                'password' => Hash::make('password'),
                'role' => 'admin',
            ],
            [
                'name' => 'Frontdesk Staff',
                'email' => 'staff@gmail.com',
                'password' => Hash::make('password'),
                'role' => 'staff',
            ],
            [
                'name' => 'Juan Patient',
                'email' => 'juan.patient@gmail.com',
                'password' => Hash::make('password'),
                'role' => 'patient',
            ],
            [
                'name' => 'Maria Patient',
                'email' => 'maria.patient@gmail.com',
                'password' => Hash::make('password'),
                'role' => 'patient',
            ],
            [
                'name' => 'Dr. A',
                'email' => 'd@gmail.com',
                'password' => Hash::make('password'),
                'role' => 'dentist',
                'email_verified_at' => now(),
            ],
            [
                'name' => 'Dr. B',
                'email' => 'dr@gmail.com',
                'password' => Hash::make('temp789012'),
                'role' => 'dentist',
                'email_verified_at' => null,
            ],
        ];

        foreach ($users as $user) {
            User::create($user);
        }
    }
}
   

