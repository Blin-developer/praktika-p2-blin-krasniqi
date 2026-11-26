<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Lista e paginuar e njoftimeve të përdoruesit të autentikuar.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $filter = $request->query('filter', 'all'); // all | unread | read
        $perPage = min(50, max(5, (int) $request->query('per_page', 15)));

        $query = Notification::where('user_id', $user->id)
            ->orderBy('is_read', 'asc')
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc');

        if ($filter === 'unread') {
            $query->where('is_read', false);
        } elseif ($filter === 'read') {
            $query->where('is_read', true);
        }

        if ($request->filled('type') && $request->query('type') !== 'all') {
            $query->where('type', $request->query('type'));
        }

        $paginated = $query->paginate($perPage);
        $unreadCount = Notification::where('user_id', $user->id)->where('is_read', false)->count();

        return response()->json([
            'success' => true,
            'data' => $paginated->items(),
            'unread_count' => $unreadCount,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * Endpoint i lehtë për sinkronizim në kohë reale (unread count + checksum).
     */
    public function unreadCount(Request $request)
    {
        $user = $request->user();
        $unreadCount = Notification::where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        $latest = Notification::where('user_id', $user->id)
            ->latest('id')
            ->first(['id', 'is_read', 'updated_at']);

        $checksum = md5(
            $user->id . '_' . $unreadCount . '_' . ($latest?->id ?? 0) . '_' . ($latest?->is_read ? '1' : '0') . '_' . ($latest?->updated_at ?? '')
        );

        return response()->json([
            'success' => true,
            'unread_count' => $unreadCount,
            'latest_id' => $latest?->id,
            'checksum' => $checksum,
        ]);
    }

    /**
     * Shënon një njoftim individual si të lexuar (vetëm pronari i njoftimit).
     */
    public function markAsRead(int $id, Request $request)
    {
        $notification = Notification::findOrFail($id);

        if ($notification->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Nuk keni autorizim për këtë njoftim.',
            ], 403);
        }

        $notification->markAsRead();

        $unreadCount = Notification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'success' => true,
            'message' => 'Njoftimi u shënua si i lexuar.',
            'data' => $notification->fresh(),
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Shënon të gjitha njoftimet e përdoruesit si të lexuara.
     */
    public function markAllAsRead(Request $request)
    {
        $user = $request->user();
        $updated = Notification::where('user_id', $user->id)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Të gjitha njoftimet u shënuan si të lexuara.',
            'marked_count' => $updated,
            'unread_count' => 0,
        ]);
    }

    /**
     * Fshin një njoftim individual (vetëm pronari i njoftimit).
     */
    public function destroy(int $id, Request $request)
    {
        $notification = Notification::findOrFail($id);

        if ($notification->user_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'Nuk keni autorizim për të fshirë këtë njoftim.',
            ], 403);
        }

        $notification->delete();

        $unreadCount = Notification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'success' => true,
            'message' => 'Njoftimi u fshi me sukses.',
            'unread_count' => $unreadCount,
        ]);
    }
}
