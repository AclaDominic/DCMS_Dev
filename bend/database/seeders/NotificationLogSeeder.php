<?php

namespace Database\Seeders;

use App\Models\NotificationLog;
use App\Models\User;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class NotificationLogSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Creating notification logs...');

        // Get admin user for created_by
        $adminUser = User::where('role', 'admin')->first();
        
        if (!$adminUser) {
            $this->command->warn('No admin user found. Skipping NotificationLogSeeder.');
            return;
        }

        // Create sample notification logs for different channels and statuses
        $notificationLogs = [
            // SMS notifications
            [
                'channel' => 'sms',
                'to' => '+639171234567',
                'message' => 'Your appointment is confirmed for tomorrow at 10:00 AM.',
                'status' => 'sent',
                'provider_message_id' => 'SMS_' . uniqid(),
                'error' => null,
                'meta' => [
                    'reason' => 'appointment_confirmation',
                    'appointment_id' => 123,
                    'patient_id' => 456
                ],
                'created_by' => $adminUser->id,
                'created_at' => Carbon::now()->subHours(2),
                'updated_at' => Carbon::now()->subHours(2),
            ],
            [
                'channel' => 'sms',
                'to' => '+639187654321',
                'message' => 'Reminder: Your appointment is scheduled for today at 2:00 PM.',
                'status' => 'sent',
                'provider_message_id' => 'SMS_' . uniqid(),
                'error' => null,
                'meta' => [
                    'reason' => 'appointment_reminder',
                    'appointment_id' => 124,
                    'patient_id' => 457
                ],
                'created_by' => $adminUser->id,
                'created_at' => Carbon::now()->subHours(1),
                'updated_at' => Carbon::now()->subHours(1),
            ],
            [
                'channel' => 'sms',
                'to' => '+639195556789',
                'message' => 'Your appointment has been rescheduled to tomorrow at 11:00 AM.',
                'status' => 'sent',
                'provider_message_id' => 'SMS_' . uniqid(),
                'error' => null,
                'meta' => [
                    'reason' => 'appointment_reschedule',
                    'appointment_id' => 125,
                    'patient_id' => 458
                ],
                'created_by' => $adminUser->id,
                'created_at' => Carbon::now()->subMinutes(30),
                'updated_at' => Carbon::now()->subMinutes(30),
            ],
            // Failed SMS notifications
            [
                'channel' => 'sms',
                'to' => '+639111111111',
                'message' => 'Your appointment reminder.',
                'status' => 'failed',
                'provider_message_id' => null,
                'error' => 'Invalid phone number format',
                'meta' => [
                    'reason' => 'appointment_reminder',
                    'appointment_id' => 126,
                    'patient_id' => 459
                ],
                'created_by' => $adminUser->id,
                'created_at' => Carbon::now()->subMinutes(45),
                'updated_at' => Carbon::now()->subMinutes(45),
            ],
            [
                'channel' => 'sms',
                'to' => '+639999999999',
                'message' => 'Your appointment confirmation.',
                'status' => 'failed',
                'provider_message_id' => null,
                'error' => 'Phone number not reachable',
                'meta' => [
                    'reason' => 'appointment_confirmation',
                    'appointment_id' => 127,
                    'patient_id' => 460
                ],
                'created_by' => $adminUser->id,
                'created_at' => Carbon::now()->subMinutes(15),
                'updated_at' => Carbon::now()->subMinutes(15),
            ],
            // Pending notifications
            [
                'channel' => 'sms',
                'to' => '+639176543210',
                'message' => 'Your appointment is tomorrow at 9:00 AM.',
                'status' => 'pending',
                'provider_message_id' => null,
                'error' => null,
                'meta' => [
                    'reason' => 'appointment_reminder',
                    'appointment_id' => 128,
                    'patient_id' => 461
                ],
                'created_by' => $adminUser->id,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            // Blocked sandbox notifications (for testing)
            [
                'channel' => 'sms',
                'to' => '+639123456789',
                'message' => 'Test message for sandbox environment.',
                'status' => 'blocked_sandbox',
                'provider_message_id' => null,
                'error' => 'Sandbox environment - message blocked',
                'meta' => [
                    'reason' => 'test',
                    'test_mode' => true
                ],
                'created_by' => $adminUser->id,
                'created_at' => Carbon::now()->subMinutes(5),
                'updated_at' => Carbon::now()->subMinutes(5),
            ],
            // Email notifications (if email channel is used)
            [
                'channel' => 'email',
                'to' => 'patient@example.com',
                'message' => 'Your appointment receipt has been generated.',
                'status' => 'sent',
                'provider_message_id' => 'EMAIL_' . uniqid(),
                'error' => null,
                'meta' => [
                    'reason' => 'receipt_generation',
                    'appointment_id' => 129,
                    'patient_id' => 462,
                    'receipt_id' => 'REC-' . uniqid()
                ],
                'created_by' => $adminUser->id,
                'created_at' => Carbon::now()->subMinutes(10),
                'updated_at' => Carbon::now()->subMinutes(10),
            ],
        ];

        // Insert notification logs
        foreach ($notificationLogs as $log) {
            NotificationLog::create($log);
        }

        $this->command->info('Created ' . count($notificationLogs) . ' notification log entries.');
        $this->command->info('Notification logs include various statuses: sent, failed, pending, and blocked_sandbox.');
    }
}
