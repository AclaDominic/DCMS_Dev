<?php

/**
 * Test script to verify blocking endpoints are working
 */

require_once __DIR__ . '/vendor/autoload.php';

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Testing Blocking Endpoints ===\n\n";

// Test 1: Check if routes are registered
echo "1. Checking route registration...\n";
$routes = app('router')->getRoutes();
$appointmentRoutes = collect($routes)->filter(function ($route) {
    return str_contains($route->uri(), 'appointment');
});

echo "Found " . $appointmentRoutes->count() . " appointment routes:\n";
foreach ($appointmentRoutes as $route) {
    $methods = implode('|', $route->methods());
    echo "  {$methods} {$route->uri()}\n";
}

// Test 2: Check specific endpoints
echo "\n2. Checking specific blocking endpoints...\n";
$blockingRoutes = $appointmentRoutes->filter(function ($route) {
    return str_contains($route->uri(), 'check-blocked-status') || str_contains($route->uri(), 'debug-auth');
});

foreach ($blockingRoutes as $route) {
    $methods = implode('|', $route->methods());
    echo "  ✓ {$methods} {$route->uri()} -> {$route->getActionName()}\n";
}

// Test 3: Test controller method exists
echo "\n3. Testing controller methods...\n";
try {
    $controller = new \App\Http\Controllers\API\AppointmentController();
    
    // Check if methods exist
    if (method_exists($controller, 'checkBlockedStatus')) {
        echo "  ✓ checkBlockedStatus method exists\n";
    } else {
        echo "  ✗ checkBlockedStatus method missing\n";
    }
    
    if (method_exists($controller, 'debugAuth')) {
        echo "  ✓ debugAuth method exists\n";
    } else {
        echo "  ✗ debugAuth method missing\n";
    }
} catch (Exception $e) {
    echo "  ✗ Error checking controller: " . $e->getMessage() . "\n";
}

// Test 4: Test database connection
echo "\n4. Testing database connection...\n";
try {
    $patientManagerCount = \App\Models\PatientManager::count();
    echo "  ✓ Database connected. PatientManager records: {$patientManagerCount}\n";
} catch (Exception $e) {
    echo "  ✗ Database error: " . $e->getMessage() . "\n";
}

// Test 5: Test PatientManagerService
echo "\n5. Testing PatientManagerService...\n";
try {
    $serviceExists = class_exists('\App\Services\PatientManagerService');
    if ($serviceExists) {
        echo "  ✓ PatientManagerService class exists\n";
        
        // Test static method
        if (method_exists('\App\Services\PatientManagerService', 'getPatientBlockInfo')) {
            echo "  ✓ getPatientBlockInfo method exists\n";
        } else {
            echo "  ✗ getPatientBlockInfo method missing\n";
        }
    } else {
        echo "  ✗ PatientManagerService class missing\n";
    }
} catch (Exception $e) {
    echo "  ✗ Error checking service: " . $e->getMessage() . "\n";
}

echo "\n=== Test Complete ===\n";
echo "\nIf all tests pass, the endpoints should be working.\n";
echo "If you're still getting 404 errors, try:\n";
echo "1. Restart the Laravel server\n";
echo "2. Clear browser cache\n";
echo "3. Check if the server is running on the correct port\n";
echo "4. Verify the API base URL in the frontend configuration\n";
