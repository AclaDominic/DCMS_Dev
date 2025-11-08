<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("ALTER TABLE appointments MODIFY COLUMN payment_status ENUM('unpaid','awaiting_payment','paid','refunded') DEFAULT 'unpaid'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE appointments MODIFY COLUMN payment_status ENUM('unpaid','awaiting_payment','paid') DEFAULT 'unpaid'");
    }
};
