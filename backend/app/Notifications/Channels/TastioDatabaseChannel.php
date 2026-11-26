<?php

namespace App\Notifications\Channels;

use App\Models\Notification as NotificationModel;
use Illuminate\Notifications\Notification;

class TastioDatabaseChannel
{
    /**
     * Ruan njoftimin e Laravel në tabelën e centralizuar `notifications` me parandalim të dublikimeve.
     */
    public function send(object $notifiable, Notification $notification): ?NotificationModel
    {
        if (!method_exists($notification, 'toTastioDatabase')) {
            return null;
        }

        $data = $notification->toTastioDatabase($notifiable);
        $userId = $notifiable->getKey();

        if (!$userId) {
            return null;
        }

        $eventKey = $data['event_key'] ?? null;

        // Parandalo dublikimet nëse ekziston tashmë një njoftim identik me të njëjtin event_key
        if ($eventKey) {
            $existing = NotificationModel::where('user_id', $userId)
                ->where('event_key', $eventKey)
                ->first();

            if ($existing) {
                return $existing;
            }
        }

        return NotificationModel::create([
            'user_id' => $userId,
            'branch_id' => $data['branch_id'] ?? null,
            'title' => $data['title'],
            'message' => $data['message'],
            'type' => $data['type'] ?? 'order_update',
            'event_key' => $eventKey,
            'payload' => $data['payload'] ?? null,
            'action_url' => $data['action_url'] ?? null,
            'is_read' => false,
            'read_at' => null,
        ]);
    }
}
