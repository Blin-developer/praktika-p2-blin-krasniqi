<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\KdsService;
use Illuminate\Http\Request;

class KdsController extends Controller
{
    protected KdsService $kdsService;

    public function __construct(KdsService $kdsService)
    {
        $this->kdsService = $kdsService;
    }

    /**
     * Merr biletat aktive me filtrim stacioni dhe prioritizim inteligjent.
     */
    public function index(Request $request)
    {
        $branchId = $request->query('branch_id');
        $station = $request->query('station', 'ALL');

        $tickets = $this->kdsService->getActiveTickets(
            $branchId ? (int)$branchId : null,
            (string)$station
        );

        return response()->json([
            'success' => true,
            'data' => $tickets,
        ]);
    }

    /**
     * Merr biletat e përfunduara / larguara me mundësi recall.
     */
    public function bumped(Request $request)
    {
        $branchId = $request->query('branch_id');
        $limit = (int) $request->query('limit', 30);

        $tickets = $this->kdsService->getBumpedTickets(
            $branchId ? (int)$branchId : null,
            $limit
        );

        return response()->json([
            'success' => true,
            'data' => $tickets,
        ]);
    }

    /**
     * Përditëson statusin e artikullit individual (Item-Level Tracking).
     */
    public function updateItemStatus(int $itemId, Request $request)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:pending,preparing,ready',
        ]);

        $userId = $request->user()?->id;

        $result = $this->kdsService->updateItemStatus($itemId, $validated['status'], $userId);

        return response()->json([
            'success' => true,
            'message' => 'Statusi i artikullit u përditësua me sukses.',
            'data' => $result,
        ]);
    }

    /**
     * Bump biletën nga ekrani aktiv.
     */
    public function bump(int $orderId, Request $request)
    {
        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $userId = $request->user()?->id;

        $order = $this->kdsService->bumpTicket($orderId, $validated['reason'] ?? null, $userId);

        return response()->json([
            'success' => true,
            'message' => 'Bileta u bump-ua me sukses nga ekrani.',
            'data' => $order,
        ]);
    }

    /**
     * Recall biletën e përfunduar mbrapsht në ekran.
     */
    public function recall(int $orderId, Request $request)
    {
        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $userId = $request->user()?->id;

        $order = $this->kdsService->recallTicket($orderId, $validated['reason'] ?? null, $userId);

        return response()->json([
            'success' => true,
            'message' => 'Bileta u rikthye në ekranin aktiv me sukses.',
            'data' => $order,
        ]);
    }

    /**
     * Përditëson nivelin e prioritetit të porosisë.
     */
    public function updatePriority(int $orderId, Request $request)
    {
        $validated = $request->validate([
            'priority' => 'required|string|in:normal,high,urgent',
        ]);

        $userId = $request->user()?->id;

        $order = $this->kdsService->updateOrderPriority($orderId, $validated['priority'], $userId);

        return response()->json([
            'success' => true,
            'message' => 'Prioriteti i porosisë u përditësua.',
            'data' => $order,
        ]);
    }

    /**
     * Statistikat e shpejta të KDS.
     */
    public function stats(Request $request)
    {
        $branchId = $request->query('branch_id');

        $stats = $this->kdsService->getKdsStats($branchId ? (int)$branchId : null);

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Smart Polling / Sync Checksum.
     */
    public function sync(Request $request)
    {
        $branchId = $request->query('branch_id');

        $syncInfo = $this->kdsService->getSyncInfo($branchId ? (int)$branchId : null);

        return response()->json([
            'success' => true,
            'data' => $syncInfo,
        ]);
    }

    /**
     * Stacionet dhe numërimi i artikujve.
     */
    public function stations(Request $request)
    {
        $branchId = $request->query('branch_id');

        $data = $this->kdsService->getStationsWithCounts($branchId ? (int)$branchId : null);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }
}
