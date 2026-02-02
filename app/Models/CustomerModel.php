<?php

namespace App\Models;

use CodeIgniter\Model;

class CustomerModel extends Model
{
    protected $table = 'customers';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useSoftDeletes = true;
    protected $useTimestamps = true;

    protected $allowedFields = [
        'tenant_id',
        'tier_id',
        'code',
        'name',
        'email',
        'phone',
        'address',
        'city',
        'postal_code',
        'birth_date',
        'gender',
        'notes',
        'total_points',
        'total_spent',
        'visit_count',
        'last_visit_at',
        'total_points',
        'is_active'
    ];

    /**
     * Generate customer code
     */
    public function generateCode(int $tenantId): string
    {
        $prefix = "CUST-";
        $lastCustomer = $this->where('tenant_id', $tenantId)
            ->orderBy('id', 'DESC')
            ->first();

        $newNumber = $lastCustomer ? $lastCustomer->id + 1 : 1;
        return $prefix . str_pad($newNumber, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Find by phone or email
     */
    public function findByContact(int $tenantId, string $contact): ?object
    {
        return $this->where('tenant_id', $tenantId)
            ->groupStart()
            ->where('phone', $contact)
            ->orWhere('email', $contact)
            ->groupEnd()
            ->first();
    }

    /**
     * Update customer stats after purchase
     */
    public function updateAfterPurchase(int $customerId, float $amount, int $points): bool
    {
        $customer = $this->find($customerId);
        if (!$customer) {
            return false;
        }

        return $this->update($customerId, [
            'total_spent' => $customer->total_spent + $amount,
            'total_points' => $customer->total_points + $points,
            'visit_count' => $customer->visit_count + 1,
            'last_visit_at' => date('Y-m-d H:i:s')
        ]);
    }
}
