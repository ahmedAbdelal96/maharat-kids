import { expect, test, type Page } from "@playwright/test";

async function assertLoadedImages(page: Page, selector = '[data-testid="category-card"] img, [data-testid="product-card"] img') {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 75));
    }
    window.scrollTo(0, 0);
  });
  const result = await page.locator(selector).evaluateAll((images) => images.map((image) => { const img = image as HTMLImageElement; return { alt: img.alt, loaded: img.complete && img.naturalWidth > 0 }; }));
  expect(result.filter((image) => !image.loaded), JSON.stringify(result)).toHaveLength(0);
}

test("Arabic homepage categories and featured products have loaded imagery", async ({ page }) => {
  await page.goto("/ar");
  await expect(page.getByTestId("category-card")).not.toHaveCount(0);
  await expect(page.getByTestId("category-card").locator("img")).toHaveCount(await page.getByTestId("category-card").count());
  await assertLoadedImages(page);
  await expect(page.getByTestId("product-card").locator("img")).not.toHaveCount(0);
});

test("all Arabic demo listing pages have loaded images", async ({ page }) => {
  const demoSlugs = new Set<string>();
  for (let pageNo = 1; pageNo <= 5; pageNo += 1) {
    await page.goto(`/ar/products?page=${pageNo}`);
    await assertLoadedImages(page, '[data-testid="product-card"] img');
    const links = await page.locator('a[href*="/products/demo-"]').evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href")).filter(Boolean));
    links.forEach((href) => demoSlugs.add(href!));
  }
  expect(demoSlugs.size).toBe(44);
});

test("English and Egypt storefronts keep media while locale and market change", async ({ page }) => {
  await page.goto("/en");
  await assertLoadedImages(page);
  await page.goto("/en/products");
  await assertLoadedImages(page);
  await page.setExtraHTTPHeaders({ "x-vercel-ip-country": "EG" });
  await page.goto("/ar/products");
  await assertLoadedImages(page);
});

test("homepage and listing remain image-complete at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/ar", "/ar/products", "/en", "/en/products"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await assertLoadedImages(page);
  }
});
