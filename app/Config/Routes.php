<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */
$routes->get('/', 'Home::index');

// API v1 Routes
$routes->group('api/v1', ['namespace' => 'App\Controllers\Api'], static function ($routes) {

    // Public routes (no auth required)
    // Public routes (no auth required)
    $routes->options('(:any)', 'BaseApiController::options'); // Handle preflight
    $routes->post('auth/login', 'AuthController::login');
    $routes->post('auth/refresh', 'AuthController::refresh');
    $routes->post('auth/forgot-password', 'AuthController::forgotPassword');
    $routes->post('auth/reset-password', 'AuthController::resetPassword');

    // Protected routes
    $routes->group('', ['filter' => 'jwt'], static function ($routes) {

        // Auth
        $routes->post('auth/logout', 'AuthController::logout');
        $routes->get('auth/me', 'AuthController::me');
        $routes->post('auth/change-password', 'AuthController::changePassword');

        // Products
        $routes->get('products', 'ProductController::index');
        $routes->get('products/(:num)', 'ProductController::show/$1');
        $routes->post('products', 'ProductController::create');
        $routes->put('products/(:num)', 'ProductController::update/$1');
        $routes->delete('products/(:num)', 'ProductController::delete/$1');
        $routes->post('products/(:num)/image', 'ProductController::uploadImage/$1');
        $routes->get('products/search', 'ProductController::search');

        // Categories
        $routes->get('categories', 'CategoryController::index');
        $routes->post('categories', 'CategoryController::create');

        // Sales / POS
        $routes->get('sales', 'SaleController::index');
        $routes->get('sales/(:num)', 'SaleController::show/$1');
        $routes->post('sales', 'SaleController::create');
        $routes->post('sales/(:num)/void', 'SaleController::void/$1');
        $routes->get('sales/(:num)/receipt', 'SaleController::receipt/$1');
        $routes->post('sales/(:num)/refund', 'SaleController::refund/$1');

        // Customers
        $routes->get('customers', 'CustomerController::index');
        $routes->get('customers/(:num)', 'CustomerController::show/$1');
        $routes->post('customers', 'CustomerController::create');
        $routes->put('customers/(:num)', 'CustomerController::update/$1');
        $routes->delete('customers/(:num)', 'CustomerController::delete/$1');

        // Inventory
        $routes->get('inventory', 'InventoryController::index');
        $routes->post('inventory/adjust', 'InventoryController::adjust');
        $routes->post('inventory/transfer', 'InventoryController::transfer');

        // Vouchers
        $routes->post('vouchers/validate', 'VoucherController::validateCode');
        $routes->get('vouchers', 'VoucherController::index');
        $routes->post('vouchers', 'VoucherController::create');
        $routes->put('vouchers/(:num)', 'VoucherController::update/$1');
        $routes->delete('vouchers/(:num)', 'VoucherController::delete/$1');

        // Reports
        $routes->get('reports/daily-sales', 'ReportController::dailySales');
        $routes->get('reports/inventory', 'ReportController::inventory');
        $routes->get('reports/sales-history', 'ReportController::salesHistory');
        $routes->get('reports/best-sellers', 'ReportController::bestSellers');

        // Admin routes (Owner, Manager only)
        $routes->group('', ['filter' => 'rbac:owner,manager'], static function ($routes) {
            $routes->resource('users', ['controller' => 'UserController']);
            $routes->resource('branches', ['controller' => 'BranchController']);
            $routes->get('reports/customer-rfm', 'ReportController::customerRfm');
        });
    });
});
