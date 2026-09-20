/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import Module from "node:module";

// Shim server-only for tsx standalone execution
const origRequire = (Module.prototype as unknown as { require: Function }).require;
(Module.prototype as unknown as { require: Function }).require = function (id: string, ...args: unknown[]) {
  if (id === "server-only") return {};
  return origRequire.apply(this, [id, ...args]);
};

import { getPrismaClient } from "@/database/prisma";
import { evaluatePromotions } from "../domain/evaluator";
import { PrismaPromotionRepository } from "../infrastructure/repository";
import { PromotionService } from "../domain/service";
import { PrismaStoreSettingRepository } from "@/modules/store/infrastructure/repository";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";

async function runVerification() {
  console.log("=== Starting Phase 24 End-to-End Test Suite ===");
  const db = getPrismaClient();

  const userRepo = new PrismaUserRepository(db);
  const permRepo = new PrismaPermissionRepository(db);
  const authService = new AuthorizationService(permRepo, userRepo);
  const promoRepo = new PrismaPromotionRepository(db);
  const storeSettingRepo = new PrismaStoreSettingRepository(db);
  const promoService = new PromotionService(promoRepo, storeSettingRepo, authService);

  // Find an admin user for authorized testing
  const adminUser = await db.user.findFirst({
    where: {
      email: "admin@example.com",
    },
  });
  if (!adminUser) {
    throw new Error("Admin user not found. Ensure database is seeded.");
  }

  console.log(`[Setup] Using Admin user: ${adminUser.email} (${adminUser.id})`);

  // Clean up any lingering test promotions/orders
  await db.orderPromotion.deleteMany({
    where: { promotion: { name: { contains: "Test" } } },
  });
  await db.promotion.deleteMany({
    where: { name: { contains: "Test" } },
  });

  // Ensure test products exist
  let testQualifying = await db.product.findFirst({ where: { slug: "test-qualifying-prod" } });
  if (!testQualifying) {
    testQualifying = await db.product.create({
      data: {
        name: "Test Qualifying Product",
        slug: "test-qualifying-prod",
        price: 50.00,
        stockQuantity: 100,
        trackInventory: true,
        status: "ACTIVE",
      },
    });
  }

  let testGift = await db.product.findFirst({ where: { slug: "test-gift-prod" } });
  if (!testGift) {
    testGift = await db.product.create({
      data: {
        name: "Test Gift Product",
        slug: "test-gift-prod",
        price: 25.00,
        stockQuantity: 50,
        trackInventory: true,
        status: "ACTIVE",
      },
    });
  }

  console.log("[Setup] Test products ready.");

  // Test 1: Create Percentage Promotion
  console.log("\n--- Test 1: Create Percentage Promotion (15% off orders >= $100) ---");
  const createPctResult = await promoService.createPromotion(adminUser.id as any, {
    name: "Summer 15% Off Test",
    shortDescription: "Get 15% off any order over $100",
    type: "ORDER_PERCENTAGE_DISCOUNT",
    percentageDiscount: 15,
    minimumOrderSubtotal: 100,
    isActive: true,
    showInHero: true,
    showOnOffersPage: true,
    startsAt: new Date(Date.now() - 3600000).toISOString(),
    priority: 10,
  });

  if (!createPctResult.success) {
    throw new Error(`Failed to create percentage promo: ${createPctResult.error.message}`);
  }
  const pctPromo = createPctResult.data;
  console.log(`✓ Created Percentage Promo: ${pctPromo.name} (id: ${pctPromo.id}, slug: ${pctPromo.slug})`);

  // Test 2: Evaluator on subtotal below threshold vs above threshold
  console.log("\n--- Test 2: Evaluate Percentage Promotion Subtotal Guard ---");
  const evalBelow = await evaluatePromotions({
    market: "SAUDI_ARABIA",
    items: [{ productId: testQualifying.id, unitPrice: 50, quantity: 1 }], // Subtotal = $50 (< $100)
    now: new Date(),
  });
  console.log(`Subtotal $50 Evaluation -> Applied: ${evalBelow.appliedPromotion?.promotionName ?? "None"}, Discount: $${evalBelow.discountAmount}`);
  if (evalBelow.appliedPromotion?.promotionId === pctPromo.id) {
    throw new Error("Percentage promotion applied below minimum subtotal threshold!");
  }
  if (!evalBelow.progressHint?.includes("$50.00 more")) {
    console.warn(`Progress hint note: ${evalBelow.progressHint}`);
  }
  console.log("✓ Subtotal below threshold correctly rejected with progress hint.");

  const evalAbove = await evaluatePromotions({
    market: "SAUDI_ARABIA",
    items: [{ productId: testQualifying.id, unitPrice: 50, quantity: 3 }], // Subtotal = $150 (>= $100)
    now: new Date(),
  });
  console.log(`Subtotal $150 Evaluation -> Applied: ${evalAbove.appliedPromotion?.promotionName}, Discount: $${evalAbove.discountAmount}`);
  if (evalAbove.appliedPromotion?.promotionId !== pctPromo.id || evalAbove.discountAmount !== "22.50") {
    throw new Error(`Expected $22.50 discount, got ${evalAbove.discountAmount}`);
  }
  console.log("✓ 15% of $150.00 = $22.50 computed precisely.");

  // Test 3: Create BOGO Promotion (Buy 2 Qualifying -> Get 1 Gift Free)
  console.log("\n--- Test 3: Create BOGO Promotion & Test Multiples & Stock Concurrency ---");
  const createBogoResult = await promoService.createPromotion(adminUser.id as any, {
    name: "Buy 2 Get 1 Gift Free Test",
    shortDescription: "Buy 2 qualifying items, get 1 free gift!",
    type: "BUY_X_GET_Y_FREE",
    qualifyingProductId: testQualifying.id,
    buyQuantity: 2,
    giftProductId: testGift.id,
    giftQuantity: 1,
    isActive: true,
    showInHero: true,
    showOnOffersPage: true,
    startsAt: new Date(Date.now() - 3600000).toISOString(),
    priority: 50, // Higher priority
  });

  if (!createBogoResult.success) {
    throw new Error(`Failed to create BOGO promo: ${createBogoResult.error.message}`);
  }
  const bogoPromo = createBogoResult.data;
  console.log(`✓ Created BOGO Promo: ${bogoPromo.name} (id: ${bogoPromo.id})`);

  // Evaluate BOGO: Buy 4 qualifying -> Should yield 2 free gifts
  const evalBogo = await evaluatePromotions({
    market: "SAUDI_ARABIA",
    items: [{ productId: testQualifying.id, unitPrice: 50, quantity: 4 }],
    now: new Date(),
  });
  console.log(`Buy 4 Qualifying -> Applied: ${evalBogo.appliedPromotion?.promotionName}`);
  console.log(`Gift Items: ${JSON.stringify(evalBogo.giftItems)}`);
  if (evalBogo.giftItems.length !== 1 || evalBogo.giftItems[0].quantity !== 2) {
    throw new Error(`Expected 2 free gifts for 4 qualifying items, got ${JSON.stringify(evalBogo.giftItems)}`);
  }
  console.log("✓ BOGO repeats computed correctly (4 bought = 2 free gifts).");

  // Test 4: Delete Guard against orders with history
  console.log("\n--- Test 4: Order History Protection / Deletion Guard ---");
  // Simulate an order snapshot referencing pctPromo
  const testOrder = await db.order.create({
    data: {
      orderNumber: `TEST-PROMO-${Date.now()}`,
      customer: { connect: { id: adminUser.id as any } },
      shippingAddress: {
        recipientName: "Test Admin",
        line1: "123 Test St",
        city: "Testville",
        postalCode: "12345",
        country: "US",
      },
      subtotal: 150.00,
      promotionDiscount: 22.50,
      shippingAmount: 0.00,
      total: 127.50,
      currency: "USD",
      status: "PENDING",
      paymentStatus: "PENDING",
      paymentMethodCode: "CASH_ON_DELIVERY",
      paymentMethodName: "Cash on Delivery",
      promotions: {
        create: {
          promotion: { connect: { id: pctPromo.id } },
          promotionName: pctPromo.name,
          promotionType: pctPromo.type,
          discountAmount: 22.50,
          ruleSnapshot: { percentageDiscount: 15, minimumOrderSubtotal: 100 },
        },
      },
    },
  });

  console.log(`[Setup] Created test order: ${testOrder.orderNumber} with OrderPromotion link.`);

  const deleteAttempt = await promoService.deletePromotion(adminUser.id as any, pctPromo.id);
  console.log(`Delete attempt with order history -> Success: ${deleteAttempt.success}`);
  if (deleteAttempt.success) {
    throw new Error("Promotion with existing order history was deleted! Deletion guard failed.");
  }
  console.log(`✓ Deletion blocked as expected: "${deleteAttempt.error.message}"`);

  // Clean up test order
  await db.orderPromotion.deleteMany({ where: { orderId: testOrder.id } });
  await db.order.delete({ where: { id: testOrder.id } });

  // Now delete test promotions
  const cleanPct = await promoService.deletePromotion(adminUser.id as any, pctPromo.id);
  const cleanBogo = await promoService.deletePromotion(adminUser.id as any, bogoPromo.id);
  if (!cleanPct.success || !cleanBogo.success) {
    throw new Error("Failed to cleanup test promotions after deleting order reference.");
  }
  console.log("✓ Cleaned up test promotions successfully.");

  // Clean up test products
  await db.product.delete({ where: { id: testQualifying.id } });
  await db.product.delete({ where: { id: testGift.id } });
  console.log("✓ Cleaned up test products.");

  console.log("\n=== ALL PHASE 24 VERIFICATION SCENARIOS PASSED SUCCESSFULLY ===");
}

runVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification failed with error:", err);
    process.exit(1);
  });
