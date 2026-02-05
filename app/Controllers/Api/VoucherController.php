<?php

namespace App\Controllers\Api;

class VoucherController extends BaseApiController
{
    /**
     * GET /api/v1/vouchers
     */
    public function index()
    {
        $db = \Config\Database::connect();

        $vouchers = $db->table('vouchers')
            ->where('tenant_id', $this->tenantId)
            ->orderBy('created_at', 'DESC')
            ->get()
            ->getResultArray();

        $mappedVouchers = array_map(function($v) {
            $v['type'] = $v['discount_type']; 
            $v['value'] = $v['discount_value'];
            $v['min_order'] = $v['min_order'] ?? $v['min_purchase'];
            $v['valid_until'] = $v['valid_until'] ?? $v['valid_to'];
            return $v;
        }, $vouchers);

        return $this->success($mappedVouchers);
    }

    /**
     * POST /api/v1/vouchers/validate
     */
    public function validateCode()
    {
        $data = $this->request->getJSON(true);
        $code = $data['code'] ?? null;
        $subtotal = $data['subtotal'] ?? 0;

        if (empty($code)) {
            return $this->error('Voucher code is required', 422);
        }

        $db = \Config\Database::connect();

        $voucher = $db->table('vouchers')
            ->where('tenant_id', $this->tenantId)
            ->where('code', $code)
            ->where('is_active', true)
            ->get()
            ->getRow();

        if (!$voucher) {
            return $this->error('Invalid voucher code', 404);
        }

        $now = date('Y-m-d H:i:s');
        if ($voucher->valid_from && $now < $voucher->valid_from) {
            return $this->error('Voucher is not yet valid', 400);
        }
        
        $expiryDate = $voucher->valid_until ?? $voucher->valid_to;
        if ($expiryDate && $now > $expiryDate) {
            return $this->error('Voucher has expired', 400);
        }

        if ($voucher->usage_limit !== null && $voucher->usage_count >= $voucher->usage_limit) {
            return $this->error('Voucher usage limit reached', 400);
        }

        $minOrder = $voucher->min_order > 0 ? $voucher->min_order : $voucher->min_purchase;
        if ($minOrder > 0 && $subtotal < $minOrder) {
            return $this->error('Minimum order of Rp ' . number_format($minOrder, 0, ',', '.') . ' required', 400);
        }

        $discount = 0;
        if ($voucher->discount_type === 'percentage') {
            $discount = $subtotal * ($voucher->discount_value / 100);
            if ($voucher->max_discount && $discount > $voucher->max_discount) {
                $discount = $voucher->max_discount;
            }
        } else {
            $discount = $voucher->discount_value;
        }

        return $this->success([
            'voucher_id' => $voucher->id,
            'code' => $voucher->code,
            'type' => $voucher->discount_type,
            'value' => $voucher->discount_value,
            'discount_amount' => $discount,
            'description' => $voucher->description
        ], 'Voucher is valid');
    }

    /**
     * POST /api/v1/vouchers
     */
    public function create()
    {
        $data = $this->request->getJSON(true);

        if (empty($data['code'])) {
            return $this->error('Voucher code is required', 422);
        }
        if (empty($data['type']) || !in_array($data['type'], ['percentage', 'fixed'])) {
            return $this->error('Type must be percentage or fixed', 422);
        }
        if (!isset($data['value']) || $data['value'] <= 0) {
            return $this->error('Value must be greater than 0', 422);
        }

        $db = \Config\Database::connect();

        $existing = $db->table('vouchers')
            ->where('tenant_id', $this->tenantId)
            ->where('code', $data['code'])
            ->get()
            ->getRow();

        if ($existing) {
            return $this->error('Voucher code already exists', 409);
        }

        // PERBAIKAN: Default valid_from ke HARI INI jika kosong
        $validFrom = !empty($data['valid_from']) ? $data['valid_from'] : date('Y-m-d H:i:s');
        $validUntil = !empty($data['valid_until']) ? $data['valid_until'] : null;

        $voucherData = [
            'tenant_id' => $this->tenantId,
            'code' => strtoupper($data['code']),
            'description' => $data['description'] ?? null,
            'discount_type' => $data['type'], 
            'discount_value' => $data['value'],
            'min_order' => $data['min_order'] ?? 0,
            'min_purchase' => $data['min_order'] ?? 0,
            'max_discount' => $data['max_discount'] ?? null,
            'usage_limit' => $data['usage_limit'] ?? null,
            'usage_count' => 0,
            'valid_from' => $validFrom, 
            'valid_until' => $validUntil,
            'valid_to' => $validUntil,
            'is_active' => true,
            'created_at' => date('Y-m-d H:i:s')
        ];

        $db->table('vouchers')->insert($voucherData);
        $id = $db->insertID();

        $voucher = $db->table('vouchers')->where('id', $id)->get()->getRowArray();
        return $this->success($voucher, 'Voucher created', 201);
    }

    /**
     * PUT /api/v1/vouchers/:id
     */
    public function update($id = null)
    {
        $db = \Config\Database::connect();

        $voucher = $db->table('vouchers')
            ->where('id', $id)
            ->where('tenant_id', $this->tenantId)
            ->get()
            ->getRow();

        if (!$voucher) {
            return $this->error('Voucher not found', 404);
        }

        $data = $this->request->getJSON(true);
        $updateData = [];
        $updateData['updated_at'] = date('Y-m-d H:i:s');

        if (isset($data['description'])) $updateData['description'] = $data['description'];
        if (isset($data['type']))        $updateData['discount_type'] = $data['type'];
        if (isset($data['value']))       $updateData['discount_value'] = $data['value'];
        if (isset($data['max_discount'])) $updateData['max_discount'] = $data['max_discount'];
        if (isset($data['usage_limit']))  $updateData['usage_limit'] = $data['usage_limit'];
        if (isset($data['is_active']))    $updateData['is_active'] = $data['is_active'];
        if (isset($data['valid_from']))   $updateData['valid_from'] = $data['valid_from'];
        if (isset($data['min_order'])) {
            $updateData['min_order'] = $data['min_order'];
            $updateData['min_purchase'] = $data['min_order'];
        }
        if (isset($data['valid_until'])) {
            $updateData['valid_until'] = $data['valid_until'];
            $updateData['valid_to'] = $data['valid_until'];
        }
        $db->table('vouchers')->where('id', $id)->update($updateData);
        $updated = $db->table('vouchers')->where('id', $id)->get()->getRowArray();
        return $this->success($updated, 'Voucher updated');
    }

    /**
     * DELETE /api/v1/vouchers/:id
     */
    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        $db->table('vouchers')->where('id', $id)->delete();
        return $this->success(null, 'Voucher deleted');
    }
}