<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Refund Receipt - Kreative Dental</title>
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
            border-bottom: 3px solid #dc3545;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #dc3545;
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
        .refund-info {
            background-color: #fff3cd;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #ffc107;
        }
        .refund-info h3 {
            margin-top: 0;
            color: #856404;
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
        .refund-amount {
            font-size: 24px;
            font-weight: bold;
            color: #dc3545;
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
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-weight: bold;
            background-color: #d4edda;
            color: #155724;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Kreative Dental & Orthodontics</h1>
            <p>Refund Receipt</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hello {{ $patient_name }},
            </div>
            
            <p>Your refund request has been processed successfully. We have attached your refund receipt for your records.</p>
            
            <div class="refund-info">
                <h3>Refund Summary</h3>
                <div class="info-row">
                    <span class="info-label">Refund Receipt Number:</span>
                    <span class="info-value">{{ $receipt_number }}</span>
                </div>
                @if($appointment_reference)
                <div class="info-row">
                    <span class="info-label">Appointment Reference:</span>
                    <span class="info-value">{{ $appointment_reference }}</span>
                </div>
                @endif
                @if($service_name)
                <div class="info-row">
                    <span class="info-label">Service:</span>
                    <span class="info-value">{{ $service_name }}</span>
                </div>
                @endif
                <div class="info-row">
                    <span class="info-label">Original Amount:</span>
                    <span class="info-value">₱{{ number_format($original_amount, 2) }}</span>
                </div>
                @if($cancellation_fee > 0)
                <div class="info-row">
                    <span class="info-label">Cancellation Fee:</span>
                    <span class="info-value">-₱{{ number_format($cancellation_fee, 2) }}</span>
                </div>
                @endif
                <div class="info-row">
                    <span class="info-label">Refund Amount:</span>
                    <span class="info-value refund-amount">₱{{ number_format($refund_amount, 2) }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="info-value"><span class="status-badge">{{ $refund_status }}</span></span>
                </div>
                @if($processed_at)
                <div class="info-row">
                    <span class="info-label">Processed On:</span>
                    <span class="info-value">{{ $processed_at }}</span>
                </div>
                @endif
            </div>
            
            <p>The refund has been processed and will be credited back to your original payment method. Please allow 3-5 business days for the refund to appear in your account.</p>
            
            <div class="clinic-info">
                <h4>Contact Information</h4>
                <p><strong>Phone:</strong> {{ $clinic_phone }}</p>
                <p><strong>Email:</strong> {{ $clinic_email }}</p>
                <p><strong>Address:</strong> {{ $clinic_address }}</p>
            </div>
            
            <p>If you have any questions about this refund, please don't hesitate to contact us.</p>
            
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

