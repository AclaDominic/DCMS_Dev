# System Logging - Quick Reference Guide

## Quick Start

### How to Log an Event

```php
use App\Services\SystemLogService;

// Use category-specific helpers (recommended)
SystemLogService::logAppointment('created', $appointmentId, 'Message', ['key' => 'value']);
SystemLogService::logAuth('logged_in', $userId, 'Message', ['ip_address' => $ip]);
SystemLogService::logPatient('created', $patientId, 'Message', ['name' => $name]);
SystemLogService::logService('updated', $serviceId, 'Message', ['changes' => $data]);
```

## All Log Categories

| Category | Helper Method | Example Usage |
|----------|--------------|---------------|
| `appointment` | `logAppointment()` | Booking, approval, rejection, cancellation |
| `auth` | `logAuth()` | Login, logout, registration |
| `dentist` | `logDentist()` | Dentist profile updates, schedule changes |
| `device` | `logDevice()` | Device approval, rejection, revocation |
| `inventory` | `logInventory()` | Stock receive, dispense, adjust |
| `patient` | `logPatient()` | Patient creation, linking, flagging |
| `patient_manager` | `logPatientManager()` | Blocking, warnings, no-show tracking |
| `payment` | `logPayment()` | Payment processing, refunds |
| `service` | `logService()` | Service CRUD operations |
| `staff` | `logStaff()` | Staff account management |
| `system` | `logSystem()` | System-wide events |
| `user` | `logUser()` | User account operations |
| `visit` | `logVisit()` | Patient visit records |

## Common Actions

### Authentication
- `logged_in` - User login
- `logged_out` - User logout
- `registered` - New user registration
- `blocked_ip_registration` - Registration from blocked IP

### Appointments
- `created` - New appointment booked
- `approved` - Appointment approved by staff
- `rejected` - Appointment rejected by staff
- `canceled_by_patient` - Patient cancels
- `rescheduled` - Appointment rescheduled
- `marked_no_show` - Marked as no-show
- `completed` - Appointment completed

### Patient Management
- `created` - Walk-in patient added
- `linked` - Linked to user account
- `self_linked` - User self-linked
- `flagged_for_review` - Flagged for review

### Patient Manager
- `warning_sent` - Warning sent to patient
- `blocked` - Patient blocked
- `unblocked` - Patient unblocked
- `note_added` - Admin note added
- `no_show_reset` - No-show count reset

### Services
- `created` - New service created
- `updated` - Service modified
- `deleted` - Service removed

### Staff
- `created` - New staff account
- `status_toggled` - Account activated/deactivated

### Devices
- `approved` - Device approved
- `rejected` - Device rejected
- `renamed` - Device renamed
- `revoked` - Device revoked

## Context Data Examples

### Appointment Context
```php
SystemLogService::logAppointment('created', $appointment->id, 'Appointment booked', [
    'appointment_id' => $appointment->id,
    'reference_code' => $appointment->reference_code,
    'patient_id' => $patient->id,
    'patient_name' => $patient->first_name . ' ' . $patient->last_name,
    'service_id' => $service->id,
    'service_name' => $service->name,
    'date' => $appointment->date,
    'time_slot' => $appointment->time_slot,
    'payment_method' => $appointment->payment_method
]);
```

### Authentication Context
```php
SystemLogService::logAuth('logged_in', $user->id, "User logged in: {$user->name}", [
    'user_id' => $user->id,
    'name' => $user->name,
    'email' => $user->email,
    'role' => $user->role,
    'ip_address' => $request->ip(),
    'user_agent' => $request->userAgent()
]);
```

### Patient Manager Context
```php
SystemLogService::logPatientManager('blocked', $pm->id, "Patient blocked", [
    'patient_id' => $pm->patient_id,
    'patient_name' => $patient->first_name . ' ' . $patient->last_name,
    'block_reason' => 'Multiple no-shows',
    'block_type' => 'account',
    'no_show_count' => $pm->no_show_count
]);
```

### Service Update Context
```php
SystemLogService::logService('updated', $service->id, "Service updated", [
    'service_id' => $service->id,
    'name' => $service->name,
    'old_values' => [
        'price' => $oldPrice,
        'estimated_minutes' => $oldMinutes
    ],
    'new_values' => [
        'price' => $service->price,
        'estimated_minutes' => $service->estimated_minutes
    ],
    'updated_by' => auth()->id()
]);
```

## Viewing Logs

### Admin Panel
- Navigate to: **Admin > System Logs** (`/admin/system-logs`)
- Click **Details** button on any log to view full context
- Filter by: User, Category, Action, Date Range, Search
- Export: Click "Copy All Data" button in details modal

### API Endpoints
```
GET /api/system-logs
GET /api/system-logs/filter-options
GET /api/system-logs/statistics
GET /api/system-logs/{id}
```

## Best Practices

### ✅ DO
- Log all important user actions
- Include relevant IDs and names
- Use descriptive messages
- Add complete context data
- Use past tense in messages

### ❌ DON'T
- Log read-only operations
- Log automated frequent processes
- Include sensitive data (passwords)
- Log trivial UI interactions

## Common Fields

### Essential Fields
- `user_id` - Who performed the action
- `{entity}_id` - ID of affected entity
- `{entity}_name` - Name for readability
- `old_values` - Previous state (for updates)
- `new_values` - New state (for updates)

### Optional Fields
- `reason` - Why the action was taken
- `ip_address` - User's IP
- `user_agent` - Browser info
- `performed_by` - Admin/staff who did it
- `{action}_by` - Who performed specific action

## Full Documentation

For complete documentation, see: `bend/SYSTEM_LOGGING.md`

---

**Last Updated**: December 2024

