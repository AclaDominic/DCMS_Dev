<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Password Reset - Kreative Dental</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #2563eb;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f8fafc;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }
        .credentials {
            background-color: #e0f2fe;
            border: 1px solid #0891b2;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Password Reset</h1>
        <p>Kreative Dental</p>
    </div>
    
    <div class="content">
        <h2>Hello {{ $dentist->dentist_name }},</h2>
        
        <p>Your password has been reset by an administrator. Please use the new temporary password below to log in:</p>
        
        <div class="credentials">
            <h3>New Login Credentials:</h3>
            <p><strong>Email:</strong> {{ $dentist->email }}</p>
            <p><strong>New Temporary Password:</strong> {{ $temporaryPassword }}</p>
        </div>
        
        <p><strong>Important:</strong> Please change your password after logging in for security purposes.</p>
        
        <p>If you have any questions or need assistance, please contact the clinic administrator.</p>
        
        <p>Best regards,<br>
        Kreative Dental Team</p>
    </div>
    
    <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
    </div>
</body>
</html>
