import assert from "node:assert/strict";
import { test } from "node:test";
import { PrismaClient, Prisma } from "@prisma/client";
import { combinationKey, effectiveVariantPrice, generateCombinations, variantIsPurchasable } from "../src/modules/products/domain/variants";
import { PrismaCartRepository } from "../src/modules/cart/infrastructure/repository";
import { PrismaOrderRepository } from "../src/modules/orders/infrastructure/repository";

const db = new PrismaClient();
const suffix = Date.now().toString();
let productId = "";
let variantId = "";
let variantId2 = "";
let orderId = "";
let userId = "";
let shippingId = "";
const guestTokenHash = `mk06-cart-${suffix}`;

test.after(async () => { if (orderId) await db.order.delete({ where: { id: orderId } }).catch(() => undefined); if (userId) await db.user.delete({ where: { id: userId } }).catch(() => undefined); if (shippingId) await db.shippingCompany.delete({ where: { id: shippingId } }).catch(() => undefined); await db.cart.deleteMany({ where: { guestTokenHash } }); if (productId) await db.product.delete({ where: { id: productId } }).catch(() => undefined); await db.$disconnect(); });

test("arbitrary option dimensions generate bounded, unique combinations", () => {
  const options = [{ id: "size", values: [{ id: "small" }, { id: "large" }] }, { id: "color", values: [{ id: "blue" }, { id: "pink" }] }];
  const rows = generateCombinations(options);
  assert.equal(rows.length, 4);
  assert.equal(new Set(rows.map(combinationKey)).size, 4);
  assert.equal(combinationKey([{ optionId: "color", optionValueId: "blue" }, { optionId: "size", optionValueId: "small" }]), "color:blue|size:small");
});

test("variant generation rejects unsafe matrices and keeps simple products compatible", () => {
  assert.deepEqual(generateCombinations([{ id: "size", values: [] }]), []);
  assert.throws(() => generateCombinations([{ id: "size", values: Array.from({ length: 25 }, (_, index) => ({ id: `s${index}` })) }, { id: "color", values: Array.from({ length: 21 }, (_, index) => ({ id: `c${index}` })) }]), /VARIANT_COMBINATION_LIMIT/);
  assert.equal(variantIsPurchasable({ active: true, trackInventory: false, stockQuantity: 0 }), true);
  assert.equal(effectiveVariantPrice({ productPrice: new Prisma.Decimal("79"), productCompareAtPrice: new Prisma.Decimal("99") }, "SAUDI_ARABIA").compareAtPrice?.toFixed(2), "99.00");
});

test("variant rows preserve option/value labels, independent market prices, and inheritance", async () => {
  const product = await db.product.create({ data: { name: `MK06 ${suffix}`, slug: `mk06-${suffix}`, sku: `MK06-${suffix}`, price: "79", status: "ACTIVE", marketPrices: { create: [{ market: "SAUDI_ARABIA", price: "79" }, { market: "EGYPT", price: "850" }] } } }); productId = product.id;
  const size = await db.productOption.create({ data: { productId, nameAr: "الحجم", nameEn: "Size", values: { create: [{ labelAr: "صغير", labelEn: "Small", sortOrder: 0 }, { labelAr: "كبير", labelEn: "Large", sortOrder: 1 }] } } });
  const color = await db.productOption.create({ data: { productId, nameAr: "اللون", nameEn: "Color", values: { create: [{ labelAr: "أزرق", labelEn: "Blue", sortOrder: 0 }, { labelAr: "وردي", labelEn: "Pink", sortOrder: 1 }] } } });
  const values = await db.productOptionValue.findMany({ where: { optionId: { in: [size.id, color.id] } }, orderBy: { sortOrder: "asc" } });
  const small = values.find((value) => value.labelEn === "Small")!; const large = values.find((value) => value.labelEn === "Large")!; const blue = values.find((value) => value.labelEn === "Blue")!; const pink = values.find((value) => value.labelEn === "Pink")!;
  const variant = await db.productVariant.create({ data: { productId, sku: `MK06-SB-${suffix}`, combinationKey: combinationKey([{ optionId: size.id, optionValueId: small.id }, { optionId: color.id, optionValueId: blue.id }]), stockQuantity: 5, optionValues: { create: [{ optionValueId: small.id }, { optionValueId: blue.id }] }, marketPrices: { create: [{ market: "SAUDI_ARABIA", price: "79" }] } } }); variantId = variant.id;
  const second = await db.productVariant.create({ data: { productId, sku: `MK06-LB-${suffix}`, combinationKey: combinationKey([{ optionId: size.id, optionValueId: large.id }, { optionId: color.id, optionValueId: blue.id }]), stockQuantity: 2, optionValues: { create: [{ optionValueId: large.id }, { optionValueId: blue.id }] }, marketPrices: { create: [{ market: "SAUDI_ARABIA", price: "99" }] } } }); variantId2 = second.id;
  assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: variant.id }, include: { optionValues: { include: { optionValue: true } }, marketPrices: true } })).optionValues.length, 2);
  const baseSa = await db.productMarketPrice.findUniqueOrThrow({ where: { productId_market: { productId, market: "SAUDI_ARABIA" } } });
  const baseEg = await db.productMarketPrice.findUniqueOrThrow({ where: { productId_market: { productId, market: "EGYPT" } } });
  assert.equal(effectiveVariantPrice({ productPrice: baseSa.price, variantPrice: null }, "SAUDI_ARABIA").price.toFixed(2), "79.00");
  assert.equal(effectiveVariantPrice({ productPrice: baseEg.price, variantPrice: new Prisma.Decimal("1050") }, "EGYPT").price.toFixed(2), "1050.00");
  assert.equal(variantIsPurchasable({ active: true, trackInventory: true, stockQuantity: 5 }), true);
  assert.equal(variantIsPurchasable({ active: true, trackInventory: true, stockQuantity: 0 }), false);
  assert.equal(pink.labelEn, "Pink"); assert.equal(large.labelEn, "Large");
});

