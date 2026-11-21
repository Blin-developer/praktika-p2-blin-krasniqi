<?php

use App\Models\Branch;
use App\Models\OpeningHour;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $defaultSchedules = [
            'proper-pizza-prishtine' => ['open' => '09:00:00', 'close' => '23:30:00'],
            'tartine-artisan-deli'   => ['open' => '08:00:00', 'close' => '22:30:00'],
            'sushico-tirana'         => ['open' => '11:00:00', 'close' => '23:00:00'],
            'taverna-tirona-grill'   => ['open' => '09:00:00', 'close' => '23:00:00'],
            'pasticeri-reka'         => ['open' => '08:00:00', 'close' => '22:00:00'],
        ];

        foreach (Branch::with('restaurant')->get() as $branch) {
            if ($branch->openingHours()->count() === 0) {
                $slug = $branch->restaurant?->slug;
                $sched = $defaultSchedules[$slug] ?? ['open' => '08:00:00', 'close' => '23:00:00'];

                for ($day = 0; $day <= 6; $day++) {
                    OpeningHour::create([
                        'branch_id'    => $branch->id,
                        'day_of_week'  => $day,
                        'open_time'    => $sched['open'],
                        'close_time'   => $sched['close'],
                        'is_closed'    => false,
                        'label'        => 'Orar Standard',
                        'is_overnight' => false,
                        'sort_order'   => 0,
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        // Nuk është e nevojshme të fshihen oraret
    }
};
