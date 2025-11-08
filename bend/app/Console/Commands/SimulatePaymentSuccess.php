<?php

namespace App\Console\Commands;

use App\Models\Payment;
use Illuminate\Console\Command;

class SimulatePaymentSuccess extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'payment:simulate-success
                            {payment_id : ID column value from the payments table}
                            {--force : Reapply even if the payment is already marked paid}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Mark a payment (and linked appointment) as successfully paid for testing or demo purposes.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $paymentId = (int) $this->argument('payment_id');

        /** @var \App\Models\Payment|null $payment */
        $payment = Payment::with('appointment')->find($paymentId);

        if (!$payment) {
            $this->error("Payment #{$paymentId} was not found.");
            return self::FAILURE;
        }

        $this->info("Payment #{$payment->id} (method: {$payment->method}, status: {$payment->status})");
        $alreadyPaid = $payment->status === Payment::STATUS_PAID;

        if ($alreadyPaid && !$this->option('force')) {
            if (!$this->confirm('This payment is already marked paid. Reapply anyway?')) {
                $this->warn('No changes made.');
                return self::SUCCESS;
            }
        }

        $payment->forceFill([
            'status'      => Payment::STATUS_PAID,
            'amount_paid' => $payment->amount_due,
            'paid_at'     => now(),
        ])->save();

        if ($payment->appointment) {
            $payment->appointment->update(['payment_status' => Payment::STATUS_PAID]);
            $this->info("Linked appointment #{$payment->appointment->id} payment_status set to paid.");
        }

        $this->info('Payment marked as paid.');

        return self::SUCCESS;
    }
}

