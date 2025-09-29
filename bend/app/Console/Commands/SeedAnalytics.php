<?php

namespace App\Console\Commands;

use Database\Seeders\AnalyticsSeeder;
use Illuminate\Console\Command;

class SeedAnalytics extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'analytics:seed {--fresh : Clear existing data before seeding}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Seed comprehensive analytics data for testing admin analytics and monthly reports';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting Analytics Seeder...');
        
        if ($this->option('fresh')) {
            $this->info('Fresh mode: Will clear existing analytics data');
        }
        
        $seeder = new AnalyticsSeeder();
        $seeder->setCommand($this);
        $seeder->run();
        
        $this->info('Analytics seeding completed successfully!');
        $this->info('You can now test the admin analytics dashboard and monthly reports.');
        
        return 0;
    }
}
