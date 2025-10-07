<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt - Kreative Dental</title>
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
            text-align: center;
            border-bottom: 3px solid #0077be;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #0077be;
            margin: 0;
            font-size: 28px;
        }
        .header p {
            color: #666;
            margin: 5px 0 0 0;
            font-size: 16px;
        }
        .content {
            margin-bottom: 30px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #333;
        }
        .receipt-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #0077be;
        }
        .receipt-info h3 {
            margin-top: 0;
            color: #0077be;
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
        .amount {
            font-size: 20px;
            font-weight: bold;
            color: #28a745;
        }
        .footer {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
        }
        .footer p {
            margin: 5px 0;
        }
        .clinic-info {
            background-color: #e3f2fd;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
        }
        .clinic-info h4 {
            margin: 0 0 10px 0;
            color: #0077be;
        }
        .clinic-info p {
            margin: 5px 0;
            color: #555;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Kreative Dental & Orthodontics</h1>
            <p>Your Receipt is Attached</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hello {{ $patient_name }},
            </div>
            
            <p>Thank you for visiting Kreative Dental & Orthodontics. We have attached your receipt for the services provided.</p>
            
            <div class="receipt-info">
                <h3>Receipt Summary</h3>
                <div class="info-row">
                    <span class="info-label">Receipt Number:</span>
                    <span class="info-value">{{ $receipt_number }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Service:</span>
                    <span class="info-value">{{ $service_name }}</span>
                </div>
                @if($receipt_type === 'appointment')
                <div class="info-row">
                    <span class="info-label">Appointment Date:</span>
                    <span class="info-value">{{ $service_date }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Time:</span>
                    <span class="info-value">{{ $service_time }}</span>
                </div>
                @else
                <div class="info-row">
                    <span class="info-label">Visit Date:</span>
                    <span class="info-value">{{ $visit_date }}</span>
                </div>
                @if($start_time && $end_time)
                <div class="info-row">
                    <span class="info-label">Duration:</span>
                    <span class="info-value">{{ $start_time }} - {{ $end_time }}</span>
                </div>
                @endif
                @endif
                <div class="info-row">
                    <span class="info-label">Total Amount:</span>
                    <span class="info-value amount">₱{{ number_format($total_amount, 2) }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Payment Status:</span>
                    <span class="info-value">{{ $payment_status ?? 'Paid' }}</span>
                </div>
            </div>
            
            <p>Please keep this receipt for your records. If you have any questions about your treatment or billing, please don't hesitate to contact us.</p>
            
            <div class="clinic-info">
                <h4>Contact Information</h4>
                <p><strong>Phone:</strong> {{ $clinic_phone }}</p>
                <p><strong>Email:</strong> {{ $clinic_email }}</p>
                <p><strong>Address:</strong> {{ $clinic_address }}</p>
            </div>
            
            <p>We appreciate your trust in our dental care services and look forward to serving you again.</p>
            
            <p>Best regards,<br>
            <strong>Kreative Dental & Orthodontics Team</strong></p>
        </div>
        
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>If you have any questions, please contact us directly at {{ $clinic_phone }} or {{ $clinic_email }}</p>
        </div>
    </div>
</body>
</html>
