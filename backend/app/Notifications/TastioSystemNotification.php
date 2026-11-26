<?php

namespace App\Notifications;

use App\Notifications\Channels\TastioDatabaseChannel;
use Illuminate\Notifications\Notification;

class TastioSystemNotification extends Notification
{
    public function __construct(
        protected string $title,
        protected string $message,
        protected string $type = 'order_update',
        protected ?string $eventKey = null,
        protected ?array $payload = null,
        protected ?string $actionUrl = null,
        protected ?int $branchId = null,
    ) {}

    public function via(object $notifiable): array
    {
        return [TastioDatabaseChannel::class];
    }

    public function toTastioDatabase(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'message' => $this->message,
            'type' => $this->type,
            'event_key' => $this->eventKey,
            'payload' => $this->payload,
            'action_url' => $this->actionUrl,
            'branch_id' => $this->branchId,
        ];
    }
}
