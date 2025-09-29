<?php

namespace App\Console\Commands;

use Carbon\Carbon;
use App\Models\ServiceDiscount;
use Illuminate\Console\Command;
use App\Services\SystemLogService;

class AutoCancelExpiredPromos extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'promos:auto-cancel-expired';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically cancel planned promos that have passed their start date';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $today = Carbon::today();

        $expiredPromos = ServiceDiscount::with('service')
            ->where('status', 'planned')
            ->whereDate('start_date', '<', $today)
            ->get();

        $canceledCount = 0;

        foreach ($expiredPromos as $promo) {
            $promo->status = 'canceled';
            $promo->save();

            // Log the automatic cancellation
            SystemLogService::logSystem(
                'promo_auto_canceled',
                "Planned promo for {$promo->service->name} was automatically canceled due to start date having passed",
                [
                    'promo_id' => $promo->id, 
                    'service_id' => $promo->service_id, 
                    'start_date' => $promo->start_date,
                    'auto_canceled_at' => now()->toDateTimeString()
                ]
            );

            $canceledCount++;
        }

        if ($canceledCount > 0) {
            $this->info("Automatically canceled {$canceledCount} expired planned promo(s).");
        } else {
            $this->info("No expired planned promos found.");
        }

        return self::SUCCESS;
    }
}
