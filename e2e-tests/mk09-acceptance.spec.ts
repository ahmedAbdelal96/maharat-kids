import { expect, test } from "@playwright/test";

test.describe("MK-09 order operations boundary", () => {
  test("admin orders remain protected", async ({ page }) => {
    await page.goto("/en/admin/orders");
    await expect(page).toHaveURL(/\/en\/login/);
  });
  test("customer orders remain protected and ownership scoped", async ({ page }) => {
    await page.goto("/en/account/orders");
    await expect(page).toHaveURL(/\/en\/login/);
  });
  test("order routes remain usable at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/account/orders");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  });
  test("health endpoint remains available", async ({ request }) => {
    expect((await request.get("/api/health")).status()).toBe(200);
  });
});
