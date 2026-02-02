<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class PasswordResetsTableSeeder extends Seeder
{
    public function run()
    {
        if (!$this->db->tableExists('password_resets')) {
            $forge = \Config\Database::forge();

            $forge->addField([
                'id' => [
                    'type' => 'BIGINT',
                    'unsigned' => true,
                    'auto_increment' => true,
                ],
                'user_id' => [
                    'type' => 'BIGINT',
                    'unsigned' => true,
                ],
                'token' => [
                    'type' => 'VARCHAR',
                    'constraint' => 255,
                ],
                'expires_at' => [
                    'type' => 'DATETIME',
                ],
                'used' => [
                    'type' => 'TINYINT',
                    'constraint' => 1,
                    'default' => 0,
                ],
                'created_at' => [
                    'type' => 'DATETIME',
                    'null' => true,
                ],
            ]);

            $forge->addKey('id', true);
            $forge->addKey('token');
            $forge->addKey('user_id');
            $forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE');
            $forge->createTable('password_resets');

            echo "Table 'password_resets' created successfully!\n";
        } else {
            echo "Table 'password_resets' already exists.\n";
        }
    }
}
