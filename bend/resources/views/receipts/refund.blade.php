<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Refund Receipt - {{ $receipt_number }}</title>
    <style>
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            font-size: 12px;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #dc3545;
            padding-bottom: 15px;
            margin-bottom: 25px;
        }
        .header h1 {
            color: #dc3545;
            margin: 0;
            font-size: 24px;
        }
        .header p {
            color: #666;
            margin: 5px 0 0 0;
            font-size: 14px;
        }
        .receipt-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 25px;
        }
        .receipt-details, .clinic-details {
            width: 48%;
        }
        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #dc3545;
            margin-bottom: 10px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            padding: 3px 0;
        }
        .info-label {
            font-weight: bold;
            color: #555;
        }
        .info-value {
            color: #333;
        }
        .patient-section, .appointment-section, .refund-section {
            margin-bottom: 25px;
        }
        .refund-details {
            background-color: #fff3cd;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #ffc107;
        }
        .refund-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .refund-table th,
        .refund-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        .refund-table th {
            background-color: #f8f9fa;
            font-weight: bold;
            color: #dc3545;
        }
        .total-row {
            background-color: #d4edda;
            font-weight: bold;
        }
        .amount {
            font-size: 16px;
            font-weight: bold;
            color: #28a745;
        }
        .refund-amount {
            font-size: 18px;
            font-weight: bold;
            color: #dc3545;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 10px;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 11px;
        }
        .status-processed {
            background-color: #d4edda;
            color: #155724;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $clinic_name }}</h1>
        <p>Refund Receipt</p>
    </div>
    
    <div class="receipt-info">
        <div class="receipt-details">
            <div class="section-title">Receipt Information</div>
            <div class="info-row">
                <span class="info-label">Receipt No:</span>
                <span class="info-value">{{ $receipt_number }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Date:</span>
                <span class="info-value">{{ $receipt_date }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Time:</span>
                <span class="info-value">{{ $receipt_time }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Refund Request ID:</span>
                <span class="info-value">#{{ $refund_request_id }}</span>
            </div>
        </div>
        
        <div class="clinic-details">
            <div class="section-title">Clinic Information</div>
            <div class="info-row">
                <span class="info-label">Address:</span>
                <span class="info-value">{{ $clinic_address }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Phone:</span>
                <span class="info-value">{{ $clinic_phone }}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Email:</span>
                <span class="info-value">{{ $clinic_email }}</span>
            </div>
        </div>
    </div>
    
    <div class="patient-section">
        <div class="section-title">Patient Information</div>
        <div class="info-row">
            <span class="info-label">Name:</span>
            <span class="info-value">{{ $patient_name }}</span>
        </div>
        @if($patient_email)
        <div class="info-row">
            <span class="info-label">Email:</span>
            <span class="info-value">{{ $patient_email }}</span>
        </div>
        @endif
        @if($patient_phone)
        <div class="info-row">
            <span class="info-label">Phone:</span>
            <span class="info-value">{{ $patient_phone }}</span>
        </div>
        @endif
    </div>

    @if($appointment_id)
    <div class="appointment-section">
        <div class="section-title">Original Appointment Information</div>
        <div class="info-row">
            <span class="info-label">Appointment Reference:</span>
            <span class="info-value">{{ $appointment_reference }}</span>
        </div>
        @if($service_name)
        <div class="info-row">
            <span class="info-label">Service:</span>
            <span class="info-value">{{ $service_name }}</span>
        </div>
        @endif
        @if($appointment_date)
        <div class="info-row">
            <span class="info-label">Appointment Date:</span>
            <span class="info-value">{{ $appointment_date }}</span>
        </div>
        @endif
        @if($appointment_time)
        <div class="info-row">
            <span class="info-label">Time Slot:</span>
            <span class="info-value">{{ $appointment_time }}</span>
        </div>
        @endif
    </div>
    @endif
    
    <div class="refund-section">
        <div class="section-title">Refund Information</div>
        <div class="refund-details">
            <table class="refund-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Original Payment Amount</td>
                        <td>₱{{ number_format($original_amount, 2) }}</td>
                    </tr>
                    @if($cancellation_fee > 0)
                    <tr>
                        <td>Cancellation Fee</td>
                        <td>-₱{{ number_format($cancellation_fee, 2) }}</td>
                    </tr>
                    @endif
                    <tr class="total-row">
                        <td><strong>Refund Amount</strong></td>
                        <td class="refund-amount">₱{{ number_format($refund_amount, 2) }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div style="margin-top: 15px;">
            <div class="info-row">
                <span class="info-label">Refund Status:</span>
                <span class="info-value">
                    <span class="status-badge status-processed">{{ $refund_status }}</span>
                </span>
            </div>
            @if($reason)
            <div class="info-row">
                <span class="info-label">Reason:</span>
                <span class="info-value">{{ $reason }}</span>
            </div>
            @endif
            @if($requested_at)
            <div class="info-row">
                <span class="info-label">Requested At:</span>
                <span class="info-value">{{ $requested_at }}</span>
            </div>
            @endif
            @if($approved_at)
            <div class="info-row">
                <span class="info-label">Approved At:</span>
                <span class="info-value">{{ $approved_at }}</span>
            </div>
            @endif
            @if($processed_at)
            <div class="info-row">
                <span class="info-label">Processed At:</span>
                <span class="info-value">{{ $processed_at }}</span>
            </div>
            @endif
            <div class="info-row">
                <span class="info-label">Payment Method:</span>
                <span class="info-value">{{ $payment_method }}</span>
            </div>
            @if($payment_reference)
            <div class="info-row">
                <span class="info-label">Payment Reference:</span>
                <span class="info-value">{{ $payment_reference }}</span>
            </div>
            @endif
        </div>
    </div>
    
    @if($admin_notes)
    <div style="margin-top: 20px; padding: 10px; background-color: #e7f3ff; border: 1px solid #b3d9ff; border-radius: 5px;">
        <h4 style="margin: 0 0 10px 0; color: #004085;">Admin Notes</h4>
        <p style="margin: 0;">{{ $admin_notes }}</p>
    </div>
    @endif
    
    <div class="footer">
        <p><strong>Thank you for choosing Kreative Dental & Orthodontics!</strong></p>
        <p>This refund receipt confirms that your refund has been processed.</p>
        <p>For inquiries, please contact us at {{ $clinic_phone }} or {{ $clinic_email }}</p>
        <p>Generated on {{ $receipt_date }} at {{ $receipt_time }}</p>
    </div>
</body>
</html>

