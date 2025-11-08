<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Refund Ready for Pickup</title>
</head>
<body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
    <h2 style="color: #0f172a;">Hi {{ $patient?->first_name ?? 'there' }},</h2>
    <p>Your refund request (ID: {{ $refundRequest->id }}) has been processed and is now ready for pickup at the clinic.</p>
    <p><strong>Amount:</strong> ₱{{ number_format($refund_amount, 2) }}<br>
       <strong>Pickup deadline:</strong> {{ optional($deadline_at)->format('F d, Y') ?? 'N/A' }}</p>
    @if($service)
        <p>This refund is linked to your appointment for <strong>{{ $service->name }}</strong>.</p>
    @endif
    <p>Please visit the clinic reception desk and present a valid ID to claim your refund.</p>
    <p>If you are unable to claim it personally, you may authorize a representative with a signed authorization letter and a copy of your ID.</p>
    <p style="margin-top: 24px;">We look forward to seeing you soon.<br>
    <strong>Kreative Dental & Orthodontics Team</strong></p>
</body>
</html>

