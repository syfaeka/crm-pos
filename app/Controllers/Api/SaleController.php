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

        if (empty($data['items']) || !is_array($data['items'])) return $this->error('Items are required', 422);
        if (empty($data['payments']) || !is_array($data['payments'])) return $this->error('Payments are required', 422);

        $branchId = $this->branchId ?? ($data['branch_id'] ?? null);
        if (empty($branchId)) return $this->error('Branch context is required.', 422);

        $db = \Config\Database::connect();
        $db->transBegin();

        try {
            $subtotal = 0;
            $saleItems = [];

            foreach ($data['items'] as $item) {
                $idOrSku = $item['variant_id'];
                $variant = $this->variantModel->find($idOrSku);
                if (!$variant) $variant = $this->variantModel->where('sku', $idOrSku)->first();
                if (!$variant) throw new \Exception("Product variant {$idOrSku} not found");

                $quantity = (int) $item['quantity'];
                $unitPrice = (float) $variant->selling_price;
                $itemDiscount = (float) ($item['discount'] ?? 0);
                $itemSubtotal = ($unitPrice * $quantity) - $itemDiscount;

                $saleItems[] = [
                    'variant_id' => $variant->id,
                    'product_name' => $variant->name ?? 'Product',
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'discount_amount' => $itemDiscount,
                    'subtotal' => $itemSubtotal
                ];
                $subtotal += $itemSubtotal;
            }

            $tierDiscount = 0;
            $tierName = 'Guest';
            $tierDiscountPercent = 0;
            $customerId = $data['customer_id'] ?? null;
            $customer = null;

            if (!empty($customerId)) {
                $customerData = $this->customerModel->find($customerId);
                if (!$customerData) throw new \Exception("Customer not found");
                
                $customer = (array) $customerData; 
                $tier = $this->customerModel->getTierBySpending((float) $customer['total_spent']); 
                
                $tierObj = (object) $tier;
                $tierName = $tierObj->name;
                $tierDiscountPercent = (float) $tierObj->discount_percent;

                $tierDiscount = $subtotal * ($tierDiscountPercent / 100);
            }

            $voucherCode = $data['voucher_code'] ?? null;
            $voucherDiscount = (float) ($data['discount_value'] ?? 0);         
            if ($voucherDiscount <= 0) {
            $voucherDiscount = 0;
            $voucherCode = null;
        }

            $pointsRedeemed = 0;
            $pointsDiscount = 0;
            $usePoints = !empty($data['use_points']);
            $pointValue = 100; 

            if ($customer && $usePoints) {
                $availablePoints = (int) $customer['total_points'];
                $amountAfterDiscounts = $subtotal - $tierDiscount - $voucherDiscount;
                
                $maxPointsAllowed = (int) floor(max(0, $amountAfterDiscounts) / $pointValue);
                
                $requestedPoints = isset($data['points_amount']) ? (int) $data['points_amount'] : null;
                $pointsToRedeem = ($requestedPoints !== null) 
                    ? min($requestedPoints, $availablePoints, $maxPointsAllowed)
                    : min($availablePoints, $maxPointsAllowed);

                if ($pointsToRedeem > 0) {
                    $pointsRedeemed = $pointsToRedeem;
                    $pointsDiscount = $pointsRedeemed * $pointValue;
                }
            }

            $totalDiscount = $tierDiscount + $voucherDiscount + $pointsDiscount;
            $taxRate = 0.11;
            $taxableAmount = max(0, $subtotal - $totalDiscount);
            $taxAmount = $taxableAmount * $taxRate;
            $totalAmount = $taxableAmount + $taxAmount;

            $paidAmount = array_sum(array_column($data['payments'], 'amount'));
            $changeAmount = $paidAmount - $totalAmount;
            
            $pointsEarned = 0;
            if ($customer) {
                $pointsEarned = (int) floor($totalAmount / 10000);
            }

            $saleData = [
                'branch_id' => $branchId,
                'customer_id' => $customerId,
                'cashier_id' => $this->currentUser->id ?? null,
                'invoice_number' => $this->saleModel->generateInvoiceNumber($branchId),
                'transaction_date' => date('Y-m-d H:i:s'),
                'subtotal' => $subtotal,
                'discount_amount' => $totalDiscount,
                
                'voucher_code' => $voucherCode,
                'voucher_amount' => $voucherDiscount,
                'tier_discount_amount' => $tierDiscount,
                
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'change_amount' => max(0, $changeAmount),
                'points_earned' => $pointsEarned,
                'points_redeemed' => $pointsRedeemed, 
                
                'status' => 'completed',
                'notes' => $data['notes'] ?? null,
                'completed_at' => date('Y-m-d H:i:s')
            ];

            if (!$this->saleModel->insert($saleData)) {
                $errors = $this->saleModel->errors();
                throw new \Exception('Gagal Simpan Sale Header: ' . implode(', ', $errors));
            }
            $saleId = $this->saleModel->getInsertID();

            foreach ($saleItems as $index => $item) {
                $item['sale_id'] = $saleId;
                $item['created_at'] = date('Y-m-d H:i:s');
                
                if (!$db->table('sale_items')->insert($item)) {
                    $dbErr = $db->error();
                    throw new \Exception("Gagal Simpan Item #{$index}: " . $dbErr['message']);
                }

                try {
                    $this->variantModel->adjustStock($item['variant_id'], $item['quantity'], 'out');
                } catch (\Exception $stockEx) {
                    throw new \Exception("Gagal Update Stok Item #{$index}: " . $stockEx->getMessage());
                }
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

            if ($customer) {
                $currentTotalPoints = (int) $customer['total_points'];
                $currentTotalSpent = (float) $customer['total_spent'];
                $currentVisitCount = (int) $customer['visit_count'];

                $newTotalPoints = $currentTotalPoints - $pointsRedeemed + $pointsEarned;

                $this->customerModel->update($customerId, [
                    'total_spent' => $currentTotalSpent + $totalAmount,
                    'total_points' => $newTotalPoints,
                    'visit_count' => $currentVisitCount + 1,
                    'last_visit_at' => date('Y-m-d H:i:s')
                ]);
            }

            $db->transCommit();

            $saleResponse = (object) $saleData;
            $saleResponse->id = $saleId;
            $saleResponse->items = $saleItems;
            $saleResponse->payments = $data['payments'];
            $saleResponse->tier_name = $tierName;
            
            return $this->success($saleResponse, 'Sale completed', 201);

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
private function generateReceipt($sale, string $format): string
    {
        $lines = [];
        $lines[] = str_repeat('=', 32);
        $lines[] = "        KOPI KUY POS";
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
        
        if (!empty($sale->tier_discount_amount) && $sale->tier_discount_amount > 0) {
            $lines[] = sprintf("Member Disc: -%s", number_format($sale->tier_discount_amount, 0, ',', '.'));
        }

        if (!empty($sale->voucher_amount) && $sale->voucher_amount > 0) {
            if (!empty($sale->voucher_code)) {
                $lines[] = sprintf("Voucher (%s): -%s", $sale->voucher_code, number_format($sale->voucher_amount, 0, ',', '.'));
            } else {
                $lines[] = sprintf("Discount: -%s", number_format($sale->voucher_amount, 0, ',', '.'));
            }
        }

        if (!empty($sale->points_redeemed) && $sale->points_redeemed > 0) {
            $pointsVal = $sale->points_redeemed * 100;
            $lines[] = sprintf("Points Used: -%s", number_format($pointsVal, 0, ',', '.'));
        }

        $lines[] = sprintf("Tax: %s", number_format($sale->tax_amount, 0, ',', '.'));
        $lines[] = str_repeat('=', 32);
        $lines[] = sprintf("TOTAL: Rp %s", number_format($sale->total_amount, 0, ',', '.'));
        $lines[] = str_repeat('=', 32);

        foreach ($sale->payments as $payment) {
            $lines[] = sprintf("%s: Rp %s", ucfirst($payment->payment_method), number_format($payment->amount, 0, ',', '.'));
        }
        if ($sale->change_amount > 0) {
            $lines[] = sprintf("Change: Rp %s", number_format($sale->change_amount, 0, ',', '.'));
        }
        if (isset($sale->points_earned) && $sale->points_earned > 0) {
            $lines[] = str_repeat('-', 32);
            $lines[] = sprintf("Points Earned: +%d", $sale->points_earned);
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
            'processed_by' => $this->currentUser->id ?? null,
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