<?php

namespace Database\Factories;

use App\Models\Patient;
use App\Models\PatientVisit;
use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PatientVisit>
 */
class PatientVisitFactory extends Factory
{
    protected $model = PatientVisit::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'patient_id' => Patient::factory(),
            'service_id' => Service::factory(),
            'visit_date' => $this->faker->date(),
            'start_time' => $this->faker->dateTime(),
            'end_time' => null,
            'status' => 'pending',
            'visit_code' => $this->faker->unique()->regexify('[A-Z0-9]{6}'),
            'consultation_started_at' => null,
        ];
    }

    /**
     * Indicate that the visit is completed.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
            'end_time' => $this->faker->dateTime(),
            'visit_code' => null, // Code cleared on completion
        ]);
    }
}
