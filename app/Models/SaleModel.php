<?php

namespace App\Models;

use CodeIgniter\Model;

class SaleModel extends Model
{
    protected $table = 'sales';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useTimestamps = true;

    protected $allowedFields = [
        'branch_id',
        'customer_id',
        'cashier_id',
        'invoice_number',
        'transaction_date',
        'subtotal',
        'discount_amount',
        'voucher_code',          
        'voucher_amount',        
        'tier_discount_amount',  
        'tax_amount',
        'total_amount',
        'paid_amount',
        'change_amount',
        'points_earned',
        'points_redeemed',
        'status',
        'notes',
        'completed_at'
    ];

    /**
     * Generate next invoice number
     */
    public function generateInvoiceNumber(int $branchId): string
    {
        $date = date('Ymd');
        $prefix = "INV-{$branchId}-{$date}-";

        $lastInvoice = $this->like('invoice_number', $prefix, 'after')
            ->orderBy('id', 'DESC')
            ->first();

        if ($lastInvoice) {
            $lastNumber = (int) substr($lastInvoice->invoice_number, -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return $prefix . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Get sale with items and payments
     */
    public function getSaleWithDetails(int $saleId): ?object
    {
        $sale = $this->find($saleId);
        
        if (!$sale) {
            return null;
        }

        $db = \Config\Database::connect();

        $sale->items = $db->table('sale_items')
            ->where('sale_id', $saleId)
            ->get()
            ->getResult();

        $sale->payments = $db->table('payments')
            ->where('sale_id', $saleId)
            ->get()
            ->getResult();

        return $sale;
    }

    /**
     * Get daily sales summary
     */
    public function getDailySummary(?int $branchId, string $date, ?int $tenantId = null): object
    {
        $db = \Config\Database::connect();

        $builder = $db->table('sales s')
            ->select('COUNT(*) as total_transactions')
            ->select('SUM(s.total_amount) as total_revenue')
            ->select('SUM(s.discount_amount) as total_discount')
            ->where('DATE(s.transaction_date)', $date)
            ->where('s.status', 'completed');

        if ($branchId) {
            $builder->where('s.branch_id', $branchId);
        } elseif ($tenantId) {
            $builder->join('branches b', 'b.id = s.branch_id')
                ->join('stores st', 'st.id = b.store_id')
                ->where('st.tenant_id', $tenantId);
        }

        $result = $builder->get()->getRow();
        $paymentBuilder = $db->table('payments p')
            ->select('p.payment_method, SUM(p.amount) as total')
            ->join('sales s', 's.id = p.sale_id')
            ->where('DATE(s.transaction_date)', $date)
            ->where('s.status', 'completed');

        if ($branchId) {
            $paymentBuilder->where('s.branch_id', $branchId);
        } elseif ($tenantId) {
            $paymentBuilder->join('branches b', 'b.id = s.branch_id')
                ->join('stores st', 'st.id = b.store_id')
                ->where('st.tenant_id', $tenantId);
        }

        $payments = $paymentBuilder->groupBy('p.payment_method')
            ->get()
            ->getResultArray();

        $result->payment_breakdown = [];
        foreach ($payments as $payment) {
            $result->payment_breakdown[$payment['payment_method']] = (float) $payment['total'];
        }

        $result->total_revenue = (float) ($result->total_revenue ?? 0);
        $result->total_discount = (float) ($result->total_discount ?? 0);
        $result->total_transactions = (int) ($result->total_transactions ?? 0);
        $result->net_revenue = $result->total_revenue - $result->total_discount;

        return $result;
    }
}