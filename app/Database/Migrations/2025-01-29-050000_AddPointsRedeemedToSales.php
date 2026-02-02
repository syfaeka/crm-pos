<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Add points_redeemed column to sales table for tracking loyalty point redemptions
 */
class AddPointsRedeemedToSales extends Migration
{
    public function up()
    {
        $this->forge->addColumn('sales', [
            'points_redeemed' => [
                'type' => 'INT',
                'default' => 0,
                'after' => 'points_earned',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('sales', 'points_redeemed');
    }
}