test("cart requires and preserves exact variant line identity", async () => {
  const repo = new PrismaCartRepository(db);
  await assert.rejects(() => repo.addProduct({ kind: "guest", guestTokenHash, market: "SAUDI_ARABIA" }, productId, 1), /VARIANT_REQUIRED/);
  await repo.addProduct({ kind: "guest", guestTokenHash, market: "SAUDI_ARABIA" }, productId, 2, variantId);
  await repo.addProduct({ kind: "guest", guestTokenHash, market: "SAUDI_ARABIA" }, productId, 1, variantId);
  await repo.addProduct({ kind: "guest", guestTokenHash, market: "SAUDI_ARABIA" }, productId, 1, variantId2);
  const cart = await db.cart.findUniqueOrThrow({ where: { guestTokenHash }, include: { items: true } });
  assert.equal(cart.items.length, 2);
  assert.deepEqual(cart.items.map((item) => [item.variantId, item.quantity]).sort(), [[variantId, 3], [variantId2, 1]].sort());
});

test("order snapshots retain SKU and option labels after live variant edits", async () => {
  const shipping = await db.shippingCompany.create({ data: { code: `mk06-shipping-${suffix}`, name: "MK06 Shipping", nameAr: "شحن MK06", nameEn: "MK06 Shipping", isActive: true, marketConfigs: { create: { market: "SAUDI_ARABIA", enabled: true, isCheckoutCarrier: true, rate: "0" } } } }); shippingId = shipping.id;
  const method = await db.paymentMethod.findUniqueOrThrow({ where: { code: "cash_on_delivery" } });
  const user = await db.user.create({ data: { type: "CUSTOMER", status: "ACTIVE", email: `mk06-order-${suffix}@example.test` } }); userId = user.id;
  const address = await db.customerAddress.create({ data: { userId: user.id, market: "SAUDI_ARABIA", countryCode: "SA", label: "MK06", recipientName: "MK06 Test", phone: "0551234567", country: "Saudi Arabia", region: "Riyadh", city: "Riyadh", street: "Test", building: "2", isDefault: true } });
  await db.cart.create({ data: { customerId: user.id, market: "SAUDI_ARABIA", items: { create: { productId, variantId, name: "MK06 Runtime", unitPrice: "79", quantity: 1 } } } });
  const placed = await new PrismaOrderRepository(db).placeOrder(user.id, address.id, method.id, "SAR", `mk06-order-${suffix}`); orderId = placed.id;
  const before = placed.items[0]; assert.equal(before.variantId, variantId); assert.equal(before.variantSku, `MK06-SB-${suffix}`); assert.equal((before.variantOptions as Array<{ labelEn: string }>).some((entry) => entry.labelEn === "Small"), true);
  const sizeValue = await db.productOptionValue.findFirstOrThrow({ where: { option: { productId }, labelEn: "Small" } }); await db.productOptionValue.update({ where: { id: sizeValue.id }, data: { labelEn: "XL" } }); await db.productVariantMarketPrice.upsert({ where: { variantId_market: { variantId, market: "SAUDI_ARABIA" } }, create: { variantId, market: "SAUDI_ARABIA", price: "101" }, update: { price: "101" } });
  const after = await new PrismaOrderRepository(db).findAdminOrder(orderId); assert.equal(after?.items[0].variantSku, before.variantSku); assert.equal((after?.items[0].variantOptions as Array<{ labelEn: string }>).some((entry) => entry.labelEn === "Small"), true); assert.equal(after?.items[0].unitPrice, "79.00");
});
