<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Appointment No-Show Notification - Kreative Dental</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .email-container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #dc2626;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
            margin: -30px -30px 30px -30px;
        }
        .content {
            margin-bottom: 30px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #333;
        }
        .appointment-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #dc2626;
        }
        .appointment-info h3 {
            margin-top: 0;
            color: #dc2626;
            font-size: 18px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 5px 0;
            border-bottom: 1px solid #eee;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .info-label {
            font-weight: bold;
            color: #555;
        }
        .info-value {
            color: #333;
        }
        .reference-code {
            background-color: #fef2f2;
            border: 1px solid #fca5a5;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            text-align: center;
        }
        .reference-code h4 {
            margin-top: 0;
            color: #dc2626;
        }
        .reference-code .code {
            font-size: 24px;
            font-weight: bold;
            color: #dc2626;
            letter-spacing: 2px;
        }
        .no-show-notice {
            background-color: #fef2f2;
            border: 1px solid #fca5a5;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .no-show-notice h4 {
            margin-top: 0;
            color: #dc2626;
        }
        .maya-payment-notice {
            background-color: #f0f9ff;
            border: 1px solid #0ea5e9;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .maya-payment-notice h4 {
            margin-top: 0;
            color: #0ea5e9;
        }
        .reschedule-info {
            background-color: #f0fdf4;
            border: 1px solid #22c55e;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .reschedule-info h4 {
            margin-top: 0;
            color: #16a34a;
        }
        .contact-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            text-align: center;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
            border-top: 1px solid #eee;
            padding-top: 20px;
        }
        .button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Appointment No-Show Notification</h1>
            <p>Kreative Dental</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                <h2>Hello {{ $patient->first_name }} {{ $patient->last_name }},</h2>
            </div>
            
            <div class="no-show-notice">
                <h4>⚠️ Appointment No-Show</h4>
                <p>We noticed that you missed your scheduled appointment. We understand that sometimes unexpected circumstances arise, and we want to help you get back on track with your dental care.</p>
            </div>
            
            <div class="appointment-info">
                <h3>Missed Appointment Details</h3>
                <div class="info-row">
                    <span class="info-label">Date:</span>
                    <span class="info-value">{{ $appointmentDate }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Time:</span>
                    <span class="info-value">{{ $appointmentTime }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Service:</span>
                    <span class="info-value">{{ $service->name ?? 'To be confirmed' }}</span>
                </div>
                @if($paymentAmount)
                <div class="info-row">
                    <span class="info-label">Amount Paid:</span>
                    <span class="info-value">₱{{ number_format($paymentAmount, 2) }}</span>
                </div>
                @endif
            </div>
            
            <div class="reference-code">
                <h4>Your Reference Code</h4>
                <div class="code">{{ $referenceCode }}</div>
                <p style="margin-bottom: 0; font-size: 14px; color: #666;">Please keep this code for your records</p>
            </div>
            
            @if($isMayaPayment)
            <div class="maya-payment-notice">
                <h4>💰 Maya Payment Detected</h4>
                <p>We see that you paid for this appointment through Maya. Since you've already paid, you have the following options:</p>
                <ul>
                    <li><strong>Visit the clinic:</strong> Please come to our clinic to receive the service you've already paid for</li>
                    <li><strong>Reschedule online:</strong> You can reschedule this appointment through your patient account</li>
                </ul>
            </div>
            
            <div class="reschedule-info">
                <h4>🔄 Reschedule Your Appointment</h4>
                <p>Since you've already paid for this appointment, you can easily reschedule it online:</p>
                <ol>
                    <li>Log in to your patient account</li>
                    <li>Go to your appointments section</li>
                    <li>Find this appointment and click "Reschedule"</li>
                    <li>Choose a new date and time that works for you</li>
                </ol>
                <p><strong>Note:</strong> You can reschedule to any available date within the next 7 days.</p>
            </div>
            @else
            <div class="contact-info">
                <h4>Need to Reschedule?</h4>
                <p>If you'd like to reschedule your appointment, please contact us:</p>
                <p><strong>Phone:</strong> [Clinic Phone Number]<br>
                <strong>Email:</strong> [Clinic Email]</p>
            </div>
            @endif
            
            <div class="contact-info">
                <h4>Questions or Concerns?</h4>
                <p>If you have any questions about this appointment or need assistance, please don't hesitate to contact us:</p>
                <p><strong>Phone:</strong> [Clinic Phone Number]<br>
                <strong>Email:</strong> [Clinic Email]</p>
            </div>
            
            <p>We look forward to seeing you soon and helping you maintain your dental health!</p>
            
            <p>Best regards,<br>
            <strong>Kreative Dental Team</strong></p>
        </div>
        
        <div class="footer">
            <p>This is an automated notification. Please do not reply to this email.</p>
            <p>If you have any questions, please contact our clinic directly.</p>
        </div>
    </div>
</body>
</html>
