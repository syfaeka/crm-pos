<?php

namespace App\Controllers\Api;

use App\Models\SaleModel;
use App\Models\ProductVariantModel;
use App\Models\CustomerModel;
use App\Services\SaleService;

class SaleController extends BaseApiController
{
    protected SaleModel $saleModel;
    protected ProductVariantModel $variantModel;
    protected CustomerModel $customerModel;

    public function __construct()
    {
        parent::__construct();
        $this->saleModel = new SaleModel();
        $this->variantModel = new ProductVariantModel();
        $this->customerModel = new CustomerModel();
    }

    /**
     * GET /api/v1/sales
     */
    public function index()
    {
        $filters = [
            'date_from' => $this->request->getGet('date_from'),
            'date_to' => $this->request->getGet('date_to'),
            'status' => $this->request->getGet('status')
        ];

        $builder = $this->saleModel->where('branch_id', $this->branchId);

        if (!empty($filters['date_from'])) {
            $builder->where('DATE(transaction_date) >=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $builder->where('DATE(transaction_date) <=', $filters['date_to']);
        }
        if (!empty($filters['status'])) {
            $builder->where('status', $filters['status']);
        }

        $sales = $builder->orderBy('created_at', 'DESC')
            ->limit(100)
            ->findAll();

        return $this->success($sales);
    }

    /**
     * GET /api/v1/sales/:id
     */
    public function show($id = null)
    {
        $sale = $this->saleModel->getSaleWithDetails($id);
        if (!$sale || $sale->branch_id != $this->branchId) {
            return $this->error('Sale not found', 404);
        }

        return $this->success($sale);
    }

    /**
     * POST /api/v1/sales
     */
    public function create()
    {
        $data = $this->request->getJSON(true);

        if (empty($data['items']) || !is_array($data['items'])) {
            return $this->error('Items are required', 422);
        }
        if (empty($data['payments']) || !is_array($data['payments'])) {
            return $this->error('Payments are required', 422);
        }

        $branchId = $this->branchId;
        if (empty($branchId)) {
            $branchId = $data['branch_id'] ?? null;
        }
        if (empty($branchId)) {
            return $this->error('Branch context is required for this transaction. Please select a branch or ensure you are assigned to one.', 422);
        }

        $db = \Config\Database::connect();
        $db->transBegin();

        try {
            $subtotal = 0;
            $saleItems = [];

            foreach ($data['items'] as $item) {
                $idOrSku = $item['variant_id'];
                $variant = $this->variantModel->find($idOrSku);

    if (!$variant) {
        $variant = $this->variantModel->where('sku', $idOrSku)->first(); 
    }

    if (!$variant) {
        throw new \Exception("Product variant {$idOrSku} not found");
    }

                $quantity = (int) $item['quantity'];
                $unitPrice = $variant->selling_price;
                $discount = $item['discount'] ?? 0;
                $itemSubtotal = ($unitPrice * $quantity) - $discount;

                $saleItems[] = [
                    'variant_id' => $variant->id,
                    'product_name' => $variant->name ?? 'Product',
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'discount_amount' => $discount,
                    'subtotal' => $itemSubtotal
                ];

                $subtotal += $itemSubtotal;
            }

            $discountAmount = $data['discount_value'] ?? 0;
            if (($data['discount_type'] ?? 'none') === 'percentage') {
                $discountAmount = $subtotal * ($data['discount_value'] / 100);
            }

            $taxRate = 0.11;
            $taxableAmount = $subtotal - $discountAmount;
            $taxAmount = $taxableAmount * $taxRate;

            $totalAmount = $subtotal - $discountAmount + $taxAmount;

            $paidAmount = array_sum(array_column($data['payments'], 'amount'));
            $changeAmount = $paidAmount - $totalAmount;

            $saleData = [
                'branch_id' => $branchId,
                'customer_id' => $data['customer_id'] ?? null,
                'cashier_id' => $this->currentUser->id,
                'invoice_number' => $this->saleModel->generateInvoiceNumber($branchId),
                'transaction_date' => date('Y-m-d H:i:s'),
                'subtotal' => $subtotal,
                'discount_amount' => $discountAmount,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'change_amount' => max(0, $changeAmount),
                'status' => 'completed',
                'notes' => $data['notes'] ?? null,
                'completed_at' => date('Y-m-d H:i:s')
            ];

            $saleId = $this->saleModel->insert($saleData);

            foreach ($saleItems as $item) {
                $item['sale_id'] = $saleId;
                $item['created_at'] = date('Y-m-d H:i:s');
                $db->table('sale_items')->insert($item);

                $this->variantModel->adjustStock($item['variant_id'], $item['quantity'], 'out');
            }

            foreach ($data['payments'] as $payment) {
                $db->table('payments')->insert([
                    'sale_id' => $saleId,
                    'payment_method' => $payment['method'],
                    'amount' => $payment['amount'],
                    'reference_number' => $payment['reference'] ?? null,
                    'status' => 'completed',
                    'created_at' => date('Y-m-d H:i:s')
                ]);
            }

         if (!empty($data['customer_id'])) {
                $pointsEarned = floor($totalAmount / 10000); 

                $customer = $this->customerModel->find($data['customer_id']);
                
                if (!empty($data['customer_id'])) {
                $pointsEarned = floor($totalAmount / 10000); 

                $customer = $this->customerModel->find($data['customer_id']);
                
                if ($customer) {
                    $custData = (array) $customer;
                    
                    $currentPoints = $custData['total_points'] ?? 0;
                    
                    $newPoints = $currentPoints + $pointsEarned;

                    $this->customerModel->update($data['customer_id'], [
                        'total_points' => $newPoints
                    ]);
                }

                $this->customerModel->updateAfterPurchase($data['customer_id'], $totalAmount, 0);
            }

                $this->customerModel->updateAfterPurchase($data['customer_id'], $totalAmount, 0);
            }

            $db->transCommit();

            $sale = $this->saleModel->getSaleWithDetails($saleId);
            return $this->success($sale, 'Sale completed', 201);

        } catch (\Exception $e) {
            $db->transRollback();
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * POST /api/v1/sales/:id/void
     */
    public function void($id = null)
    {
        $sale = $this->saleModel->find($id);
        if (!$sale || $sale->branch_id != $this->branchId) {
            return $this->error('Sale not found', 404);
        }

        if ($sale->status === 'voided') {
            return $this->error('Sale already voided', 400);
        }

        $this->saleModel->update($id, [
            'status' => 'voided',
            'updated_at' => date('Y-m-d H:i:s')
        ]);

        $db = \Config\Database::connect();
        $items = $db->table('sale_items')->where('sale_id', $id)->get()->getResult();
        foreach ($items as $item) {
            $this->variantModel->adjustStock($item->variant_id, $item->quantity, 'in');
        }

        return $this->success(null, 'Sale voided');
    }

    /**
     * GET /api/v1/sales/:id/receipt
     */
    public function receipt($id = null)
    {
        $sale = $this->saleModel->getSaleWithDetails($id);
        if (!$sale || $sale->branch_id != $this->branchId) {
            return $this->error('Sale not found', 404);
        }

        $format = $this->request->getGet('format') ?? 'thermal';

        $receipt = $this->generateReceipt($sale, $format);

        return $this->success([
            'format' => $format,
            'content' => $receipt
        ]);
    }

    private function generateReceipt($sale, string $format): string
    {
        $lines = [];
        $lines[] = str_repeat('=', 32);
        $lines[] = "        CRM+POS STORE";
        $lines[] = str_repeat('=', 32);
        $lines[] = "Invoice: {$sale->invoice_number}";
        $lines[] = "Date: " . date('d/m/Y H:i', strtotime($sale->transaction_date));
        $lines[] = str_repeat('-', 32);

        foreach ($sale->items as $item) {
            $lines[] = $item->product_name;
            $lines[] = sprintf(
                "  %d x %s = %s",
                $item->quantity,
                number_format($item->unit_price, 0, ',', '.'),
                number_format($item->subtotal, 0, ',', '.')
            );
        }

        $lines[] = str_repeat('-', 32);
        $lines[] = sprintf("Subtotal: %s", number_format($sale->subtotal, 0, ',', '.'));
        if ($sale->discount_amount > 0) {
            $lines[] = sprintf("Discount: -%s", number_format($sale->discount_amount, 0, ',', '.'));
        }
        $lines[] = sprintf("Tax: %s", number_format($sale->tax_amount, 0, ',', '.'));
        $lines[] = str_repeat('=', 32);
        $lines[] = sprintf("TOTAL: Rp %s", number_format($sale->total_amount, 0, ',', '.'));
        $lines[] = str_repeat('=', 32);

        foreach ($sale->payments as $payment) {
            $lines[] = sprintf(
                "%s: Rp %s",
                ucfirst($payment->payment_method),
                number_format($payment->amount, 0, ',', '.')
            );
        }
        if ($sale->change_amount > 0) {
            $lines[] = sprintf("Change: Rp %s", number_format($sale->change_amount, 0, ',', '.'));
        }

        $lines[] = "";
        $lines[] = "    Thank you for shopping!";
        $lines[] = str_repeat('=', 32);

        return implode("\n", $lines);
    }

    /**
     * POST /api/v1/sales/:id/refund
     */
    public function refund($id = null)
    {
        $sale = $this->saleModel->find($id);
        if (!$sale || $sale->branch_id != $this->branchId) {
            return $this->error('Sale not found', 404);
        }

        $data = $this->request->getJSON(true);

        $db = \Config\Database::connect();
        $refundNumber = 'REF-' . date('Ymd') . '-' . str_pad($id, 4, '0', STR_PAD_LEFT);

        $db->table('refunds')->insert([
            'sale_id' => $id,
            'refund_number' => $refundNumber,
            'total_amount' => $sale->total_amount,
            'reason' => $data['reason'] ?? null,
            'processed_by' => $this->currentUser->id,
            'status' => 'completed',
            'created_at' => date('Y-m-d H:i:s')
        ]);

        $this->saleModel->update($id, ['status' => 'refunded']);

        $items = $db->table('sale_items')->where('sale_id', $id)->get()->getResult();
        foreach ($items as $item) {
            $this->variantModel->adjustStock($item->variant_id, $item->quantity, 'in');
        }

        return $this->success(['refund_number' => $refundNumber], 'Refund processed', 201);
    }
}
