import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { ConfiguredRateShippingProvider } from "../src/modules/shipping/domain/quote";
import { PrismaOrderRepository } from "../src/modules/orders/infrastructure/repository";
import { PrismaShippingRepository } from "../src/modules/shipping/infrastructure/repository";

const db = new PrismaClient();
const suffix = Date.now().toString();
let expressId = "";
let alternateId = "";
let orderId = "";
let fixtureUserId = "";
let fixtureAddressId = "";

before(async () => {
  const express = await db.shippingCompany.create({ data: { code: `mk03-express-${suffix}`, name: "Test Express", nameAr: "شركة الاختبار", nameEn: "Test Express", isActive: true } });
  const alternate = await db.shippingCompany.create({ data: { code: `mk03-alt-${suffix}`, name: "Alternate Delivery", nameAr: "توصيل بديل", nameEn: "Alternate Delivery", isActive: true } });
  expressId = express.id;
  alternateId = alternate.id;
  await db.shippingCarrierMarketConfig.createMany({ data: [
    { shippingCompanyId: express.id, market: "SAUDI_ARABIA", enabled: true, isCheckoutCarrier: true, rate: "25" },
    { shippingCompanyId: express.id, market: "EGYPT", enabled: true, isCheckoutCarrier: true, rate: "80" },
  ] });
});

after(async () => {
  if (orderId) await db.order.delete({ where: { id: orderId } }).catch(() => undefined);
  if (fixtureAddressId) await db.customerAddress.delete({ where: { id: fixtureAddressId } }).catch(() => undefined);
  if (fixtureUserId) await db.user.delete({ where: { id: fixtureUserId } }).catch(() => undefined);
  await db.shippingCarrierMarketConfig.deleteMany({ where: { shippingCompanyId: { in: [expressId, alternateId] } } });
  await db.shippingCompany.deleteMany({ where: { id: { in: [expressId, alternateId] } } });
  await db.$disconnect();
});

test("resolves one configured carrier with independent market currency and rate", async () => {
  const provider = new ConfiguredRateShippingProvider(db);
  const saudi = await provider.quote({ market: "SAUDI_ARABIA" });
  const egypt = await provider.quote({ market: "EGYPT" });
  assert.equal(saudi.carrierCode, `mk03-express-${suffix}`);
  assert.equal(saudi.currency, "SAR");
  assert.equal(saudi.amount.toFixed(2), "25.00");
  assert.equal(egypt.currency, "EGP");
  assert.equal(egypt.amount.toFixed(2), "80.00");
});

test("accepts an explicitly configured zero rate as free shipping", async () => {
  await db.shippingCarrierMarketConfig.updateMany({ where: { shippingCompanyId: expressId, market: "EGYPT" }, data: { rate: "0" } });
  const quote = await new ConfiguredRateShippingProvider(db).quote({ market: "EGYPT" });
  assert.equal(quote.amount.toFixed(2), "0.00");
});

test("fails closed when no active checkout configuration exists", async () => {
  await db.shippingCarrierMarketConfig.updateMany({ where: { shippingCompanyId: expressId, market: "EGYPT" }, data: { enabled: false } });
  await assert.rejects(() => new ConfiguredRateShippingProvider(db).quote({ market: "EGYPT" }), /SHIPPING_UNAVAILABLE/);
});

test("rejects an ambiguous default carrier configuration", async () => {
  await db.shippingCarrierMarketConfig.updateMany({ where: { shippingCompanyId: expressId, market: "EGYPT" }, data: { enabled: true, rate: "80" } });
  const alternate = await db.shippingCarrierMarketConfig.create({ data: { shippingCompanyId: alternateId, market: "EGYPT", enabled: true, isCheckoutCarrier: false, rate: "90" } });
  await assert.rejects(
    () => db.$executeRaw`UPDATE "ShippingCarrierMarketConfig" SET "isCheckoutCarrier" = true WHERE "id" = ${alternate.id}`,
    /23505|already exists/,
  );
});

