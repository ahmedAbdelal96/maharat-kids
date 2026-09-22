import { expect, test } from "@playwright/test";

test.describe("MK-08 blog and SEO boundary", () => {
  test("public blog is reachable in English and Arabic", async ({ page }) => {
    await page.goto("/en/blog");
    await expect(page).toHaveTitle(/Blog|Maharat Kids/i);
    await page.goto("/ar/blog");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("blog is usable at 390px without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/blog");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  });

  test("admin blog remains protected for unauthenticated visitors", async ({ page }) => {
    await page.goto("/en/admin/blog");
    await expect(page).toHaveURL(/\/en\/login/);
  });

  test("unknown articles are not public", async ({ request }) => {
    expect((await request.get("/en/blog/mk08-does-not-exist")).status()).toBe(404);
  });
});
