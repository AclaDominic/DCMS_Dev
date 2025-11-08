<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AppSetting;
use App\Models\PolicyHistory;
use App\Models\Patient;

class PolicySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $privacyPolicy = <<<'POLICY'
**Data Protection Act Compliance**

Kreative Dental Clinic is committed to protecting your privacy and personal information in accordance with the Data Protection Act. We collect, use, store, and process your personal data only for the purpose of providing dental services and managing your patient records.

**Information We Collect:**

- Personal identification information (name, email, contact number)
- Medical and dental history
- Appointment records and treatment information
- Billing and payment information
- Device and usage information when you access our online services

**How We Use Your Information:**

- To provide and improve our dental services
- To schedule and manage appointments
- To communicate with you about your treatment and appointments
- To maintain your medical records as required by law
- To process payments and billing
- To send important updates and notifications

**Data Security:**

We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. Your data is stored securely and access is restricted to authorized personnel only.

**Your Rights:**

- Right to access your personal information
- Right to rectification of inaccurate data
- Right to erasure (in certain circumstances)
- Right to data portability
- Right to object to processing
- Right to withdraw consent

**Data Retention:**

We retain your personal information for as long as necessary to provide our services and as required by applicable laws and regulations. Medical records are typically retained for a minimum period as mandated by law.
POLICY;

        $termsConditions = <<<'TERMS'
**Acceptance of Terms:**

By creating an account and using our services, you agree to comply with and be bound by these Terms and Conditions. If you do not agree with any part of these terms, please do not use our services.

**Account Responsibilities:**

- You are responsible for maintaining the confidentiality of your account credentials
- You must provide accurate and complete information
- You must notify us immediately of any unauthorized use of your account
- You are responsible for all activities that occur under your account

**Appointment Policies:**

- Appointments should be made in advance through the system
- Cancellations should be made at least 24 hours in advance
- Late arrivals may result in rescheduling of your appointment
- Missed appointments without proper notice may incur a fee

**Medical Information:**

The information provided in this system is for your convenience only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult with qualified dental professionals for proper diagnosis and treatment.

**Service Availability:**

We reserve the right to modify, suspend, or discontinue any aspect of the service at any time. We do not guarantee uninterrupted or error-free access to our systems.

**Limitation of Liability:**

To the fullest extent permitted by law, Kreative Dental Clinic shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of our services.

**Changes to Terms:**

We reserve the right to modify these Terms and Conditions at any time. Continued use of our services after changes constitutes acceptance of the modified terms.
TERMS;

        $effectiveDate = '2025-11-06';
        $contactEmail = 'kreativedent@gmail.com';
        $contactPhone = '0927 759 2845';

        AppSetting::set('policy.privacy_policy', $privacyPolicy);
        AppSetting::set('policy.terms_conditions', $termsConditions);
        AppSetting::set('policy.effective_date', $effectiveDate);
        AppSetting::set('policy.contact_email', $contactEmail);
        AppSetting::set('policy.contact_phone', $contactPhone);

        $history = PolicyHistory::updateOrCreate(
            ['effective_date' => $effectiveDate],
            [
                'privacy_policy' => $privacyPolicy,
                'terms_conditions' => $termsConditions,
                'contact_email' => $contactEmail,
                'contact_phone' => $contactPhone,
                'created_by' => null,
            ]
        );

        AppSetting::set('policy.active_history_id', $history->id);

        Patient::query()
            ->whereNull('policy_history_id')
            ->update([
                'policy_history_id' => $history->id,
                'policy_accepted_at' => now(),
            ]);

        $this->command->info('Policy settings seeded successfully.');
    }
}

