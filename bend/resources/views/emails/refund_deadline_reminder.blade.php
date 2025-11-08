<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Refund Pickup Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
    <h2 style="color: #0f172a;">Hi {{ $patient?->first_name ?? 'there' }},</h2>
    <p>This is a friendly reminder that your refund for appointment reference
        <strong>{{ $appointment?->reference_code ?? ('REF-' . $refundRequest->id) }}</strong>
        is ready for pickup.</p>
    <p><strong>Amount:</strong> ₱{{ number_format($refund_amount, 2) }}<br>
       <strong>Pickup deadline:</strong> {{ optional($deadline_at)->format('F d, Y') ?? 'N/A' }}</p>
    <p>Please drop by the clinic before the deadline to claim your refund. Bring a valid ID or send an authorized representative with a signed letter and ID copy.</p>
    <p>If you need help or have questions, feel free to reply to this email or call us at +63 123 456 7890.</p>
    <p style="margin-top: 24px;">Thank you,<br>
    <strong>Kreative Dental & Orthodontics Team</strong></p>
</body>
</html>