test("quote ignores client carrier, fee, and currency fields", async () => {
  const provider = new ConfiguredRateShippingProvider(db);
  const quote = await provider.quote({ market: "SAUDI_ARABIA", carrierId: alternateId, shippingPrice: "999999", currency: "EGP" } as never);
  assert.equal(quote.carrierId, expressId);
  assert.equal(quote.amount.toFixed(2), "25.00");
  assert.equal(quote.currency, "SAR");
});

test("admin carrier configuration keeps Saudi and Egypt rates independent", async () => {
  const repository = new PrismaShippingRepository(db);
  await repository.updateCarrierConfiguration({ id: expressId, code: `mk03-express-${suffix}`, name: "Test Express", nameAr: "شركة الاختبار", nameEn: "Test Express", isActive: true, markets: { SAUDI_ARABIA: { enabled: true, isCheckoutCarrier: true, rate: 25 }, EGYPT: { enabled: true, isCheckoutCarrier: true, rate: 80 } } });
  await repository.updateCarrierConfiguration({ id: expressId, code: `mk03-express-${suffix}`, name: "Test Express", nameAr: "شركة الاختبار", nameEn: "Test Express", isActive: true, markets: { SAUDI_ARABIA: { enabled: true, isCheckoutCarrier: true, rate: 30 }, EGYPT: { enabled: true, isCheckoutCarrier: true, rate: 80 } } });
  const configurations = await repository.findCarrierConfigurations();
  const current = configurations.find((entry) => entry.id === expressId);
  assert.equal(current?.markets.find((entry) => entry.market === "SAUDI_ARABIA")?.rate, "30.00");
  assert.equal(current?.markets.find((entry) => entry.market === "EGYPT")?.rate, "80.00");
});

test("order placement re-resolves shipping and preserves an immutable carrier/rate snapshot", async () => {
  await db.shippingCarrierMarketConfig.updateMany({ where: { shippingCompanyId: expressId, market: "SAUDI_ARABIA" }, data: { enabled: true, isCheckoutCarrier: true, rate: "25" } });
  const product = await db.product.findFirst({ where: { status: "ACTIVE", marketPrices: { some: { market: "SAUDI_ARABIA" } } }, include: { marketPrices: { where: { market: "SAUDI_ARABIA" } } } });
  const method = await db.paymentMethod.findFirst({ where: { type: "CASH_ON_DELIVERY", enabled: true } });
  assert.ok(product && method);
  const user = await db.user.create({ data: { type: "CUSTOMER", status: "ACTIVE", email: `mk03-order-${suffix}@example.test` } });
  fixtureUserId = user.id;
  const address = await db.customerAddress.create({ data: { userId: user.id, market: "SAUDI_ARABIA", countryCode: "SA", label: "MK-03 Test", recipientName: "MK-03 Recipient", phone: "0551234567", country: "Saudi Arabia", region: "Riyadh", city: "Riyadh", street: "Test Street", building: "10", isDefault: true } });
  fixtureAddressId = address.id;
  await db.cart.create({ data: { customerId: user.id, market: "SAUDI_ARABIA", items: { create: { productId: product.id, name: product.name, unitPrice: product.marketPrices[0].price, quantity: 1 } } } });
  const placed = await new PrismaOrderRepository(db).placeOrder(user.id, address.id, method.id, "EGP", `mk03-checkout-${suffix}`);
  orderId = placed.id;
  assert.equal(placed.currency, "SAR");
  assert.equal(placed.shippingAmount, "25.00");
  assert.equal(placed.total, (Number(placed.subtotal) + 25).toFixed(2));
  assert.equal(placed.shippingCarrierNameEn, "Test Express");
  await db.shippingCarrierMarketConfig.updateMany({ where: { shippingCompanyId: expressId, market: "SAUDI_ARABIA" }, data: { rate: "30" } });
  await db.shippingCompany.update({ where: { id: expressId }, data: { nameEn: "Renamed Express", name: "Renamed Express" } });
  const historical = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  assert.equal(historical.shippingAmount.toFixed(2), "25.00");
  assert.equal(historical.shippingCarrierNameEn, "Test Express");
  assert.equal(historical.total.toFixed(2), (Number(historical.subtotal) + 25).toFixed(2));
});
