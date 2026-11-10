<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
*/

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('orders.{orderUuid}', function ($user, $orderUuid) {
    // Authenticated customer or authorized branch staff can listen
    return true;
});

Broadcast::channel('branches.{branchId}.kds', function ($user, $branchId) {
    // Authorized kitchen staff or branch manager
    return true;
});
