<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
        DB::statement("ALTER TABLE appointments MODIFY COLUMN payment_status ENUM('unpaid','awaiting_payment','paid','refunded') DEFAULT 'unpaid'");
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
        DB::statement("ALTER TABLE appointments MODIFY COLUMN payment_status ENUM('unpaid','awaiting_payment','paid') DEFAULT 'unpaid'");
        }
    }
};
