<?php

namespace Database\Factories;

use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Patient>
 */
class PatientFactory extends Factory
{
    protected $model = Patient::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'first_name' => $this->faker->firstName(),
            'last_name' => $this->faker->lastName(),
            'middle_name' => $this->faker->optional()->firstName(),
            'birthdate' => $this->faker->date(),
            'sex' => $this->faker->randomElement(['male', 'female']),
            'contact_number' => $this->faker->phoneNumber(),
            'address' => $this->faker->address(),
            'is_linked' => true,
            'flag_manual_review' => false,
        ];
    }
}
