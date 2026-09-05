import { test, expect } from '@playwright/test';

test.describe('Promotions E2E', () => {
  test('Phase A: Admin Login & Product Creation', async ({ page }) => {
    // 1. Login
    await page.goto('/admin/login');
    
    // Fill login form
    await page.fill('input[type="email"]', 'admin@gmail.com');
    await page.fill('input[type="password"]', 'Admin@123456');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL(/.*\/admin/);
    
    // 2. Products
    await page.goto('/admin/products');
    
    // Just verify the page loads for now
    await expect(page.locator('h1')).toBeVisible();
    
    // Verify Promotions page
    await page.goto('/admin/promotions');
    await expect(page.locator('h1')).toBeVisible();
  });
});
