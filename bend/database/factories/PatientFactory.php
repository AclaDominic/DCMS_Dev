<?php

namespace Database\Factories;

use App\Models\Patient;
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
            'user_id' => null,
            'first_name' => $this->faker->firstName(),
            'last_name' => $this->faker->lastName(),
            'middle_name' => $this->faker->optional()->firstName(),
            'birthdate' => $this->faker->optional()->date('Y-m-d', '-18 years'),
            'sex' => $this->faker->optional()->randomElement(['male', 'female']),
            'contact_number' => $this->faker->optional()->phoneNumber(),
            'address' => $this->faker->optional()->address(),
            'is_linked' => false,
            'flag_manual_review' => false,
            'policy_history_id' => null,
            'policy_accepted_at' => null,
        ];
    }
}