<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Appointment Reminder - Kreative Dental</title>
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
            background-color: #2563eb;
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
            border-left: 4px solid #2563eb;
        }
        .appointment-info h3 {
            margin-top: 0;
            color: #2563eb;
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
            background-color: #e0f2fe;
            border: 1px solid #0891b2;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            text-align: center;
        }
        .reference-code h4 {
            margin-top: 0;
            color: #0891b2;
        }
        .reference-code .code {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            letter-spacing: 2px;
        }
        .reminder-note {
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .reminder-note h4 {
            margin-top: 0;
            color: #856404;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
            border-top: 1px solid #eee;
            padding-top: 20px;
        }
        .contact-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Appointment Reminder</h1>
            <p>Kreative Dental</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                <h2>Hello {{ $patient->first_name }} {{ $patient->last_name }},</h2>
            </div>
            
            @if($daysBefore == 0)
                <p><strong>You have an appointment today!</strong></p>
            @elseif($daysBefore == 1)
                <p><strong>This is a friendly reminder that you have an appointment tomorrow.</strong></p>
            @else
                <p><strong>This is a friendly reminder that you have an appointment in {{ $daysBefore }} days.</strong></p>
            @endif
            
            <div class="appointment-info">
                <h3>Appointment Details</h3>
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
                @if($service && $service->price)
                <div class="info-row">
                    <span class="info-label">Estimated Cost:</span>
                    <span class="info-value">₱{{ number_format($service->price, 2) }}</span>
                </div>
                @endif
            </div>
            
            <div class="reference-code">
                <h4>Your Reference Code</h4>
                <div class="code">{{ $referenceCode }}</div>
                <p style="margin-bottom: 0; font-size: 14px; color: #666;">Please bring this code with you to your appointment</p>
            </div>
            
            @if($daysBefore == 0)
            <div class="reminder-note">
                <h4>📅 Today's Appointment</h4>
                <p>Your appointment is scheduled for today at <strong>{{ $appointmentTime }}</strong>. Please arrive 10-15 minutes early to complete any necessary paperwork.</p>
            </div>
            @elseif($daysBefore == 1)
            <div class="reminder-note">
                <h4>⏰ Tomorrow's Appointment</h4>
                <p>Your appointment is scheduled for tomorrow at <strong>{{ $appointmentTime }}</strong>. Please arrive 10-15 minutes early to complete any necessary paperwork.</p>
            </div>
            @else
            <div class="reminder-note">
                <h4>📋 Upcoming Appointment</h4>
                <p>Your appointment is scheduled for {{ $appointmentDate }} at <strong>{{ $appointmentTime }}</strong>. Please arrive 10-15 minutes early to complete any necessary paperwork.</p>
            </div>
            @endif
            
            <div class="contact-info">
                <h4>Need to Reschedule or Cancel?</h4>
                <p>If you need to reschedule or cancel your appointment, please contact us as soon as possible:</p>
                <p><strong>Phone:</strong> [Clinic Phone Number]<br>
                <strong>Email:</strong> [Clinic Email]</p>
            </div>
            
            <p>We look forward to seeing you at your appointment!</p>
            
            <p>Best regards,<br>
            <strong>Kreative Dental Team</strong></p>
        </div>
        
        <div class="footer">
            <p>This is an automated reminder. Please do not reply to this email.</p>
            <p>If you have any questions, please contact our clinic directly.</p>
        </div>
    </div>
</body>
</html>
