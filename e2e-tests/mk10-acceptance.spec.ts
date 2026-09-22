import { expect, test } from "@playwright/test";

test.describe("MK-10 production media and storage boundary", () => {
  test("seeded public media remains publicly viewable", async ({ request }) => {
    const response = await request.get("/uploads/products/seed-oak-lounge-chair-primary.svg");
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toMatch(/image\/svg\+xml|application\/octet-stream/);
  });

  test("anonymous protected PDF download is rejected", async ({ request }) => {
    expect((await request.get("/api/digital-assets/mk10-missing/download")).status()).toBe(401);
  });

  test("the customer library exposes only the protected application route", async ({ page }) => {
    await page.goto("/en/account/digital-library");
    await expect(page).toHaveURL(/\/en\/login/);
    const html = await page.content();
    expect(html).not.toMatch(/digital-assets\/|signedUrl|storageKey|amazonaws\.com|r2\.cloudflarestorage/);
  });

  test("bank-transfer proof endpoint does not disclose unknown private objects", async ({ request }) => {
    const response = await request.get("/api/payments/bank-transfer-proof/mk10-missing");
    expect([403, 404]).toContain(response.status());
  });

  test("private storage is not reachable through public uploads", async ({ request }) => {
    expect((await request.get("/uploads/digital-assets/mk10-missing.pdf")).status()).toBe(404);
    expect((await request.get("/uploads/payment-proofs/mk10-missing.pdf")).status()).toBe(404);
  });
});
