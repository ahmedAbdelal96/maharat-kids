import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { PrismaClient, Prisma } from "@prisma/client";
import { CustomerOtpService } from "../src/modules/auth/domain/customer-otp";
import { normalizeSaudiPhone } from "../src/modules/auth/domain/customer-otp";
import { isSafeReturnTo } from "../src/modules/auth/domain/policies";
import { evaluatePromotions } from "../src/modules/promotions/domain/evaluator";
import { findCouponForPricing } from "../src/modules/coupons/infrastructure/repository";
import { PrismaCartRepository } from "../src/modules/cart/infrastructure/repository";
import { ProductService } from "../src/modules/products/domain/service";
import { PrismaProductRepository } from "../src/modules/products/infrastructure/repository";
import { AuthorizationService } from "../src/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "../src/modules/identity/infrastructure/repository";
import { login, registerCustomer, requestPasswordReset, resetPassword, verifyPasswordResetCode } from "../src/modules/auth/server/actions";

const db = new PrismaClient();
const suffix = Date.now().toString();
let productId = "";
let saCustomerId = "";
let egCustomerId = "";
const cleanupUserIds: string[] = [];
const cleanupCartIds: string[] = [];
const cleanupCouponIds: string[] = [];
const cleanupPromotionIds: string[] = [];
const cleanupOtpDestinations: string[] = [];
const cleanupProductIds: string[] = [];

before(async () => {
  const product = await db.product.findUniqueOrThrow({ where: { slug: "oak-lounge-chair" }, select: { id: true } });
  productId = product.id;
});

after(async () => {
  await db.cart.deleteMany({ where: { id: { in: cleanupCartIds } } });
  await db.coupon.deleteMany({ where: { id: { in: cleanupCouponIds } } });
  await db.promotion.deleteMany({ where: { id: { in: cleanupPromotionIds } } });
  await db.otpChallenge.deleteMany({ where: { destination: { in: cleanupOtpDestinations } } });
  await db.product.deleteMany({ where: { id: { in: cleanupProductIds } } });
  await db.user.deleteMany({ where: { id: { in: cleanupUserIds } } });
  await db.$disconnect();
});

test("Saudi OTP creates a customer with verified phone and no fake credentials", async () => {
  const rawDestination = `05${suffix.slice(-8).padStart(8, "0")}`;
  const destination = normalizeSaudiPhone(rawDestination);
  cleanupOtpDestinations.push(destination);
  const service = new CustomerOtpService(db);
  const requested = await service.request("SAUDI_ARABIA", rawDestination);
  assert.equal(requested.developmentCode?.length, 6);
  const user = await service.verify("SAUDI_ARABIA", rawDestination, requested.developmentCode!);
  saCustomerId = user.id;
  cleanupUserIds.push(user.id);
  const identity = await db.customerIdentity.findUniqueOrThrow({ where: { channel_normalizedValue: { channel: "PHONE", normalizedValue: destination } } });
  assert.equal(user.type, "CUSTOMER");
  assert.equal(user.email, null);
  assert.equal(user.passwordHash, null);
  assert.equal(identity.verifiedAt instanceof Date, true);
  await assert.rejects(() => service.verify("SAUDI_ARABIA", rawDestination, requested.developmentCode!));
});

test("Egypt OTP creates a customer with verified email and no privilege escalation", async () => {
  const destination = `mk01-${suffix}@example.test`;
  const service = new CustomerOtpService(db);
  const requested = await service.request("EGYPT", destination);
  const user = await service.verify("EGYPT", destination, requested.developmentCode!);
  egCustomerId = user.id;
  cleanupUserIds.push(user.id);
  const identity = await db.customerIdentity.findUniqueOrThrow({ where: { channel_normalizedValue: { channel: "EMAIL", normalizedValue: destination } } });
  assert.equal(user.type, "CUSTOMER");
  assert.equal(user.email, destination);
  assert.equal(user.passwordHash, null);
  assert.equal(identity.channel, "EMAIL");
  assert.equal((await db.userRole.count({ where: { userId: user.id } })), 0);
});

test("market rules isolate coupon and promotion money", async () => {
  const coupon = await db.coupon.create({ data: { name: `MK01 ${suffix}`, code: `MK${suffix}`.toUpperCase(), type: "FIXED_AMOUNT", marketRules: { create: [{ market: "SAUDI_ARABIA", fixedDiscountAmount: 20, minimumOrderSubtotal: 100 }, { market: "EGYPT", fixedDiscountAmount: 200, minimumOrderSubtotal: 1000 }] } }, include: { marketRules: true } });
  cleanupCouponIds.push(coupon.id);
  const sa = await findCouponForPricing(db, coupon.id, "SAUDI_ARABIA");
  const eg = await findCouponForPricing(db, coupon.id, "EGYPT");
  assert.equal(sa?.fixedDiscountAmount?.toFixed(2), "20.00");
  assert.equal(eg?.fixedDiscountAmount?.toFixed(2), "200.00");
  assert.equal(sa?.minimumOrderSubtotal.toFixed(2), "100.00");
  assert.equal(eg?.minimumOrderSubtotal.toFixed(2), "1000.00");

  const promotion = await db.promotion.create({ data: { name: `MK01 Promo ${suffix}`, slug: `mk01-${suffix}`, shortDescription: "test", type: "ORDER_FIXED_DISCOUNT", marketRules: { create: [{ market: "SAUDI_ARABIA", fixedDiscountAmount: 20, minimumOrderSubtotal: 100 }, { market: "EGYPT", fixedDiscountAmount: 200, minimumOrderSubtotal: 1000 }] } } });
  cleanupPromotionIds.push(promotion.id);
  const items = [{ productId, unitPrice: "1500", quantity: 1 }];
  const saPromo = await evaluatePromotions({ market: "SAUDI_ARABIA", items, tx: db });
  const egPromo = await evaluatePromotions({ market: "EGYPT", items, tx: db });
  assert.equal(saPromo.discountAmount, "20.00");
  assert.equal(egPromo.discountAmount, "200.00");
});

