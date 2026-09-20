import { test, expect, type Page } from "@playwright/test";

const adminEmail = process.env.MK01_ADMIN_EMAIL ?? "admin@maharat-kids.local";
const adminPassword = process.env.MK01_ADMIN_PASSWORD ?? "MaharatKidsLocalAdmin_2026";

async function marketPage(page: Page, country: "SA" | "EG", path: string) {
  await page.setExtraHTTPHeaders({ "x-vercel-ip-country": country });
  return page.goto(path);
}

async function adminLogin(page: Page, callbackUrl = "%2Far%2Fadmin") {
  await page.goto(`/ar/login?mode=admin&callbackUrl=${callbackUrl}`);
  await page.locator('input[type="email"]').fill(adminEmail);
  await page.locator('input[type="password"]').fill(adminPassword);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/ar\/admin/);
}

test("trusted market switching isolates storefront currency and product price", async ({ page }) => {
  await marketPage(page, "SA", "/ar/products/oak-lounge-chair");
  await expect(page.locator("body")).toContainText("١٤٩");
  await expect(page.locator("body")).toContainText("ريال سعودي");
  await marketPage(page, "EG", "/ar/products/oak-lounge-chair");
  await expect(page.locator("body")).toContainText("٩٠٠");
  await expect(page.locator("body")).toContainText("جنيه");
  await marketPage(page, "SA", "/en/products/oak-lounge-chair");
  await expect(page.locator("body")).toContainText("149");
  await expect(page.locator("body")).toContainText("SAR");
  await marketPage(page, "EG", "/en/products/oak-lounge-chair");
  await expect(page.locator("body")).toContainText("900");
  await expect(page.locator("body")).toContainText("EGP");
});

test("admin password authentication remains available at explicit admin mode", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-vercel-ip-country": "SA" });
  await adminLogin(page);
  await expect(page.locator("body")).not.toContainText("Unauthorized");
});

test("admin authentication rejects an external return URL", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-vercel-ip-country": "SA" });
  await adminLogin(page, "https%3A%2F%2Fevil.example%2Fsteal");
  await expect(page).toHaveURL(/\/ar\/admin$/);
});

test("admin logout revokes the session and protected route redirects", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-vercel-ip-country": "SA" });
  await adminLogin(page);
  await page.locator("header button").filter({ hasText: adminEmail }).click();
  await page.getByText(/Sign out|تسجيل الخروج/, { exact: true }).click();
  await expect(page).toHaveURL(/\/ar\/login/);
  await page.goto("/ar/admin");
  await expect(page).toHaveURL(/\/ar\/login/);
});

test("touched admin market-money forms expose independent market fields", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setExtraHTTPHeaders({ "x-vercel-ip-country": "SA" });
  await adminLogin(page);
  await page.goto("/ar/admin/products");
  await page.getByRole("button", { name: /New Product/i }).click();
  await expect(page.locator("body")).toContainText("Saudi Arabia");
  await expect(page.locator("body")).toContainText("Egypt");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/ar/admin/promotions/new");
  await expect(page.locator("body")).toContainText("Saudi Arabia");
  await expect(page.locator("body")).toContainText("Egypt");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/ar/admin/coupons");
  await page.getByRole("button", { name: /New coupon/i }).click();
  await expect(page.locator("body")).toContainText("Saudi Arabia");
  await expect(page.locator("body")).toContainText("Egypt");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("legacy customer auth routes are unavailable", async ({ request }) => {
  for (const path of ["/ar/auth/google/start", "/ar/auth/google/callback", "/ar/forgot-password", "/ar/reset-password", "/ar/reset-password/verify"]) {
    expect((await request.get(path)).status()).toBe(404);
  }
});

test("OTP and admin forms remain usable at 390px without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setExtraHTTPHeaders({ "x-vercel-ip-country": "SA" });
  await page.goto("/ar/login");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/ar/login?mode=admin");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
