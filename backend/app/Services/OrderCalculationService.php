<?php

namespace App\Services;

use App\Models\Product;
use App\Models\OptionChoice;
use InvalidArgumentException;

/**
 * Service responsible for 100% server-side mathematical verification of orders,
 * base product prices, and chosen modifiers. Client prices are NEVER trusted.
 */
class OrderCalculationService
{
    /**
     * Calculate and strictly validate cart payload
     *
     * @param array $items Array of ['product_id', 'quantity', 'option_choice_ids']
     * @return array Calculated pricing breakdown
     */
    public function calculate(array $items): array
    {
        $subtotal = 0.00;
        $processedItems = [];

        foreach ($items as $item) {
            $productId = $item['product_id'] ?? null;
            $quantity = (int) ($item['quantity'] ?? 1);
            $selectedChoiceIds = $item['option_choice_ids'] ?? [];

            if ($quantity < 1) {
                throw new InvalidArgumentException("Quantity must be at least 1.");
            }

            $product = Product::with(['optionGroups.optionChoices'])->findOrFail($productId);

            if (!$product->is_available) {
                throw new InvalidArgumentException("Product '{$product->name}' is currently unavailable.");
            }

            $unitPrice = (float) $product->base_price;
            $optionsTotal = 0.00;
            $processedOptions = [];

            // Validate and sum options
            if (!empty($selectedChoiceIds)) {
                $choices = OptionChoice::with('optionGroup')->whereIn('id', $selectedChoiceIds)->get();
                foreach ($choices as $choice) {
                    // Verify that choice's option group belongs to this product
                    if ($choice->optionGroup->product_id !== $product->id) {
                        throw new InvalidArgumentException("Option '{$choice->name}' does not belong to product '{$product->name}'.");
                    }
                    $optionsTotal += (float) $choice->additional_price;
                    $processedOptions[] = [
                        'option_choice_id' => $choice->id,
                        'option_group_name' => $choice->optionGroup->name,
                        'option_choice_name' => $choice->name,
                        'additional_price' => (float) $choice->additional_price,
                    ];
                }
            }

            $itemUnitPrice = $unitPrice + $optionsTotal;
            $lineTotal = $itemUnitPrice * $quantity;
            $subtotal += $lineTotal;

            $processedItems[] = [
                'product_id' => $product->id,
                'station_id' => $product->default_station_id,
                'product_name' => $product->name,
                'unit_price' => $unitPrice,
                'options_total' => $optionsTotal,
                'item_unit_price' => $itemUnitPrice,
                'quantity' => $quantity,
                'line_total' => $lineTotal,
                'options' => $processedOptions,
            ];
        }

        $taxAmount = round($subtotal * 0.00, 2); // Tax if applicable
        $totalPrice = round($subtotal + $taxAmount, 2);

        return [
            'subtotal' => round($subtotal, 2),
            'tax_amount' => $taxAmount,
            'total_price' => $totalPrice,
            'items' => $processedItems,
        ];
    }
}
