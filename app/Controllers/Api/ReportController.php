<?php

namespace App\Controllers\Api;

use App\Models\SaleModel;

class ReportController extends BaseApiController
{
    protected SaleModel $saleModel;
    protected $db;

    public function __construct()
    {
        parent::__construct();
        $this->saleModel = new SaleModel();
        $this->db = \Config\Database::connect();
    }

    /**
     * GET /api/v1/reports/daily-sales
     */
    public function dailySales()
    {
        $date = $this->request->getGet('date') ?? date('Y-m-d');
        $branchId = $this->request->getGet('branch_id') ?? $this->branchId;

        $builder = $this->db->table('sales')
            ->where('status', 'completed')
            ->where('DATE(transaction_date)', $date);

        if ($branchId) {
            $builder->where('branch_id', $branchId);
        }

        $sales = $builder->get()->getResult();

        $totalRevenue = 0;
        $totalTransactions = count($sales);
        $paymentBreakdown = [];

        foreach ($sales as $sale) {
            $totalRevenue += $sale->total_amount;
            
            $payments = $this->db->table('payments')->where('sale_id', $sale->id)->get()->getResult();
            foreach ($payments as $pay) {
                if (!isset($paymentBreakdown[$pay->payment_method])) {
                    $paymentBreakdown[$pay->payment_method] = 0;
                }
                $paymentBreakdown[$pay->payment_method] += $pay->amount;
            }
        }

        return $this->success([
            'date' => $date,
            'branch_id' => $branchId,
            'total_revenue' => $totalRevenue,
            'total_transactions' => $totalTransactions,
            'net_revenue' => $totalRevenue,
            'payment_breakdown' => $paymentBreakdown
        ]);
    }

    /**
     * GET /api/v1/reports/sales-history
     */
    public function salesHistory()
    {
        $date = $this->request->getGet('date') ?? date('Y-m-d');
        $branchId = $this->branchId;

        $builder = $this->db->table('sale_items');
        
        // JOIN untuk ambil nama asli produk
        $builder->join('sales', 'sales.id = sale_items.sale_id');
        $builder->join('product_variants pv', 'pv.id = sale_items.variant_id', 'left');
        $builder->join('products p', 'p.id = pv.product_id', 'left');

        $builder->select('sale_items.id, sale_items.quantity, sale_items.unit_price, sale_items.subtotal');
        $builder->select('sales.transaction_date, sales.invoice_number');
        $builder->select('COALESCE(p.name, pv.name, sale_items.product_name) as product_name');
        
        if ($branchId) {
            $builder->where('sales.branch_id', $branchId);
        }

        $builder->where('sales.status', 'completed');
        $builder->where('DATE(sales.transaction_date)', $date);
        $builder->orderBy('sales.transaction_date', 'DESC');

        $data = $builder->get()->getResult();

        return $this->success($data);
    }

    /**
     * GET /api/v1/reports/best-sellers
     */
    public function bestSellers()
    {
        $dateFrom = $this->request->getGet('date_from') ?? date('Y-m-d');
        $limit = $this->request->getGet('limit') ?? 3; 

        $builder = $this->db->table('sale_items si');
        
        // JOIN agar nama produk konsisten
        $builder->join('sales s', 's.id = si.sale_id');
        $builder->join('product_variants pv', 'pv.id = si.variant_id', 'left');
        $builder->join('products p', 'p.id = pv.product_id', 'left');

        $builder->select('COALESCE(p.name, pv.name, si.product_name) as product_name');
        $builder->select('SUM(si.quantity) as total_qty, SUM(si.subtotal) as total_revenue');
        
        $builder->where('s.status', 'completed');
        $builder->where('DATE(s.transaction_date)', $dateFrom);

        if ($this->branchId) {
            $builder->where('s.branch_id', $this->branchId);
        }

        $builder->groupBy('si.variant_id, product_name');
        $builder->orderBy('total_qty', 'DESC');
        $builder->limit($limit);

        $bestSellers = $builder->get()->getResult();

        return $this->success($bestSellers);
    }

    /**
     * GET /api/v1/reports/inventory
     */
    public function inventory()
    {
        $inventory = $this->db->table('product_variants pv')
            ->select('p.name as product_name, pv.sku, pv.stock_qty, pv.cost_price, pv.selling_price')
            ->select('(pv.stock_qty * pv.cost_price) as stock_value, pv.min_stock')
            ->join('products p', 'p.id = pv.product_id')
            ->where('p.tenant_id', $this->tenantId)
            ->where('pv.is_active', true)
            ->where('pv.deleted_at IS NULL')
            ->orderBy('pv.stock_qty', 'ASC')
            ->get()
            ->getResult();

        $totalValue = array_sum(array_column($inventory, 'stock_value'));

        foreach ($inventory as &$item) {
            $minStock = $item->min_stock ?? 10;
            $item->status = $item->stock_qty <= $minStock ? 'Low Stock' : 'OK';
        }

        return $this->success([
            'items' => $inventory,
            'total_stock_value' => $totalValue,
            'low_stock_count' => count(array_filter($inventory, fn($i) => $i->stock_qty <= 10))
        ]);
    }
    
    /**
     * GET /api/v1/reports/customer-rfm
     */
    public function customerRfm()
    {
        $customers = $this->db->table('customers c')
            ->select('c.id, c.name, c.total_spent, c.visit_count, c.last_visit_at')
            ->select('DATEDIFF(NOW(), c.last_visit_at) as days_since_visit')
            ->where('c.tenant_id', $this->tenantId)
            ->where('c.is_active', true)
            ->orderBy('c.total_spent', 'DESC')
            ->limit(100)
            ->get()
            ->getResult();

        foreach ($customers as &$customer) {
            $r = $customer->days_since_visit <= 30 ? 5 : ($customer->days_since_visit <= 90 ? 3 : 1);
            $f = $customer->visit_count >= 10 ? 5 : ($customer->visit_count >= 5 ? 3 : 1);
            $m = $customer->total_spent >= 1000000 ? 5 : ($customer->total_spent >= 500000 ? 3 : 1);

            $customer->rfm_score = $r . $f . $m;
            $customer->segment = $this->getRfmSegment($r, $f, $m);
        }

        return $this->success($customers);
    }

    private function getRfmSegment(int $r, int $f, int $m): string
    {
        $score = $r + $f + $m;
        if ($score >= 13) return 'Champion';
        if ($score >= 10) return 'Loyal';
        if ($r >= 4 && $f <= 2) return 'New Customer';
        if ($r <= 2 && $f >= 3) return 'At Risk';
        if ($r <= 2 && $f <= 2) return 'Lost';
        return 'Potential Loyalist';
    }
}