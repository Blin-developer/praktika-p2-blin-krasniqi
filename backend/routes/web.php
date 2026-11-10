<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'platform' => 'GourmetExpress RESTful API',
        'status' => 'operational',
        'api_docs' => '/api/v1/health'
    ]);
});
