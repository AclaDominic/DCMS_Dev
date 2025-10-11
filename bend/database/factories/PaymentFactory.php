<?php

namespace Database\Factories;

use App\Models\Payment;
use App\Models\PatientVisit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Payment>
 */
class PaymentFactory extends Factory
{
    protected $model = Payment::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'appointment_id' => null,
            'patient_visit_id' => PatientVisit::factory(),
            'currency' => 'PHP',
            'amount_due' => $this->faker->randomFloat(2, 100, 5000),
            'amount_paid' => $this->faker->randomFloat(2, 100, 5000),
            'method' => $this->faker->randomElement(['cash', 'hmo', 'maya']),
            'status' => $this->faker->randomElement(['unpaid', 'awaiting_payment', 'paid', 'cancelled', 'failed']),
            'reference_no' => $this->faker->unique()->regexify('[A-Z0-9]{10}'),
            'maya_checkout_id' => $this->faker->optional()->uuid(),
            'maya_payment_id' => $this->faker->optional()->uuid(),
            'paid_at' => $this->faker->optional()->dateTimeBetween('-1 month', 'now'),
        ];
    }

    /**
     * Indicate that the payment is paid.
     */
    public function paid(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'paid',
            'paid_at' => $this->faker->dateTimeBetween('-1 month', 'now'),
        ]);
    }

    /**
     * Indicate that the payment is cash.
     */
    public function cash(): static
    {
        return $this->state(fn (array $attributes) => [
            'method' => 'cash',
        ]);
    }

    /**
     * Indicate that the payment is HMO.
     */
    public function hmo(): static
    {
        return $this->state(fn (array $attributes) => [
            'method' => 'hmo',
        ]);
    }

    /**
     * Indicate that the payment is Maya.
     */
    public function maya(): static
    {
        return $this->state(fn (array $attributes) => [
            'method' => 'maya',
        ]);
    }
}
