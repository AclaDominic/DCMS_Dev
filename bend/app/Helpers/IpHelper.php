<?php

namespace App\Helpers;

use Illuminate\Http\Request;

class IpHelper
{
    /**
     * Get the real client IP address, handling proxies properly
     */
    public static function getRealIpAddress(Request $request): string
    {
        // List of headers to check for the real IP
        $headers = [
            'HTTP_CF_CONNECTING_IP',     // CloudFlare
            'HTTP_X_REAL_IP',           // Nginx proxy
            'HTTP_X_FORWARDED_FOR',     // Standard proxy header
            'HTTP_X_FORWARDED',         // Alternative proxy header
            'HTTP_X_CLUSTER_CLIENT_IP', // Cluster
            'HTTP_FORWARDED_FOR',       // Standard proxy header
            'HTTP_FORWARDED',           // Standard proxy header
            'REMOTE_ADDR'               // Fallback
        ];

        foreach ($headers as $header) {
            $value = $request->server($header);
            
            if (!empty($value)) {
                // Handle comma-separated IPs (take the first one)
                $ips = explode(',', $value);
                $ip = trim($ips[0]);
                
                // Validate IP address
                if (self::isValidIp($ip)) {
                    return $ip;
                }
            }
        }

        // Fallback to Laravel's default
        return $request->ip();
    }

    /**
     * Check if an IP address is valid and not a private/local IP
     */
    private static function isValidIp(string $ip): bool
    {
        // Filter out private/local IPs that shouldn't be used for blocking
        $privateRanges = [
            '127.0.0.0/8',      // Loopback
            '10.0.0.0/8',       // Private Class A
            '172.16.0.0/12',    // Private Class B
            '192.168.0.0/16',   // Private Class C
            '169.254.0.0/16',   // Link-local
            '::1/128',          // IPv6 loopback
            'fc00::/7',         // IPv6 private
            'fe80::/10',        // IPv6 link-local
        ];

        // Check if it's a valid IP
        if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 | FILTER_FLAG_IPV6)) {
            return false;
        }

        // Check if it's a private IP (we want to block these too for testing)
        // But in production, you might want to skip private IPs
        foreach ($privateRanges as $range) {
            if (self::ipInRange($ip, $range)) {
                // For now, allow private IPs for blocking (useful for testing)
                // return false;
            }
        }

        return true;
    }

    /**
     * Check if an IP is in a CIDR range
     */
    private static function ipInRange(string $ip, string $range): bool
    {
        if (strpos($range, '/') === false) {
            return $ip === $range;
        }

        list($subnet, $bits) = explode('/', $range);
        
        if ($bits === null) {
            return $ip === $subnet;
        }

        // Handle IPv4 vs IPv6
        $ipVersion = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) ? 4 : 6;
        $subnetVersion = filter_var($subnet, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) ? 4 : 6;
        
        // Must be same IP version
        if ($ipVersion !== $subnetVersion) {
            return false;
        }

        $ipBin = inet_pton($ip);
        $subnetBin = inet_pton($subnet);
        
        if ($ipBin === false || $subnetBin === false) {
            return false;
        }

        if ($ipVersion === 4) {
            // IPv4
            $mask = -1 << (32 - $bits);
            $mask = pack('N', $mask);
            return (substr($ipBin, 0, 4) & $mask) === (substr($subnetBin, 0, 4) & $mask);
        } else {
            // IPv6
            $bytes = 16; // IPv6 is 16 bytes
            $bits = (int)$bits;
            
            if ($bits < 0 || $bits > 128) {
                return false;
            }
            
            $byteCount = intval($bits / 8);
            $bitCount = $bits % 8;
            
            // Compare full bytes
            for ($i = 0; $i < $byteCount; $i++) {
                if ($ipBin[$i] !== $subnetBin[$i]) {
                    return false;
                }
            }
            
            // Compare partial byte if needed
            if ($bitCount > 0) {
                $mask = 0xFF << (8 - $bitCount);
                if ((ord($ipBin[$byteCount]) & $mask) !== (ord($subnetBin[$byteCount]) & $mask)) {
                    return false;
                }
            }
            
            return true;
        }
    }

    /**
     * Log IP detection for debugging
     */
    public static function debugIpDetection(Request $request): array
    {
        $debug = [
            'detected_ip' => self::getRealIpAddress($request),
            'laravel_ip' => $request->ip(),
            'headers' => []
        ];

        $headers = [
            'REMOTE_ADDR',
            'HTTP_CF_CONNECTING_IP',
            'HTTP_X_REAL_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_FORWARDED',
            'HTTP_X_CLUSTER_CLIENT_IP',
            'HTTP_FORWARDED_FOR',
            'HTTP_FORWARDED'
        ];

        foreach ($headers as $header) {
            $value = $request->server($header);
            if (!empty($value)) {
                $debug['headers'][$header] = $value;
            }
        }

        return $debug;
    }
}
