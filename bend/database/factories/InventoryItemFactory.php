<?php

namespace Database\Factories;

use App\Models\InventoryBatch;
use App\Models\InventoryItem;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<\App\Models\InventoryItem>
 */
class InventoryItemFactory extends Factory
{
    protected $model = InventoryItem::class;

    public function definition(): array
    {
        return [
            'name' => Str::title($this->faker->words(3, true)),
            'sku_code' => strtoupper($this->faker->unique()->bothify('SKU-#####')),
            'type' => $this->faker->randomElement(['drug', 'equipment', 'supply', 'other']),
            'unit' => $this->faker->randomElement(['pcs', 'ml', 'g']),
            'low_stock_threshold' => $this->faker->numberBetween(0, 10),
            'default_pack_size' => $this->faker->optional()->randomFloat(3, 1, 50),
            'is_controlled' => false,
            'is_sellable' => $this->faker->boolean(30),
            'patient_price' => $this->faker->optional()->randomFloat(2, 100, 2000),
            'sellable_notes' => null,
            'is_active' => true,
            'created_by' => null,
            'notes' => null,
        ];
    }

    public function configure(): static
    {
        return $this->afterCreating(function (InventoryItem $item) {
            $total = $item->getFactoryTotalOnHand();

            if ($total === null) {
                return;
            }

            InventoryBatch::create([
                'item_id' => $item->id,
                'lot_number' => strtoupper($this->faker->bothify('LOT-#####')),
                'batch_number' => strtoupper($this->faker->bothify('BATCH-#####')),
                'expiry_date' => null,
                'qty_received' => $total,
                'qty_on_hand' => $total,
                'cost_per_unit' => $this->faker->randomFloat(2, 10, 200),
                'supplier_id' => null,
                'invoice_no' => null,
                'invoice_date' => null,
                'received_at' => now(),
                'received_by' => null,
                'pack_size' => null,
            ]);
        });
    }
}

