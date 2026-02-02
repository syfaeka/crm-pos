<?php

namespace App\Controllers\Api;

class BranchController extends BaseApiController
{
    /**
     * GET /api/v1/branches
     * List all branches for the current tenant (through stores)
     */
    public function index()
    {
        $db = \Config\Database::connect();

        $branches = $db->table('branches b')
            ->select('b.*, s.name as store_name')
            ->join('stores s', 's.id = b.store_id')
            ->where('s.tenant_id', $this->tenantId)
            ->where('b.deleted_at', null)
            ->orderBy('b.name', 'ASC')
            ->get()
            ->getResultArray();

        return $this->success($branches);
    }

    /**
     * GET /api/v1/branches/:id
     */
    public function show($id = null)
    {
        $db = \Config\Database::connect();

        $branch = $db->table('branches b')
            ->select('b.*, s.name as store_name')
            ->join('stores s', 's.id = b.store_id')
            ->where('b.id', $id)
            ->where('s.tenant_id', $this->tenantId)
            ->where('b.deleted_at', null)
            ->get()
            ->getRowArray();

        if (!$branch) {
            return $this->error('Branch not found', 404);
        }

        return $this->success($branch);
    }

    /**
     * POST /api/v1/branches
     */
    public function create()
    {
        $data = $this->request->getJSON(true);

        if (empty($data['name'])) {
            return $this->error('Branch name is required', 422);
        }

        $db = \Config\Database::connect();

        $store = $db->table('stores')
            ->where('tenant_id', $this->tenantId)
            ->where('is_active', true)
            ->get()
            ->getRow();

        if (!$store) {
            return $this->error('No active store found for this tenant', 400);
        }

        $code = strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $data['name']), 0, 5));
        $existing = $db->table('branches')
            ->where('store_id', $store->id)
            ->where('code', $code)
            ->get()
            ->getRow();
        if ($existing) {
            $code .= rand(10, 99);
        }

        $branchData = [
            'store_id' => $store->id,
            'name' => $data['name'],
            'code' => $code,
            'address' => $data['address'] ?? null,
            'phone' => $data['phone'] ?? null,
            'is_active' => $data['is_active'] ?? true,
            'created_at' => date('Y-m-d H:i:s')
        ];

        $db->table('branches')->insert($branchData);
        $id = $db->insertID();

        $branch = $db->table('branches b')
            ->select('b.*, s.name as store_name')
            ->join('stores s', 's.id = b.store_id')
            ->where('b.id', $id)
            ->get()
            ->getRowArray();

        return $this->success($branch, 'Branch created', 201);
    }

    /**
     * PUT /api/v1/branches/:id
     */
    public function update($id = null)
    {
        $db = \Config\Database::connect();

        // Verify branch belongs to tenant
        $branch = $db->table('branches b')
            ->join('stores s', 's.id = b.store_id')
            ->where('b.id', $id)
            ->where('s.tenant_id', $this->tenantId)
            ->where('b.deleted_at', null)
            ->get()
            ->getRow();

        if (!$branch) {
            return $this->error('Branch not found', 404);
        }

        $data = $this->request->getJSON(true);

        $updateData = [];
        if (isset($data['name']))
            $updateData['name'] = $data['name'];
        if (isset($data['address']))
            $updateData['address'] = $data['address'];
        if (isset($data['phone']))
            $updateData['phone'] = $data['phone'];
        if (isset($data['is_active']))
            $updateData['is_active'] = $data['is_active'];
        $updateData['updated_at'] = date('Y-m-d H:i:s');

        $db->table('branches')->where('id', $id)->update($updateData);

        $updated = $db->table('branches b')
            ->select('b.*, s.name as store_name')
            ->join('stores s', 's.id = b.store_id')
            ->where('b.id', $id)
            ->get()
            ->getRowArray();

        return $this->success($updated, 'Branch updated');
    }

    /**
     * DELETE /api/v1/branches/:id
     */
    public function delete($id = null)
    {
        $db = \Config\Database::connect();

        // Verify branch belongs to tenant
        $branch = $db->table('branches b')
            ->join('stores s', 's.id = b.store_id')
            ->where('b.id', $id)
            ->where('s.tenant_id', $this->tenantId)
            ->where('b.deleted_at', null)
            ->get()
            ->getRow();

        if (!$branch) {
            return $this->error('Branch not found', 404);
        }

        // Soft delete
        $db->table('branches')->where('id', $id)->update([
            'is_active' => false,
            'deleted_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ]);

        return $this->success(null, 'Branch deleted');
    }
}
