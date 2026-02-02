import { test, expect } from '@playwright/test';

test.describe('POS Cashier Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Mock login or perform login
        // For now we assume we can log in with demo credentials
        await page.goto('/login');
        await page.fill('input[type="text"]', 'kasir1');
        await page.fill('input[type="password"]', 'kasir123');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('/pos');
    });

    test('should complete a cash transaction', async ({ page }) => {
        // Add product to cart
        // Wait for products to load
        await expect(page.locator('text=Americano')).toBeVisible({ timeout: 10000 });
        await page.click('text=Americano'); // Click first product card

        // Verify cart update
        await expect(page.locator('text=Current Order')).toBeVisible();
        await expect(page.locator('text=Americano')).toBeVisible();

        // Checkout
        await page.click('button:has-text("Charge")');

        // Payment Modal
        await expect(page.locator('text=Payment')).toBeVisible();
        await expect(page.locator('text=Total Amount Due')).toBeVisible();

        // Enter cash amount perfectly or use quick button
        // Assuming total is around 20k
        const totalText = await page.locator('.text-4xl').textContent();
        // Use "Cash Received" input
        await page.fill('input[placeholder="Enter amount"]', '100000');

        // Confirm Payment
        await page.click('button:has-text("Confirm Payment")');

        // Success Screen
        await expect(page.locator('text=Payment Successful')).toBeVisible();
        await expect(page.locator('text=Print Receipt')).toBeVisible();

        // New Order
        await page.click('button:has-text("New Order")');
        await expect(page.locator('text=Payment Successful')).not.toBeVisible();
    });
});
