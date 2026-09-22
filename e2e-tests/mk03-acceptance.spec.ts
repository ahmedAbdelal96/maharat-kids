import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createE2EShippingFixture, getE2EAdminCredentials } from "./support/fixtures";

const { email: adminEmail, password: adminPassword } = getE2EAdminCredentials();

async function adminLogin(page: Page) {
  await page.setExtraHTTPHeaders({ "x-vercel-ip-country": "SA" });
  await page.goto("/ar/login?mode=admin&callbackUrl=%2Far%2Fadmin");
  await page.locator('input[type="email"]').fill(adminEmail);
  await page.locator('input[type="password"]').fill(adminPassword);
  await expect(page.locator('button[type="submit"]')).toBeEnabled();
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/ar\/admin/);
}

test("admin shipping configuration shows one automatic carrier with independent market fees", async ({ page }) => {
  const db = new PrismaClient();
  const fixture = await createE2EShippingFixture(db);
  try {
  await page.setViewportSize({ width: 390, height: 844 });
  await adminLogin(page);
  await page.goto("/ar/admin/shipping");
  await expect(page.getByText("Test Express", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Saudi Arabia", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("Egypt", { exact: true }).last()).toBeVisible();
  await expect(page.locator('input[type="number"]').nth(0)).toHaveValue("25.00");
  await expect(page.locator('input[type="number"]').nth(1)).toHaveValue("80.00");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally {
    await fixture.cleanup();
    await db.$disconnect();
  }
});

test("authenticated Saudi checkout shows the configured carrier and fee without a carrier selector", async ({ page }) => {
  const db = new PrismaClient();
  const fixture = await createE2EShippingFixture(db);
  const phone = `+9665${Date.now().toString().slice(-8)}`;
  const localPhone = `0${phone.slice(4)}`;
  const code = "123456";
  let userId = "";
  try {
    await page.setExtraHTTPHeaders({ "x-vercel-ip-country": "SA" });
    await page.goto("/ar/login?callbackUrl=%2Fcheckout");
    await page.locator('input[type="tel"]').fill(localPhone);
    await expect(page.getByRole("button", { name: /إرسال الرمز|Send code/ })).toBeEnabled();
    await page.getByRole("button", { name: /إرسال الرمز|Send code/ }).click();
    await page.locator('input[autocomplete="one-time-code"]').fill(code);
    await expect(page.getByRole("button", { name: /متابعة|Continue/ })).toBeEnabled();
    await page.getByRole("button", { name: /متابعة|Continue/ }).click();
    await expect(page).toHaveURL(/\/ar\/checkout/);
    const user = await db.user.findFirstOrThrow({ where: { phone } });
    userId = user.id;
    const product = await db.product.findFirstOrThrow({ where: { status: "ACTIVE", marketPrices: { some: { market: "SAUDI_ARABIA" } } }, include: { marketPrices: { where: { market: "SAUDI_ARABIA" } } } });
    await db.customerAddress.create({ data: { userId, market: "SAUDI_ARABIA", countryCode: "SA", label: "Runtime home", recipientName: "Runtime Recipient", phone, country: "Saudi Arabia", region: "Riyadh", city: "Riyadh", street: "Runtime Street", building: "1", isDefault: true } });
    const cart = await db.cart.update({ where: { customerId: userId }, data: { market: "SAUDI_ARABIA" } });
    await db.cartItem.create({ data: { cartId: cart.id, productId: product.id, name: product.name, unitPrice: product.marketPrices[0].price, quantity: 1 } });
    await page.goto("/ar/checkout");
    await expect(page.getByText("شركة الاختبار", { exact: true })).toBeVisible();
    await expect(page.getByText(/25|٢٥/)).toBeVisible();
    await expect(page.getByText(/اختيار شركة|Choose carrier|carrier selector/i)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally {
    if (!userId) userId = (await db.user.findFirst({ where: { phone } }))?.id ?? "";
    if (userId) await db.user.delete({ where: { id: userId } }).catch(() => undefined);
    await db.otpChallenge.deleteMany({ where: { destination: phone } });
    await fixture.cleanup();
    await db.$disconnect();
  }
});

test("authenticated Egypt checkout uses the independent EGP carrier fee", async ({ page }) => {
  const db = new PrismaClient();
  const fixture = await createE2EShippingFixture(db);
  const email = `mk03-eg-${Date.now()}@example.test`;
  const code = "123456";
  let userId = "";
  try {
    await page.setExtraHTTPHeaders({ "x-vercel-ip-country": "EG" });
    await page.goto("/en/login?callbackUrl=%2Fcheckout");
    await page.locator('input[type="email"]').fill(email);
    await expect(page.getByRole("button", { name: /Send code/ })).toBeEnabled();
    await page.getByRole("button", { name: /Send code/ }).click();
    await page.locator('input[autocomplete="one-time-code"]').fill(code);
    await expect(page.getByRole("button", { name: /Continue/ })).toBeEnabled();
    await page.getByRole("button", { name: /Continue/ }).click();
    await expect(page).toHaveURL(/\/en\/checkout/);
    const user = await db.user.findFirstOrThrow({ where: { email } });
    userId = user.id;
    const product = await db.product.findFirstOrThrow({ where: { status: "ACTIVE", marketPrices: { some: { market: "EGYPT" } } }, include: { marketPrices: { where: { market: "EGYPT" } } } });
    await db.customerAddress.create({ data: { userId, market: "EGYPT", countryCode: "EG", label: "Runtime home", recipientName: "Runtime Recipient", phone: "01012345678", country: "Egypt", governorate: "Cairo", city: "Cairo", street: "Runtime Street", building: "1", isDefault: true } });
    const cart = await db.cart.update({ where: { customerId: userId }, data: { market: "EGYPT" } });
    await db.cartItem.create({ data: { cartId: cart.id, productId: product.id, name: product.name, unitPrice: product.marketPrices[0].price, quantity: 1 } });
    await page.goto("/en/checkout");
    await expect(page.getByText("Test Express", { exact: true })).toBeVisible();
    await expect(page.getByText(/80\.00/).last()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally {
    if (!userId) userId = (await db.user.findFirst({ where: { email } }))?.id ?? "";
    if (userId) await db.user.delete({ where: { id: userId } }).catch(() => undefined);
    await db.otpChallenge.deleteMany({ where: { destination: email } });
    await fixture.cleanup();
    await db.$disconnect();
  }
});
