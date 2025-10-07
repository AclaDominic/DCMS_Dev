<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Helpers\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class NotificationController extends Controller
{
    public function index(Request $req)
    {
        $u = $req->user();
        $now = now();

        $targeted = DB::table('notifications as n')
            ->join('notification_targets as t', 't.notification_id', '=', 'n.id')
            ->where('t.user_id', $u->id)
            ->selectRaw("
            n.id, n.type, n.title, n.body, n.severity, n.scope,
            n.audience_roles, n.effective_from, n.effective_until,
            n.data, n.created_at,
            t.seen_at, t.read_at
        ");

        $broadcast = DB::table('notifications as n')
            ->leftJoin('notification_targets as t', function ($j) use ($u) {
                $j->on('t.notification_id', '=', 'n.id')->where('t.user_id', '=', $u->id);
            })
            ->where('n.scope', 'broadcast')
            ->where(function ($q) use ($u) {
                $role = $u->role ?? 'patient';
                $q->whereNull('n.audience_roles')
                    ->orWhereJsonContains('n.audience_roles', $role);
            })
            // show only currently effective broadcasts
            ->where(function ($q) use ($now) {
                $q->whereNull('n.effective_from')->orWhere('n.effective_from', '<=', $now);
            })
            ->where(function ($q) use ($now) {
                $q->whereNull('n.effective_until')->orWhere('n.effective_until', '>=', $now);
            })
            // IMPORTANT: only include broadcasts that don't yet have a target row for this user
            ->whereNull('t.id')
            ->selectRaw("
            n.id, n.type, n.title, n.body, n.severity, n.scope,
            n.audience_roles, n.effective_from, n.effective_until,
            n.data, n.created_at,
            t.seen_at, t.read_at
        ");

        // Order after UNION safely by wrapping as subquery
        $rows = DB::query()
            ->fromSub($targeted->unionAll($broadcast), 'x')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($rows);
    }


    public function unreadCount(Request $req)
    {
        $u = $req->user();
        $now = now();

        // Targeted: unread rows already materialized for this user
        $targeted = DB::table('notification_targets as t')
            ->where('t.user_id', $u->id)
            ->whereNull('t.read_at')
            ->count();

        // Broadcast: role-matched AND currently effective (from..until), with no read_at for this user
        $broadcastUnread = DB::table('notifications as n')
            ->leftJoin('notification_targets as t', function ($j) use ($u) {
                $j->on('t.notification_id', '=', 'n.id')
                    ->where('t.user_id', '=', $u->id);
            })
            ->where('n.scope', 'broadcast')
            ->where(function ($q) use ($u) {
                $role = $u->role ?? 'patient';
                $q->whereNull('n.audience_roles')
                    ->orWhereJsonContains('n.audience_roles', $role);
            })
            // NEW: must have started (or no start)
            ->where(function ($q) use ($now) {
                $q->whereNull('n.effective_from')
                    ->orWhere('n.effective_from', '<=', $now);
            })
            // existing: not yet expired (or no end)
            ->where(function ($q) use ($now) {
                $q->whereNull('n.effective_until')
                    ->orWhere('n.effective_until', '>=', $now);
            })
            // unread for this user (includes “no target row yet” because t.read_at is NULL)
            ->whereNull('t.read_at')
            ->count();

        return response()->json(['unread' => $targeted + $broadcastUnread]);
    }


    public function markAllRead(Request $req)
    {
        $u = $req->user();
        $now = now();

        // 1) Targeted: mark all unread for this user
        DB::table('notification_targets')
            ->where('user_id', $u->id)
            ->whereNull('read_at')
            ->update([
                'seen_at' => $now,
                'read_at' => $now,
                'updated_at' => $now,
            ]);

        // 2) Broadcasts: role-matched, currently effective → materialize & mark read
        $broadcastIds = DB::table('notifications as n')
            ->where('n.scope', 'broadcast')
            ->where(function ($q) use ($u) {
                $role = $u->role ?? 'patient';
                $q->whereNull('n.audience_roles')
                    ->orWhereJsonContains('n.audience_roles', $role);
            })
            // must have started
            ->where(function ($q) use ($now) {
                $q->whereNull('n.effective_from')
                    ->orWhere('n.effective_from', '<=', $now);
            })
            // not yet expired
            ->where(function ($q) use ($now) {
                $q->whereNull('n.effective_until')
                    ->orWhere('n.effective_until', '>=', $now);
            })
            ->pluck('n.id')
            ->all();

        if (!empty($broadcastIds)) {
            $existing = DB::table('notification_targets')
                ->where('user_id', $u->id)
                ->whereIn('notification_id', $broadcastIds)
                ->pluck('notification_id')
                ->all();

            $missing = array_values(array_diff($broadcastIds, $existing));

            if (!empty($missing)) {
                $rows = array_map(fn($nid) => [
                    'notification_id' => $nid,
                    'user_id' => $u->id,
                    'seen_at' => $now,
                    'read_at' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ], $missing);

                DB::table('notification_targets')->insert($rows);
            }

            DB::table('notification_targets')
                ->where('user_id', $u->id)
                ->whereIn('notification_id', $broadcastIds)
                ->whereNull('read_at')
                ->update([
                    'seen_at' => $now,
                    'read_at' => $now,
                    'updated_at' => $now,
                ]);
        }

        return response()->json(['ok' => true]);
    }


    public function mine(Request $req)
    {
        $u = $req->user();
        $perPage = max(5, min((int) $req->query('perPage', 20), 100));
        $page = max(1, (int) $req->query('page', 1));

        $q = DB::table('notifications as n')
            ->join('notification_targets as t', 't.notification_id', '=', 'n.id')
            ->where('t.user_id', $u->id)
            ->whereNotNull('t.seen_at') // show only items this account has actually seen
            ->orderByDesc('n.created_at')
            ->selectRaw("
            n.id, n.type, n.title, n.body, n.severity, n.scope,
            n.audience_roles, n.effective_from, n.effective_until,
            n.data, n.created_at,
            t.seen_at, t.read_at
        ");

        $total = (clone $q)->count();
        $items = $q->forPage($page, $perPage)->get();

        return response()->json([
            'items' => $items,
            'page' => $page,
            'perPage' => $perPage,
            'total' => $total,
            'totalPages' => (int) ceil($total / $perPage),
        ]);
    }

    /**
     * Test SMS functionality by sending a test message
     */
    public function testSms(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'phone_number' => ['required', 'string', 'regex:/^(09[0-9]{9}|\+639[0-9]{9})$/'],
            'message' => 'nullable|string|max:160',
        ], [
            'phone_number.required' => 'Phone number is required',
            'phone_number.regex' => 'Phone number must be in format 09xxxxxxxxx or +639xxxxxxxxx',
            'message.max' => 'Message cannot exceed 160 characters',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $phoneNumber = $request->input('phone_number');
        
        // Convert Philippine local format (09xxxxxxxxx) to E.164 format (+639xxxxxxxxx)
        if (preg_match('/^09([0-9]{9})$/', $phoneNumber, $matches)) {
            $phoneNumber = '+639' . $matches[1];
        }
        
        $customMessage = $request->input('message', 'This is a test SMS from DCMS. SMS functionality is working correctly!');

        try {
            // Use the NotificationService to send the test SMS
            NotificationService::send($phoneNumber, 'SMS Test', $customMessage);

            return response()->json([
                'success' => true,
                'message' => 'Test SMS sent successfully',
                'data' => [
                    'phone_number' => $phoneNumber,
                    'message' => $customMessage,
                    'sent_at' => now()->toISOString(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to send test SMS',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
