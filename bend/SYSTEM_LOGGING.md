# System Logging Documentation

## Overview

The system logging feature provides comprehensive tracking of all important actions and events within the DCMS application. Logs are stored in the `system_logs` table and can be viewed through the admin panel at `/admin/system-logs`.

## Table of Contents

1. [Architecture](#architecture)
2. [Log Categories](#log-categories)
3. [Log Actions by Category](#log-actions-by-category)
4. [Usage Examples](#usage-examples)
5. [Context Data Reference](#context-data-reference)
6. [Viewing Logs](#viewing-logs)

---

## Architecture

### Components

- **Model**: `App\Models\SystemLog`
- **Service**: `App\Services\SystemLogService`
- **Controller**: `App\Http\Controllers\Admin\SystemLogController`
- **Frontend**: `fend/src/pages/Admin/SystemLogsPage.jsx`

### Database Schema

```sql
system_logs
├── id (bigint, primary key)
├── user_id (bigint, nullable) - Who performed the action
├── category (string) - Type of entity/module
├── action (string) - What action was performed
├── subject_id (bigint, nullable) - ID of the affected entity
├── message (text) - Human-readable description
├── context (json) - Additional structured data
├── created_at (timestamp)
└── updated_at (timestamp)
```

---

## Log Categories

| Category | Description | Related Entity |
|----------|-------------|----------------|
| `appointment` | Appointment bookings and management | Appointments |
| `auth` | Authentication events (login, logout, registration) | Users |
| `dentist` | Dentist profile and schedule management | Dentist Schedules |
| `device` | Device registration and approval | Staff Devices |
| `inventory` | Inventory and stock management | Inventory Items |
| `patient` | Patient record management | Patients |
| `patient_manager` | Patient blocking, warnings, no-show tracking | Patient Manager |
| `payment` | Payment processing and transactions | Payments |
| `service` | Dental service CRUD operations | Services |
| `staff` | Staff account management | Users (staff role) |
| `system` | System-level operations | N/A |
| `user` | General user account operations | Users |
| `visit` | Patient visit records | Patient Visits |

---

## Log Actions by Category

### Appointment Actions

| Action | Trigger | Logged By | Context Data |
|--------|---------|-----------|--------------|
| `created` | Patient books new appointment | Patient | appointment_id, reference_code, patient_id, patient_name, service_id, service_name, date, time_slot, payment_method, status |
| `approved` | Staff approves pending appointment | Staff | appointment_id, patient_id, service_id, date, time_slot |
| `rejected` | Staff rejects pending appointment | Staff | appointment_id, patient_id, service_id, date, time_slot, rejection_note |
| `approve_failed_capacity` | Approval failed due to full capacity | Staff | appointment_id, date, time_slot |
| `canceled_by_patient` | Patient cancels their appointment | Patient | appointment_id, patient_id, service_id, date, time_slot |
| `reminder_sent_custom` | Staff sends custom reminder | Staff | appointment_id, patient_id, custom_message |
| `resolve_by_code` | Staff looks up appointment by reference code | Staff | reference_code, appointment_id, patient_id |
| `rescheduled` | Patient reschedules appointment | Patient | appointment_id, patient_id, service_id, old_date, old_time_slot, new_date, new_time_slot |
| `marked_no_show` | Staff marks appointment as no-show | Staff | appointment_id, patient_id, service_id, date, time_slot |
| `completed` | Appointment marked as completed | Staff | appointment_id, patient_id, service_id |

### Authentication Actions

| Action | Trigger | Logged By | Context Data |
|--------|---------|-----------|--------------|
| `logged_in` | User successfully logs in | User | user_id, name, email, role, ip_address, user_agent |
| `logged_out` | User logs out | User | user_id, name, email, role, ip_address |
| `registered` | New user registration (normal) | System | user_id, name, email, role, ip_address |
| `blocked_ip_registration` | Registration from blocked IP | System | user_id, name, email, blocked_ip, action_required |

### Device Actions

| Action | Trigger | Logged By | Context Data |
|--------|---------|-----------|--------------|
| `approved` | Admin approves staff device | Admin | device_id, device_name, user_id |
| `rejected` | Admin rejects staff device | Admin | device_id |
| `renamed` | Admin renames device | Admin | old_name, new_name, user_id |
| `revoked` | Admin revokes device access | Admin | device_name, user_id, device_fingerprint |

### Inventory Actions

| Action | Trigger | Logged By | Context Data |
|--------|---------|-----------|--------------|
| `received` | New inventory received | Staff | item_id, qty_received, cost_per_unit, supplier_id |
| `adjusted` | Inventory quantity adjusted | Staff | item_id, old_quantity, new_quantity, reason |
| `dispensed` | Inventory item dispensed | Staff | item_id, quantity, patient_visit_id |

### Patient Actions

| Action | Trigger | Logged By | Context Data |
|--------|---------|-----------|--------------|
| `created` | New walk-in patient added | Staff | patient_id, name, contact_number, added_by |
| `linked` | Patient linked to user account | Staff | patient_id, patient_name, user_id, user_email, linked_by |
| `self_linked` | User self-links to patient record | Patient | patient_id, patient_name, user_id, user_name, user_email |
| `bind_to_user` | Admin binds patient to user | Admin | patient (full details), user (full details), performed_by |
| `flagged_for_review` | Patient flagged for manual review | Staff | patient_id, patient_name, flagged_by |

### Patient Manager Actions

| Action | Trigger | Logged By | Context Data |
|--------|---------|-----------|--------------|
| `warning_sent` | Warning sent to patient | Admin | patient_id, patient_name, warning_message, warning_count, no_show_count |
| `blocked` | Patient blocked from booking | Admin | patient_id, patient_name, block_reason, block_type, blocked_ip, no_show_count |
| `unblocked` | Patient unblocked | Admin | patient_id, patient_name, unblock_reason, no_show_count |
| `note_added` | Admin note added | Admin | patient_manager_id, note |
| `no_show_reset` | No-show count reset | Admin | patient_manager_id, patient_id, old_count, new_count, reason, admin_id |

### Service Actions

| Action | Trigger | Logged By | Context Data |
|--------|---------|-----------|--------------|
| `created` | New service created | Admin/Staff | service_id, name, price, estimated_minutes, category_id, created_by |
| `updated` | Service details updated | Admin/Staff | service_id, name, old_values, new_values, updated_by |
| `deleted` | Service deleted | Admin/Staff | service_id, name, deleted_by |

### Staff Actions

| Action | Trigger | Logged By | Context Data |
|--------|---------|-----------|--------------|
| `created` | New staff account created | Admin | staff_id, name, email, status |
| `status_toggled` | Staff account activated/deactivated | Admin | staff_id, name, email, old_status, new_status |

### System Actions

| Action | Trigger | Logged By | Context Data |
|--------|---------|-----------|--------------|
| `promo_auto_canceled` | Planned promo auto-canceled (missed start date) | System | promo_id, service_id, start_date |
| `promo_canceled` | Promo manually canceled | Admin | promo_id, service_id |

---

## Usage Examples

### Using SystemLogService

The recommended way to log events is through the `SystemLogService` class:

```php
use App\Services\SystemLogService;

// Generic logging
SystemLogService::log(
    'category',      // Category name
    'action',        // Action name
    $subjectId,      // ID of affected entity (nullable)
    'Message',       // Human-readable message
    [/* context */]  // Additional data array
);

// Category-specific helpers
SystemLogService::logAppointment('created', $appointmentId, 'Appointment created', [
    'patient_id' => $patientId,
    'service_id' => $serviceId,
    'date' => $date
]);

SystemLogService::logAuth('logged_in', $userId, 'User logged in', [
    'ip_address' => $ipAddress,
    'user_agent' => $userAgent
]);

SystemLogService::logPatient('created', $patientId, 'New patient added', [
    'name' => $fullName,
    'contact_number' => $phone
]);

SystemLogService::logService('updated', $serviceId, 'Service updated', [
    'old_values' => $oldData,
    'new_values' => $newData
]);
```

### Available Helper Methods

```php
// All methods follow the same signature:
// method(action, subjectId, message, context)

SystemLogService::logUser($action, $userId, $message, $context);
SystemLogService::logAppointment($action, $appointmentId, $message, $context);
SystemLogService::logDevice($action, $deviceId, $message, $context);
SystemLogService::logInventory($action, $itemId, $message, $context);
SystemLogService::logPayment($action, $paymentId, $message, $context);
SystemLogService::logSystem($action, $message, $context); // No subject ID
SystemLogService::logPatient($action, $patientId, $message, $context);
SystemLogService::logService($action, $serviceId, $message, $context);
SystemLogService::logStaff($action, $staffId, $message, $context);
SystemLogService::logPatientManager($action, $patientManagerId, $message, $context);
SystemLogService::logAuth($action, $userId, $message, $context);
SystemLogService::logVisit($action, $visitId, $message, $context);
SystemLogService::logDentist($action, $dentistId, $message, $context);
```

---

## Context Data Reference

### Common Context Fields

These fields are commonly used across different log types:

| Field | Type | Description | Used In |
|-------|------|-------------|---------|
| `user_id` | int | User who performed the action | Most logs |
| `patient_id` | int | Patient involved | Appointments, Patient Manager |
| `patient_name` | string | Full name of patient | Appointments, Patient Manager |
| `service_id` | int | Service involved | Appointments, Services |
| `service_name` | string | Name of service | Appointments |
| `date` | string | Date (Y-m-d format) | Appointments |
| `time_slot` | string | Time slot (HH:MM-HH:MM) | Appointments |
| `ip_address` | string | IP address | Auth, Patient Manager |
| `user_agent` | string | Browser user agent | Auth |
| `old_values` | object | Previous values before update | Updates |
| `new_values` | object | New values after update | Updates |
| `reason` | string | Reason for action | Patient Manager |

### Appointment Context

```php
[
    'appointment_id' => 123,
    'reference_code' => 'ABC123XY',
    'patient_id' => 45,
    'patient_name' => 'John Doe',
    'service_id' => 10,
    'service_name' => 'Teeth Cleaning',
    'date' => '2024-12-25',
    'time_slot' => '09:00-09:30',
    'payment_method' => 'cash',
    'status' => 'pending'
]
```

### Patient Manager Context

```php
[
    'patient_id' => 45,
    'patient_name' => 'John Doe',
    'no_show_count' => 3,
    'warning_count' => 2,
    'block_reason' => 'Multiple no-shows',
    'block_type' => 'account', // or 'ip' or 'both'
    'blocked_ip' => '192.168.1.1',
    'warning_message' => 'Custom warning message'
]
```

### Authentication Context

```php
[
    'user_id' => 12,
    'name' => 'John Doe',
    'email' => 'john@example.com',
    'role' => 'patient',
    'ip_address' => '192.168.1.1',
    'user_agent' => 'Mozilla/5.0...'
]
```

### Service Update Context

```php
[
    'service_id' => 10,
    'name' => 'Teeth Cleaning',
    'old_values' => [
        'price' => 500,
        'estimated_minutes' => 30
    ],
    'new_values' => [
        'price' => 600,
        'estimated_minutes' => 60
    ],
    'updated_by' => 5
]
```

---

## Viewing Logs

### Admin Panel

Navigate to **Admin > System Logs** (`/admin/system-logs`) to view all system logs.

### Features

- **Filtering**: Filter by user, category, action, subject ID, date range, and search text
- **Pagination**: 10, 20, 50, or 100 logs per page
- **Details Modal**: Click "Details" button to view full context data
- **Export**: Copy context data to clipboard

### API Endpoints

```php
// Get logs with filters
GET /api/system-logs
    ?user_id=1
    &category=appointment
    &action=created
    &date_from=2024-01-01
    &date_to=2024-12-31
    &search=keyword
    &page=1
    &per_page=20

// Get filter options
GET /api/system-logs/filter-options

// Get statistics
GET /api/system-logs/statistics?date_from=2024-01-01&date_to=2024-12-31

// Get specific log
GET /api/system-logs/{id}
```

### Response Format

```json
{
    "data": [
        {
            "id": 1,
            "user_id": 5,
            "category": "appointment",
            "action": "created",
            "subject_id": 123,
            "message": "New appointment booked: John Doe for Teeth Cleaning",
            "context": {
                "appointment_id": 123,
                "patient_id": 45,
                "service_id": 10,
                "date": "2024-12-25",
                "time_slot": "09:00-09:30"
            },
            "created_at": "2024-12-20T10:30:00.000000Z",
            "updated_at": "2024-12-20T10:30:00.000000Z",
            "user": {
                "id": 5,
                "name": "John Doe",
                "email": "john@example.com"
            }
        }
    ],
    "current_page": 1,
    "last_page": 5,
    "per_page": 20,
    "total": 95
}
```

---

## Best Practices

### When to Log

✅ **DO Log:**
- User authentication events (login, logout, registration)
- CRUD operations on important entities
- Status changes (approval, rejection, cancellation)
- Administrative actions (blocking users, device approval)
- Security-related events (failed access, blocked IP registration)
- Financial transactions
- System configuration changes

❌ **DON'T Log:**
- Read-only operations (viewing lists, getting details)
- Automated system processes that run frequently
- User navigation events
- Trivial UI interactions

### Message Format

- Use clear, descriptive messages
- Include relevant entity names and IDs
- Use past tense for actions
- Include the actor's name when available

**Good Examples:**
- ✅ "Staff John Doe approved appointment #123"
- ✅ "Patient Jane Smith canceled appointment #456"
- ✅ "Admin blocked patient due to 3 no-shows"

**Bad Examples:**
- ❌ "Appointment approved"
- ❌ "Action performed"
- ❌ "Update"

### Context Data

- Include all relevant IDs (user_id, patient_id, etc.)
- Add human-readable names alongside IDs
- For updates, include both old and new values
- Keep context data flat when possible
- Use consistent key names across similar log types

### Performance Considerations

- Logging is synchronous and adds to request time
- Keep context data concise
- Don't log in tight loops
- Consider using database transactions for operations with logs

---

## Adding New Log Categories

To add a new log category:

1. **Add helper method to SystemLogService**:

```php
// bend/app/Services/SystemLogService.php
public static function logNewCategory(string $action, ?int $subjectId = null, string $message = '', array $context = [])
{
    return self::log('new_category', $action, $subjectId, $message, $context);
}
```

2. **Update frontend category mapping**:

```javascript
// fend/src/pages/Admin/SystemLogsPage.jsx
const getCategoryInfo = (category) => {
    const categoryMap = {
        // ... existing categories
        'new_category': {
            label: 'New Category',
            icon: 'bi-icon-name',
            color: 'bg-primary',
            description: 'Description of category'
        }
    };
    // ...
}
```

3. **Use in controllers**:

```php
use App\Services\SystemLogService;

SystemLogService::logNewCategory('action_name', $id, 'Message', ['key' => 'value']);
```

---

## Troubleshooting

### Logs Not Appearing

1. Check if logging code is actually being executed
2. Verify database connection
3. Check `system_logs` table exists
4. Ensure user has permission to create logs

### Missing Context Data

1. Verify data is being passed to log method
2. Check that context array is properly formatted
3. Ensure JSON encoding is successful
4. Check database column size limits

### Performance Issues

1. Add indexes to frequently filtered columns
2. Implement log rotation/archiving for old logs
3. Use pagination when displaying logs
4. Consider async logging for high-traffic operations

---

## Maintenance

### Log Rotation

Consider implementing a scheduled task to archive old logs:

```php
// In a scheduled command
SystemLog::where('created_at', '<', now()->subMonths(6))
    ->delete(); // or move to archive table
```

### Database Indexes

Recommended indexes for performance:

```sql
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_system_logs_category ON system_logs(category);
CREATE INDEX idx_system_logs_action ON system_logs(action);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX idx_system_logs_category_action ON system_logs(category, action);
```

---

## Version History

- **v1.0** - Initial implementation with core categories
- **v1.1** - Added patient_manager category for no-show tracking
- **v1.2** - Added comprehensive appointment logging
- **v1.3** - Standardized all logging to use SystemLogService

---

## Support

For questions or issues related to system logging:
1. Check this documentation
2. Review the SystemLogService code
3. Check the SystemLog model
4. Consult the development team

