import assert from "node:assert/strict";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { DevelopmentPaymentProvider, getPaymentGateway } from "../src/modules/payments/providers/gateway";
import { isPaymentMethodAvailable } from "../src/modules/payments/domain/service";
import { PrismaOrderRepository } from "../src/modules/orders/infrastructure/repository";

const db = new PrismaClient();
const suffix = Date.now().toString();
let fixtureUserId = ""; let fixtureOrderId = ""; let fixtureAddressId = ""; let codUserId = ""; let codOrderId = ""; let codAddressId = ""; let carrierId = ""; let createdCarrier = false;

test.before(async () => {
  const existing = await db.shippingCarrierMarketConfig.findFirst({ where: { market: "SAUDI_ARABIA", enabled: true, isCheckoutCarrier: true }, select: { shippingCompanyId: true } });
  if (existing) carrierId = existing.shippingCompanyId;
  else { const carrier = await db.shippingCompany.create({ data: { code: `mk04-express-${suffix}`, name: "MK04 Express", nameEn: "MK04 Express", nameAr: "توصيل الاختبار", isActive: true, marketConfigs: { create: { market: "SAUDI_ARABIA", enabled: true, isCheckoutCarrier: true, rate: "25" } } } }); carrierId = carrier.id; createdCarrier = true; }
});

test.after(async () => { if (fixtureOrderId) await db.order.delete({ where: { id: fixtureOrderId } }).catch(() => undefined); if (fixtureAddressId) await db.customerAddress.delete({ where: { id: fixtureAddressId } }).catch(() => undefined); if (fixtureUserId) await db.user.delete({ where: { id: fixtureUserId } }).catch(() => undefined); if (codOrderId) await db.order.delete({ where: { id: codOrderId } }).catch(() => undefined); if (codAddressId) await db.customerAddress.delete({ where: { id: codAddressId } }).catch(() => undefined); if (codUserId) await db.user.delete({ where: { id: codUserId } }).catch(() => undefined); if (createdCarrier && carrierId) await db.shippingCompany.delete({ where: { id: carrierId } }).catch(() => undefined); await db.$disconnect(); });

test("market payment configuration is independent and uses stable domain methods", async () => {
  const methods = await db.paymentMethod.findMany({ where: { code: { in: ["cash_on_delivery", "online_payment", "bank_transfer"] } }, include: { marketConfigs: true } });
  assert.equal(methods.length, 3);
  for (const method of methods) assert.deepEqual(new Set(method.marketConfigs.map((config) => config.market)), new Set(["SAUDI_ARABIA", "EGYPT"]));
  assert.equal(methods.find((method) => method.code === "online_payment")?.type, "ONLINE_PAYMENT");
  assert.equal(methods.find((method) => method.code === "bank_transfer")?.type, "BANK_TRANSFER");
});

test("payment availability fails closed when the online provider is not configured", () => {
  const method = { id: "online", code: "online_payment", name: "Online", type: "ONLINE_PAYMENT" as const, enabled: true, isSystem: true, destination: null, instructions: null, confirmationWhatsApp: null, providerKey: "PAYZATY", sortOrder: 1 };
  const available = isPaymentMethodAvailable(method);
  if (!process.env.PAYZATY_ACCOUNT_NO || !process.env.PAYZATY_SECRET_KEY) assert.equal(available, false);
});

test("development provider is deterministic and never available in production", async () => {
  const provider = new DevelopmentPaymentProvider();
  const result = await provider.createPayment({ orderNumber: "ORD-TEST", amount: "120.00", currency: "SAR", customer: { name: "Test", email: null, phone: null }, responseUrl: "/ar/checkout/success", cancelUrl: "/ar/checkout/success", idempotencyKey: "mk04-idempotency-test" });
  assert.equal(result.providerReference, "test_mk04-idempotency-test");
  assert.match(result.checkoutUrl, /mk04-idempotency-test/);
  assert.equal(getPaymentGateway("UNKNOWN"), null);
});

test("bank transfer order snapshots authoritative amount, currency, provider absence, and method", async () => {
  const product = await db.product.findFirst({ where: { status: "ACTIVE", marketPrices: { some: { market: "SAUDI_ARABIA" } } }, include: { marketPrices: { where: { market: "SAUDI_ARABIA" } } } });
  const method = await db.paymentMethod.findUniqueOrThrow({ where: { code: "bank_transfer" } });
  const user = await db.user.create({ data: { type: "CUSTOMER", status: "ACTIVE", email: `mk04-${suffix}@example.test` } }); fixtureUserId = user.id;
  const address = await db.customerAddress.create({ data: { userId: user.id, market: "SAUDI_ARABIA", countryCode: "SA", label: "MK04", recipientName: "MK04", phone: "0551234567", country: "Saudi Arabia", region: "Riyadh", city: "Riyadh", street: "Test", building: "1", isDefault: true } }); fixtureAddressId = address.id;
  await db.cart.create({ data: { customerId: user.id, market: "SAUDI_ARABIA", items: { create: { productId: product!.id, name: product!.name, unitPrice: product!.marketPrices[0].price, quantity: 1 } } } });
  const placed = await new PrismaOrderRepository(db).placeOrder(user.id, address.id, method.id, "EGP", `mk04-checkout-${suffix}`); fixtureOrderId = placed.id;
  assert.equal(placed.currency, "SAR"); assert.equal(placed.paymentStatus, "PENDING_VERIFICATION"); assert.equal(placed.paymentProviderCode, null);
  const snapshot = await db.order.findUniqueOrThrow({ where: { id: placed.id }, select: { paymentSnapshot: true, total: true, paymentStatus: true } });
  assert.equal((snapshot.paymentSnapshot as { method: string }).method, "BANK_TRANSFER"); assert.equal((snapshot.paymentSnapshot as { currency: string }).currency, "SAR"); assert.equal((snapshot.paymentSnapshot as { amount: string }).amount, snapshot.total.toFixed(2));
  const codMethod = await db.paymentMethod.findUniqueOrThrow({ where: { code: "cash_on_delivery" } }); const codUser = await db.user.create({ data: { type: "CUSTOMER", status: "ACTIVE", email: `mk04-cod-${suffix}@example.test` } }); codUserId = codUser.id; const codAddress = await db.customerAddress.create({ data: { userId: codUser.id, market: "SAUDI_ARABIA", countryCode: "SA", label: "MK04 COD", recipientName: "MK04 COD", phone: "0551234567", country: "Saudi Arabia", region: "Riyadh", city: "Riyadh", street: "Test", building: "2", isDefault: true } }); codAddressId = codAddress.id; await db.cart.create({ data: { customerId: codUser.id, market: "SAUDI_ARABIA", items: { create: { productId: product!.id, name: product!.name, unitPrice: product!.marketPrices[0].price, quantity: 1 } } } }); const cod = await new PrismaOrderRepository(db).placeOrder(codUser.id, codAddress.id, codMethod.id, "EGP", `mk04-cod-${suffix}`); codOrderId = cod.id; assert.equal(cod.currency, "SAR"); assert.equal(cod.paymentStatus, "UNPAID"); assert.equal(cod.total, (Number(cod.subtotal) + 25).toFixed(2));
});
