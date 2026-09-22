import { expect, test } from "@playwright/test";

test.describe("MK-07 digital product acceptance boundary", () => {
  test("unauthenticated direct download is rejected", async ({ request }) => {
    const response = await request.get("/api/digital-assets/nonexistent/download");
    expect(response.status()).toBe(401);
  });

  test("digital library requires customer authentication", async ({ page }) => {
    await page.goto("/en/account/digital-library");
    await expect(page).toHaveURL(/\/en\/login/);
  });

  test("library route remains usable at 390px without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/account/digital-library");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});
