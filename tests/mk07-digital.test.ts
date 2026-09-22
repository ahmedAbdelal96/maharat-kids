import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyFulfillment, eligiblePaymentTypes } from "../src/modules/digital/domain/service";
import { PrivateDigitalStorage, validatePdf } from "../src/modules/digital/infrastructure/private-storage";
import { PrismaClient } from "@prisma/client";
import { PrismaOrderRepository } from "../src/modules/orders/infrastructure/repository";
import { fulfillPaidDigitalItems } from "../src/modules/digital/domain/service";

const db = new PrismaClient();
const fixture = `mk07-${Date.now()}`;
let fixtureProduct = "";
let fixtureUser = "";
let fixtureOrder = "";
let fixtureAsset = "";
test.after(async () => {
  if (fixtureOrder) await db.digitalEntitlement.deleteMany({ where: { orderId: fixtureOrder } });
  if (fixtureOrder) await db.order.delete({ where: { id: fixtureOrder } }).catch(() => undefined);
  if (fixtureUser) await db.cart.deleteMany({ where: { customerId: fixtureUser } });
  if (fixtureUser) await db.user.delete({ where: { id: fixtureUser } }).catch(() => undefined);
  if (fixtureAsset) { const asset = await db.digitalAsset.findUnique({ where: { id: fixtureAsset } }); if (asset) await new PrivateDigitalStorage().remove(asset.storageKey); await db.digitalAsset.delete({ where: { id: fixtureAsset } }).catch(() => undefined); }
  if (fixtureProduct) await db.product.delete({ where: { id: fixtureProduct } }).catch(() => undefined);
  await db.$disconnect();
});

test("cart composition and payment eligibility are authoritative", () => {
  assert.equal(classifyFulfillment([{ fulfillmentType: "DIGITAL" }]), "DIGITAL_ONLY");
  assert.equal(classifyFulfillment([{ fulfillmentType: "PHYSICAL" }, { fulfillmentType: "DIGITAL" }]), "MIXED");
  assert.deepEqual(eligiblePaymentTypes("DIGITAL_ONLY", [{ type: "CASH_ON_DELIVERY", enabled: true }, { type: "ONLINE_PAYMENT", enabled: true, providerKey: "PAYZATY" }, { type: "BANK_TRANSFER", enabled: true }]), ["ONLINE_PAYMENT", "BANK_TRANSFER"]);
});

test("PDF validation and private storage never use a public path", async () => {
  const bytes = Buffer.from("%PDF-1.4\nMK07 disposable fixture");
  validatePdf(bytes, "application/pdf");
  assert.throws(() => validatePdf(Buffer.from("not-pdf"), "application/pdf"), /SIGNATURE/);
  const storage = new PrivateDigitalStorage();
  const stored = await storage.putPdf(bytes);
  assert.match(stored.storageKey, /^digital-assets\//);
  assert.equal(stored.storageKey.includes("public"), false);
  assert.deepEqual(Buffer.from(await storage.get(stored.storageKey)), bytes);
  await storage.remove(stored.storageKey);
  assert.equal(await storage.exists(stored.storageKey), false);
});

test("path traversal keys are rejected", async () => {
  const storage = new PrivateDigitalStorage();
  await assert.rejects(() => storage.get("digital-assets/../public/book.pdf"), /PRIVATE_STORAGE_KEY_INVALID/);
});

test("production without durable private provider fails closed", async () => {
  const env = process.env as Record<string, string | undefined>;
  const previous = env.NODE_ENV;
  env.NODE_ENV = "production";
  try { await assert.rejects(() => new PrivateDigitalStorage().putPdf(Buffer.from("%PDF-1.4")), /DURABLE_STORAGE_REQUIRED_IN_PRODUCTION|PRIVATE_STORAGE_UNAVAILABLE/); }
  finally { env.NODE_ENV = previous; }
});

test("digital-only orders skip address/shipping, reject COD, and grant idempotent paid access", async (t) => {
  try { await db.$queryRaw`SELECT 1`; } catch { t.skip("Disposable acceptance database is unavailable"); return; }
  const product = await db.product.create({ data: { name: `MK07 Digital ${fixture}`, slug: fixture, sku: fixture, status: "ACTIVE", fulfillmentType: "DIGITAL", price: "49", marketPrices: { create: [{ market: "SAUDI_ARABIA", price: "49" }, { market: "EGYPT", price: "490" }] } } });
  fixtureProduct = product.id;
  const stored = await new PrivateDigitalStorage().putPdf(Buffer.from("%PDF-1.4\nMK07 order fixture"));
  const asset = await db.digitalAsset.create({ data: { productId: product.id, displayNameAr: "كتاب رقمي", displayNameEn: "Digital Book", storageKey: stored.storageKey, mimeType: stored.mimeType, sizeBytes: stored.sizeBytes, checksum: stored.checksum } });
  fixtureAsset = asset.id;
  const user = await db.user.create({ data: { type: "CUSTOMER", status: "ACTIVE", email: `${fixture}@example.test` } });
  fixtureUser = user.id;
  const cart = await db.cart.create({ data: { customerId: user.id, market: "SAUDI_ARABIA", items: { create: { productId: product.id, name: product.name, unitPrice: "49", quantity: 1 } } } });
  const cod = await db.paymentMethod.findUniqueOrThrow({ where: { code: "cash_on_delivery" } });
  await assert.rejects(() => new PrismaOrderRepository(db).placeOrder(user.id, null, cod.id, "SAR", `${fixture}-cod`), /COD_NOT_ELIGIBLE_FOR_DIGITAL/);
  const online = await db.paymentMethod.findUniqueOrThrow({ where: { code: "online_payment" } });
  const placed = await new PrismaOrderRepository(db).placeOrder(user.id, null, online.id, "SAR", `${fixture}-paid`);
  fixtureOrder = placed.id;
  assert.equal(placed.shippingAmount, "0.00");
  assert.equal(placed.shippingAddress && Object.keys(placed.shippingAddress).length, 0);
  assert.equal(placed.items[0].fulfillmentTypeSnapshot, "DIGITAL");
  await db.order.update({ where: { id: placed.id }, data: { paymentStatus: "PAID" } });
  const first = await fulfillPaidDigitalItems(placed.id, db);
  const second = await fulfillPaidDigitalItems(placed.id, db);
  assert.equal(first.granted, 1);
  assert.equal(second.granted, 0);
  assert.equal(await db.digitalEntitlement.count({ where: { orderId: placed.id, digitalAssetId: asset.id } }), 1);
  await db.cart.delete({ where: { id: cart.id } }).catch(() => undefined);
});