test("authenticated admin product pricing remains independent at runtime", async () => {
  const admin = await db.user.findUniqueOrThrow({ where: { email: "admin@maharat-kids.local" }, select: { id: true } });
  const repository = new PrismaProductRepository(db);
  const service = new ProductService(repository, new AuthorizationService(new PrismaPermissionRepository(db), new PrismaUserRepository(db)));
  const created = await service.create(admin.id as never, { name: `MK01 Runtime Product ${suffix}`, sku: `MK01-${suffix}`, marketPrices: { saudiPrice: "79", egyptPrice: "850" }, status: "ACTIVE", trackInventory: true, stockQuantity: 20, images: [] });
  assert.equal(created.success, true);
  if (!created.success) return;
  cleanupProductIds.push(created.data.id);
  assert.equal(created.data.marketPrices.saudiPrice, "79.00");
  assert.equal(created.data.marketPrices.egyptPrice, "850.00");
  const saudiEdited = await service.update(admin.id as never, { id: created.data.id, name: created.data.name, sku: created.data.sku, marketPrices: { saudiPrice: "89", egyptPrice: "850" }, status: "ACTIVE", trackInventory: true, stockQuantity: 20, images: [] });
  assert.equal(saudiEdited.success, true);
  if (!saudiEdited.success) return;
  assert.equal(saudiEdited.data.marketPrices.saudiPrice, "89.00");
  assert.equal(saudiEdited.data.marketPrices.egyptPrice, "850.00");
  const egyptEdited = await service.update(admin.id as never, { id: created.data.id, name: created.data.name, sku: created.data.sku, marketPrices: { saudiPrice: "89", egyptPrice: "900" }, status: "ACTIVE", trackInventory: true, stockQuantity: 20, images: [] });
  assert.equal(egyptEdited.success, true);
  if (!egyptEdited.success) return;
  assert.equal(egyptEdited.data.marketPrices.saudiPrice, "89.00");
  assert.equal(egyptEdited.data.marketPrices.egyptPrice, "900.00");
});

test("guest cart collision merges quantities, caps stock, reprices by market, and removes duplicate line", async () => {
  const guest = await db.cart.create({ data: { guestTokenHash: `mk01-guest-${suffix}`, market: "EGYPT", items: { create: { productId, name: "fixture", unitPrice: new Prisma.Decimal("1"), quantity: 3 } } }, include: { items: true } });
  const customer = await db.cart.create({ data: { customerId: egCustomerId, market: "EGYPT", items: { create: { productId, name: "fixture", unitPrice: new Prisma.Decimal("2"), quantity: 2 } } }, include: { items: true } });
  cleanupCartIds.push(customer.id);
  const result = await new PrismaCartRepository(db).mergeGuestCart(egCustomerId, guest.guestTokenHash!, "EGYPT");
  const merged = await db.cart.findUniqueOrThrow({ where: { id: customer.id }, include: { items: true } });
  assert.equal(result.merged, true);
  assert.equal(merged.items.length, 1);
  assert.equal(merged.items[0].quantity, 5);
  assert.equal(merged.items[0].unitPrice.toFixed(2), "900.00");
});

test("OTP expiry and attempt limits fail closed and return URLs stay internal", async () => {
  const service = new CustomerOtpService(db);
  const expiredDestination = `mk01-expired-${suffix}@example.test`;
  const expiredRequest = await service.request("EGYPT", expiredDestination);
  cleanupOtpDestinations.push(expiredDestination);
  await db.otpChallenge.updateMany({ where: { destination: expiredDestination }, data: { expiresAt: new Date(Date.now() - 1_000) } });
  await assert.rejects(() => service.verify("EGYPT", expiredDestination, expiredRequest.developmentCode!));

  const limitedDestination = `mk01-limited-${suffix}@example.test`;
  const limitedRequest = await service.request("EGYPT", limitedDestination);
  cleanupOtpDestinations.push(limitedDestination);
  const wrongCode = limitedRequest.developmentCode === "000000" ? "000001" : "000000";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await assert.rejects(() => service.verify("EGYPT", limitedDestination, wrongCode));
  }
  await assert.rejects(() => service.verify("EGYPT", limitedDestination, limitedRequest.developmentCode!));

  assert.equal(isSafeReturnTo("/ar/checkout"), true);
  assert.equal(isSafeReturnTo("https://evil.example/steal"), false);
  assert.equal(isSafeReturnTo("//evil.example/steal"), false);
});

test("legacy customer password and recovery actions fail closed", async () => {
  const customerEmail = `mk01-${suffix}@example.test`;
  assert.equal((await login({ email: customerEmail, password: "legacy-password" })).success, false);
  assert.equal((await registerCustomer({ email: customerEmail, password: "legacy-password" })).success, false);
  assert.equal((await requestPasswordReset({ email: customerEmail })).success, false);
  assert.equal((await verifyPasswordResetCode({ email: customerEmail, code: "000000" })).success, false);
  assert.equal((await resetPassword({ email: customerEmail, code: "000000", password: "legacy-password" })).success, false);
});
