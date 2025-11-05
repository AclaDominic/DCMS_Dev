<?php

namespace App\Services;

use App\Models\SystemLog;
use Illuminate\Support\Facades\Auth;

class SystemLogService
{
    /**
     * Log a system event
     */
    public static function log(string $category, string $action, ?int $subjectId = null, string $message = '', array $context = [])
    {
        return SystemLog::create([
            'user_id' => Auth::id(),
            'category' => $category,
            'action' => $action,
            'subject_id' => $subjectId,
            'message' => $message,
            'context' => $context,
        ]);
    }

    /**
     * Log user-related events
     */
    public static function logUser(string $action, ?int $userId = null, string $message = '', array $context = [])
    {
        return self::log('user', $action, $userId, $message, $context);
    }

    /**
     * Log appointment-related events
     */
    public static function logAppointment(string $action, ?int $appointmentId = null, string $message = '', array $context = [])
    {
        return self::log('appointment', $action, $appointmentId, $message, $context);
    }

    /**
     * Log device-related events
     */
    public static function logDevice(string $action, ?int $deviceId = null, string $message = '', array $context = [])
    {
        return self::log('device', $action, $deviceId, $message, $context);
    }

    /**
     * Log inventory-related events
     */
    public static function logInventory(string $action, ?int $itemId = null, string $message = '', array $context = [])
    {
        return self::log('inventory', $action, $itemId, $message, $context);
    }

    /**
     * Log payment-related events
     */
    public static function logPayment(string $action, ?int $paymentId = null, string $message = '', array $context = [])
    {
        return self::log('payment', $action, $paymentId, $message, $context);
    }

    /**
     * Log system-related events
     */
    public static function logSystem(string $action, string $message = '', array $context = [])
    {
        return self::log('system', $action, null, $message, $context);
    }

    /**
     * Log patient-related events
     */
    public static function logPatient(string $action, ?int $patientId = null, string $message = '', array $context = [])
    {
        return self::log('patient', $action, $patientId, $message, $context);
    }

    /**
     * Log service-related events
     */
    public static function logService(string $action, ?int $serviceId = null, string $message = '', array $context = [])
    {
        return self::log('service', $action, $serviceId, $message, $context);
    }

    /**
     * Log staff-related events
     */
    public static function logStaff(string $action, ?int $staffId = null, string $message = '', array $context = [])
    {
        return self::log('staff', $action, $staffId, $message, $context);
    }

    /**
     * Log patient manager events (blocking, warnings, etc.)
     */
    public static function logPatientManager(string $action, ?int $patientManagerId = null, string $message = '', array $context = [])
    {
        return self::log('patient_manager', $action, $patientManagerId, $message, $context);
    }

    /**
     * Log authentication events
     */
    public static function logAuth(string $action, ?int $userId = null, string $message = '', array $context = [])
    {
        return self::log('auth', $action, $userId, $message, $context);
    }

    /**
     * Log visit-related events
     */
    public static function logVisit(string $action, ?int $visitId = null, string $message = '', array $context = [])
    {
        return self::log('visit', $action, $visitId, $message, $context);
    }

    /**
     * Log dentist-related events
     */
    public static function logDentist(string $action, ?int $dentistId = null, string $message = '', array $context = [])
    {
        return self::log('dentist', $action, $dentistId, $message, $context);
    }

    /**
     * Log refund-related events
     */
    public static function logRefund(string $action, ?int $refundRequestId = null, string $message = '', array $context = [])
    {
        return self::log('refund', $action, $refundRequestId, $message, $context);
    }
}
