<?php

namespace App\Controllers\Api;

use App\Models\ProductModel;
use App\Models\ProductVariantModel;

class ProductController extends BaseApiController
{
    protected ProductModel $productModel;
    protected ProductVariantModel $variantModel;

    public function __construct()
    {
        parent::__construct();
        $this->productModel = new ProductModel();
        $this->variantModel = new ProductVariantModel();
    }

    /**
     * GET /api/v1/products
     */
    public function index()
    {
        $filters = [
            'category_id' => $this->request->getGet('category_id'),
            'search' => $this->request->getGet('search')
        ];

        $products = $this->productModel->getProductsWithVariants($this->tenantId, $filters);

        return $this->success($products);
    }

    /**
     * GET /api/v1/products/:id
     */
    public function show($id = null)
    {
        $product = $this->productModel->where('tenant_id', $this->tenantId)->find($id);
        if (!$product) {
            return $this->error('Product not found', 404);
        }

        $product->variants = $this->variantModel
            ->where('product_id', $id)
            ->findAll();

        return $this->success($product);
    }

    /**
     * POST /api/v1/products
     */
    public function create()
    {
        $data = $this->request->getJSON(true) ?? $this->request->getPost();

        if (empty($data['name'])) {
            return $this->error('Product name is required', 422);
        }
        if (empty($data['selling_price'])) {
            return $this->error('Selling price is required', 422);
        }

        $data['tenant_id'] = $this->tenantId;
        $data['slug'] = url_title($data['name'], '-', true);

        // Handle image upload if present
        $image = $this->request->getFile('image');
        if ($image && $image->isValid() && !$image->hasMoved()) {
            $imageName = $image->getRandomName();
            $image->move(WRITEPATH . 'uploads/products', $imageName);
            $data['image'] = '/uploads/products/' . $imageName;
        }

        $productId = $this->productModel->insert($data);
        if (!$productId) {
            return $this->error('Failed to create product', 500);
        }

        // Create default variant
        $variantData = [
            'product_id' => $productId,
            'sku' => $data['sku'] ?? 'SKU-' . $productId,
            'barcode' => $data['barcode'] ?? null,
            'cost_price' => $data['cost_price'] ?? 0,
            'selling_price' => $data['selling_price'],
            'stock_qty' => $data['stock_qty'] ?? 0,
            'min_stock' => $data['min_stock'] ?? 0
        ];
        $this->variantModel->insert($variantData);

        $product = $this->productModel->find($productId);
        $product->variants = $this->variantModel->where('product_id', $productId)->findAll();

        return $this->success($product, 'Product created', 201);
    }

    /**
     * PUT /api/v1/products/:id
     */
    public function update($id = null)
    {
        // 1. Cek Produk
        $product = $this->productModel->where('tenant_id', $this->tenantId)->find($id);
        if (!$product) {
            return $this->error('Product not found', 404);
        }

        $data = $this->request->getJSON(true) ?? $this->request->getPost();
        unset($data['tenant_id']); // Prevent tenant change

        // 2. Update Tabel Utama (Products)
        if (isset($data['name'])) {
            $data['slug'] = url_title($data['name'], '-', true);
        }

        // Handle image upload
        $image = $this->request->getFile('image');
        if ($image && $image->isValid() && !$image->hasMoved()) {
            if ($product->image && file_exists(WRITEPATH . ltrim($product->image, '/'))) {
                @unlink(WRITEPATH . ltrim($product->image, '/'));
            }
            $imageName = $image->getRandomName();
            $image->move(WRITEPATH . 'uploads/products', $imageName);
            $data['image'] = '/uploads/products/' . $imageName;
        }

        // Update data dasar (Nama, Kategori, Deskripsi, dll)
        $this->productModel->update($id, $data);

        // 3. Update Tabel Variant (Harga, Stok, SKU) -- BAGIAN INI YANG HILANG SEBELUMNYA
        // Kita filter data apa saja yang milik variant
        $variantData = [];
        $variantFields = ['selling_price', 'cost_price', 'stock_qty', 'min_stock', 'sku', 'barcode', 'is_active'];
        
        foreach ($variantFields as $field) {
            if (isset($data[$field])) {
                $variantData[$field] = $data[$field];
            }
        }

        if (!empty($variantData)) {
            $this->variantModel->where('product_id', $id)->set($variantData)->update();
        }

        $updatedProduct = $this->productModel->find($id);
        $updatedProduct->variants = $this->variantModel->where('product_id', $id)->findAll();

        return $this->success($updatedProduct, 'Product updated');
    }

    /**
     * DELETE /api/v1/products/:id
     */
    public function delete($id = null)
    {
        $product = $this->productModel->where('tenant_id', $this->tenantId)->find($id);
        if (!$product) {
            return $this->error('Product not found', 404);
        }

        $this->productModel->delete($id);

        return $this->success(null, 'Product deleted');
    }

    /**
     * POST /api/v1/products/:id/image
     */
    public function uploadImage($id = null)
    {
        $product = $this->productModel->where('tenant_id', $this->tenantId)->find($id);
        if (!$product) {
            return $this->error('Product not found', 404);
        }

        $image = $this->request->getFile('image');
        if (!$image || !$image->isValid()) {
            return $this->error('Valid image file is required', 422);
        }

        // Validate image type
        $validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!in_array($image->getMimeType(), $validTypes)) {
            return $this->error('Invalid image type. Allowed: JPG, PNG, GIF, WEBP', 422);
        }

        // Max 5MB
        if ($image->getSizeByUnit('mb') > 5) {
            return $this->error('Image must be less than 5MB', 422);
        }

        // Delete old image if exists
        if ($product->image && file_exists(WRITEPATH . ltrim($product->image, '/'))) {
            @unlink(WRITEPATH . ltrim($product->image, '/'));
        }

        $imageName = $image->getRandomName();
        $image->move(WRITEPATH . 'uploads/products', $imageName);
        $imagePath = '/uploads/products/' . $imageName;

        $this->productModel->update($id, ['image' => $imagePath]);

        return $this->success([
            'image' => $imagePath,
            'image_url' => base_url('writable' . $imagePath)
        ], 'Image uploaded');
    }

    /**
     * GET /api/v1/products/search
     */
    public function search()
    {
        $query = $this->request->getGet('q');
        if (empty($query)) {
            return $this->success([]);
        }

        $products = $this->productModel->search($this->tenantId, $query, 20);

        return $this->success($products);
    }
}
