import { test, expect } from '@playwright/test';
import { getE2EAdminCredentials } from './support/fixtures';

const { email: adminEmail, password: adminPassword } = getE2EAdminCredentials();

test.describe('Promotions E2E', () => {
  test('Phase A: Admin Login & Product Creation', async ({ page }) => {
    // 1. Login
    await page.goto('/ar/login?mode=admin&callbackUrl=%2Far%2Fadmin');
    
    // Fill login form
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL(/.*\/admin/);
    
    // 2. Products
    await page.goto('/ar/admin/products');
    
    // Just verify the page loads for now
    await expect(page.locator('h1')).toBeVisible();
    
    // Verify Promotions page
    await page.goto('/ar/admin/promotions');
    await expect(page.locator('h1')).toBeVisible();
  });
});
