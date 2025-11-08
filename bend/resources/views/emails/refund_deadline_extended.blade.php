<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Refund Deadline Extended</title>
</head>
<body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
    <h2 style="color: #0f172a;">Hi {{ $patient?->first_name ?? 'there' }},</h2>
    <p>We’ve updated the pickup deadline for your refund (ID: {{ $refundRequest->id }}).</p>
    <p><strong>Previous deadline:</strong> {{ optional($old_deadline)->format('F d, Y') ?? 'N/A' }}<br>
       <strong>New deadline:</strong> {{ optional($new_deadline)->format('F d, Y') ?? optional($deadline_at)->format('F d, Y') }}</p>
    <p><strong>Reason:</strong> {{ $extension_reason }}</p>
    <p>Please visit the clinic to claim the refund amount of ₱{{ number_format($refund_amount, 2) }} on or before the new deadline.</p>
    <p>If you need more assistance, feel free to reply to this email or reach out to our team.</p>
    <p style="margin-top: 24px;">Warm regards,<br>
    <strong>Kreative Dental & Orthodontics Team</strong></p>
</body>
</html>

