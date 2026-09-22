import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { getE2EAdminCredentials } from "./support/fixtures";

const { email: adminEmail, password: adminPassword } = getE2EAdminCredentials();

async function adminLogin(page: Page) {
  await page.setExtraHTTPHeaders({ "x-vercel-ip-country": "SA" });
  await page.goto("/en/login?mode=admin&callbackUrl=%2Fen%2Fadmin");
  await page.locator('input[type="email"]').fill(adminEmail);
  await page.locator('input[type="password"]').fill(adminPassword);
  await expect(page.locator('button[type="submit"]')).toBeEnabled();
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/en\/admin/);
}

test.describe("MK-06 product variants acceptance", () => {
  test("persists a variant matrix, adds only missing Green combinations, and serves both markets", async ({ page }) => {
    test.setTimeout(240_000);
    const db = new PrismaClient();
    const sku = `MK06-E2E-${Date.now()}`;
    let productId = "";
    try {
      const fixture = await db.product.create({ data: {
        name: "MK06 acceptance board", slug: `mk06-acceptance-${Date.now()}`, sku, price: "79", status: "ACTIVE",
        marketPrices: { create: [{ market: "SAUDI_ARABIA", price: "79" }, { market: "EGYPT", price: "850" }] },
        options: { create: [
          { nameAr: "المقاس", nameEn: "Size", sortOrder: 0, values: { create: [{ labelAr: "صغير", labelEn: "Small", sortOrder: 0 }, { labelAr: "كبير", labelEn: "Large", sortOrder: 1 }] } },
          { nameAr: "اللون", nameEn: "Color", sortOrder: 1, values: { create: [{ labelAr: "أزرق", labelEn: "Blue", sortOrder: 0 }, { labelAr: "وردي", labelEn: "Pink", sortOrder: 1 }] } },
        ] },
      } });
      productId = fixture.id;
      const fixtureOptions = await db.productOption.findMany({ where: { productId }, include: { values: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } });
      const combinations = [[fixtureOptions[0].values[0], fixtureOptions[1].values[0]], [fixtureOptions[0].values[0], fixtureOptions[1].values[1]], [fixtureOptions[0].values[1], fixtureOptions[1].values[0]], [fixtureOptions[0].values[1], fixtureOptions[1].values[1]]];
      await Promise.all(combinations.map((values, index) => db.productVariant.create({ data: { productId, sku: `${sku}-V0${index + 1}`, combinationKey: values.map((value) => `${value.optionId}:${value.id}`).sort().join("|"), stockQuantity: [5, 0, 10, 3][index], optionValues: { create: values.map((value) => ({ optionValueId: value.id })) }, marketPrices: { create: [{ market: "SAUDI_ARABIA", price: index === 2 ? "99" : "79", ...(index === 2 ? { compareAtPrice: "110" } : {}) }, { market: "EGYPT", price: index === 2 ? "1050" : "850" }] } } })));
      await adminLogin(page);
      await page.goto("/en/admin/products");
      await page.getByPlaceholder("Search products or SKU...").fill(sku);
      await page.getByPlaceholder("Search products or SKU...").press("Enter");
      await page.waitForTimeout(1500);
      await expect(page.getByText(sku, { exact: true })).toBeVisible();
      await page.getByRole("button", { name: /^Edit / }).first().click();
      await expect(page.getByRole("heading", { name: "Variants and options" })).toBeVisible();
      const created = await db.product.findUnique({ where: { sku }, include: { options: { include: { values: true } }, variants: { include: { marketPrices: true, optionValues: true } } } });
      expect(created).not.toBeNull();
      expect(created!.variants).toHaveLength(4);
      const originalIds = new Set(created!.variants.map((variant) => variant.id));
      expect(created!.variants.find((variant) => variant.sku.endsWith("-V03"))?.stockQuantity).toBe(10);
      await page.getByRole("button", { name: "Add value" }).nth(1).click();
      await page.getByLabel("Option 2 value 3 Arabic").fill("أخضر");
      await page.getByLabel("Option 2 value 3 English").fill("Green");
      await page.getByRole("button", { name: "Generate combinations" }).click();
      await expect(page.locator("table").last().locator("tbody tr")).toHaveCount(6);
      await page.getByRole("button", { name: "Save Product" }).click();
      await expect(page.locator('[role="dialog"]')).toHaveCount(0, { timeout: 90_000 });
      await expect.poll(async () => (await db.productVariant.count({ where: { productId } })), { timeout: 90_000 }).toBe(6);
      const updated = await db.product.findUnique({ where: { id: productId }, include: { variants: { include: { marketPrices: true, optionValues: true } } } });
      expect(updated!.variants).toHaveLength(6);
      expect(new Set(updated!.variants.filter((variant) => originalIds.has(variant.id)).map((variant) => variant.id))).toEqual(originalIds);
      expect(updated!.variants.filter((variant) => variant.sku.includes("-V05") || variant.sku.includes("-V06"))).toHaveLength(2);

      const slug = updated!.slug;
      await page.setExtraHTTPHeaders({ "x-vercel-ip-country": "SA" });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/en/products/${slug}`);
      await expect(page.getByText("Small", { exact: true })).toBeVisible();
      await expect(page.getByText("Blue", { exact: true })).toBeVisible();
      await expect(page.getByText("79.00").first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.context().clearCookies();
      await page.setExtraHTTPHeaders({ "x-vercel-ip-country": "EG" });
      await page.goto(`/ar/products/${slug}`);
      await expect(page.getByText(/٨٥٠٫٠٠|850\.00/).first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    } finally {
      if (!productId) productId = (await db.product.findUnique({ where: { sku }, select: { id: true } }))?.id ?? "";
      if (productId) await db.product.delete({ where: { id: productId } }).catch(() => undefined);
      await db.$disconnect();
    }
  });
});
