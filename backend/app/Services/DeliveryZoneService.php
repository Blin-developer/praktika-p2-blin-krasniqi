<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\DeliveryZone;
use Illuminate\Validation\ValidationException;

class DeliveryZoneService
{
    /**
     * Merr zonat e dërgesës për një degë specifike.
     */
    public function getZonesForBranch(int $branchId, bool $activeOnly = true)
    {
        $query = DeliveryZone::where('branch_id', $branchId)
            ->orderBy('sort_order', 'asc')
            ->orderBy('name', 'asc');

        if ($activeOnly) {
            $query->where('is_active', true);
        }

        return $query->get();
    }

    /**
     * Llogarit tarifën e dërgesës, kohën e parashikuar dhe validon shumën minimale të porosisë.
     * Ky shërbim është burimi i vetëm i së vërtetës për çmimet e dërgesës.
     */
    public function calculateFeeAndValidate(Branch $branch, ?int $zoneId, float $subtotal, string $orderType): array
    {
        if ($orderType !== 'delivery') {
            return [
                'delivery_fee' => 0.00,
                'zone' => null,
                'estimated_delivery_minutes' => 0,
            ];
        }

        if ($zoneId !== null) {
            $zone = DeliveryZone::where('id', $zoneId)
                ->where('branch_id', $branch->id)
                ->first();

            if (!$zone || !$zone->is_active) {
                throw ValidationException::withMessages([
                    'delivery_zone_id' => ['Zona e zgjedhur e dërgesës nuk është aktive ose nuk i përket kësaj dege.'],
                ]);
            }

            if ((float) $zone->min_order_amount > 0 && $subtotal < (float) $zone->min_order_amount) {
                $minFormatted = number_format((float) $zone->min_order_amount, 2);
                throw ValidationException::withMessages([
                    'items' => ["Shuma minimale e porosisë për zonën '{$zone->name}' është €{$minFormatted}."],
                ]);
            }

            return [
                'delivery_fee' => round((float) $zone->delivery_fee, 2),
                'zone' => $zone,
                'estimated_delivery_minutes' => (int) $zone->estimated_delivery_minutes,
            ];
        }

        // Kur nuk zgjidhet zonë specifike (përputhshmëri me checkout klasik), përdorim tarifën standarde 1.50
        return [
            'delivery_fee' => 1.50,
            'zone' => null,
            'estimated_delivery_minutes' => 30,
        ];
    }
}
