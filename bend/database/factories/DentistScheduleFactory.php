<?php

namespace Database\Factories;

use App\Models\DentistSchedule;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<\App\Models\DentistSchedule>
 */
class DentistScheduleFactory extends Factory
{
    protected $model = DentistSchedule::class;

    public function definition(): array
    {
        return [
            'dentist_code' => strtoupper($this->faker->unique()->bothify('DS-###')),
            'dentist_name' => $this->faker->name(),
            'is_pseudonymous' => false,
            'employment_type' => $this->faker->randomElement(['full_time', 'part_time']),
            'contract_end_date' => null,
            'status' => 'active',
            'email' => $this->faker->unique()->safeEmail(),
            'temporary_password' => null,
            'password_changed' => true,
            'password_changed_at' => now(),
            'sun' => false,
            'mon' => true,
            'tue' => true,
            'wed' => true,
            'thu' => true,
            'fri' => true,
            'sat' => false,
        ];
    }
}

