import "server-only";

import { Prisma, PrismaClient, type OrderStatus, type PaymentStatus, type ShipmentStatus } from "@prisma/client";
import { getPrismaClient } from "@/database/prisma";
import type { AddressSnapshot, OrderDetails, OrderSummary } from "../types";

import { evaluatePromotions } from "@/modules/promotions/domain/evaluator";
import { evaluateCoupon } from "@/modules/coupons/domain/evaluator";
import { findCouponForPricing } from "@/modules/coupons/infrastructure/repository";

const orderInclude = {
  items: true,
  customer: { select: { name: true, email: true, phone: true } },
  paymentMethod: true,
  promotions: true,
  couponSnapshot: true,
  shipment: { select: { status: true, trackingNumber: true, shippingCompany: { select: { name: true } } } },
  statusHistory: { include: { changedBy: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" as const } },
  paymentStatusHistory: { include: { changedBy: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" as const } },
  settlement: { include: { settledBy: { select: { name: true, email: true } } } },
} as const;

type OrderRecord = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
function money(value: Prisma.Decimal): string { return value.toFixed(2); }
function snapshot(address: { label: string; recipientName: string; phone: string; country: string; governorate: string | null; city: string; area: string | null; street: string; building: string | null; floor: string | null; apartment: string | null; postalCode: string | null; notes: string | null }): AddressSnapshot { return { label: address.label, recipientName: address.recipientName, phone: address.phone, country: address.country, governorate: address.governorate, city: address.city, area: address.area, street: address.street, building: address.building, floor: address.floor, apartment: address.apartment, postalCode: address.postalCode, notes: address.notes }; }

function toSummary(record: OrderRecord): OrderSummary {
  const promo = record.promotions[0] ?? null;
  return {
    id: record.id,
    orderNumber: record.orderNumber,
    customerId: record.customerId,
    customerName: record.customer.name,
    customerEmail: record.customer.email,
    customerPhone: record.customer.phone,
    status: record.status,
    paymentStatus: record.paymentStatus,
    paymentMethodCode: record.paymentMethodCode,
    paymentMethodName: record.paymentMethodName,
    currency: record.currency,
    subtotal: money(record.subtotal),
    promotionDiscount: money(record.promotionDiscount),
    couponDiscount: money(record.couponDiscount),
    shippingAmount: money(record.shippingAmount),
    total: money(record.total),
    createdAt: record.createdAt.toISOString(),
    shippingCompanyName: record.shipment?.shippingCompany?.name ?? null,
    shippingStatus: record.shipment?.status ?? null,
    trackingNumber: record.shipment?.trackingNumber ?? null,
    promotion: promo
      ? {
          id: promo.id,
          promotionId: promo.promotionId,
          promotionName: promo.promotionName,
          promotionType: promo.promotionType,
          discountAmount: money(promo.discountAmount),
          ruleSnapshot: promo.ruleSnapshot as Record<string, unknown>,
        }
      : null,
    coupon: record.couponSnapshot
      ? { id: record.couponSnapshot.id, couponId: record.couponSnapshot.couponId, couponCode: record.couponSnapshot.couponCode, couponName: record.couponSnapshot.couponName, couponType: record.couponSnapshot.couponType, configuredValue: money(record.couponSnapshot.configuredValue), actualDiscountAmount: money(record.couponSnapshot.actualDiscountAmount), minimumSubtotalSnapshot: money(record.couponSnapshot.minimumSubtotalSnapshot), combinationSnapshot: record.couponSnapshot.combinationSnapshot as Record<string, unknown> }
      : null,
  };
}

function toDetails(record: OrderRecord): OrderDetails {
  const summary = toSummary(record);
  return {
    ...summary,
    shippingAddress: record.shippingAddress as AddressSnapshot,
    paidAt: record.paidAt?.toISOString() ?? null,
    paymentReference: record.paymentReference,
    paymentNotes: record.paymentNotes,
    paymentDestination: record.paymentMethod?.destination ?? null,
    paymentInstructions: record.paymentMethod?.instructions ?? null,
    confirmationWhatsApp: record.paymentMethod?.confirmationWhatsApp ?? null,
    items: record.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      name: item.name,
      imageUrl: item.imageUrl,
      unitPrice: money(item.unitPrice),
      quantity: item.quantity,
      lineTotal: money(item.unitPrice.mul(item.quantity)),
      isPromotionGift: item.isPromotionGift,
      promotionId: item.promotionId,
    })),
    history: record.statusHistory.map((entry) => ({
      id: entry.id,
      oldStatus: entry.oldStatus,
      newStatus: entry.newStatus,
      changedByUserId: entry.changedByUserId,
      changedByName: entry.changedBy.name,
      changedByEmail: entry.changedBy.email,
      note: entry.note,
      createdAt: entry.createdAt.toISOString(),
    })),
    paymentHistory: record.paymentStatusHistory.map((entry) => ({
      id: entry.id,
      oldStatus: entry.oldStatus,
      newStatus: entry.newStatus,
      changedByUserId: entry.changedByUserId,
      changedByName: entry.changedBy.name,
      changedByEmail: entry.changedBy.email,
      note: entry.note,
      createdAt: entry.createdAt.toISOString(),
    })),
    settlement: record.settlement
      ? {
          id: record.settlement.id,
          orderId: record.settlement.orderId,
          amount: money(record.settlement.amount),
          status: record.settlement.status,
          settledByUserId: record.settlement.settledByUserId,
          settledByName: record.settlement.settledBy?.name ?? null,
          settledByEmail: record.settlement.settledBy?.email ?? null,
          settledAt: record.settlement.settledAt?.toISOString() ?? null,
          note: record.settlement.note,
        }
      : null,
  };
}

export interface OrderRepository {
  placeOrder(customerId: string, addressId: string, paymentMethodId: string, currency: string, checkoutToken: string, paymentReference?: string, paymentNotes?: string): Promise<OrderDetails>;
  findCustomerOrders(customerId: string): Promise<OrderSummary[]>;
  findCustomerOrder(customerId: string, orderNumber: string): Promise<OrderDetails | null>;
  findAdminOrders(): Promise<OrderSummary[]>;
  findAdminOrder(orderId: string): Promise<OrderDetails | null>;
  findStatus(orderId: string): Promise<OrderStatus | null>;
  findShipmentStatus(orderId: string): Promise<ShipmentStatus | null>;
  findPaymentStatus(orderId: string): Promise<PaymentStatus | null>;
  updateStatus(orderId: string, expectedStatus: OrderStatus, status: OrderStatus, changedByUserId: string, note?: string | null): Promise<OrderDetails>;
  updatePaymentStatus(orderId: string, status: PaymentStatus, changedByUserId: string, note?: string | null): Promise<OrderDetails>;
}

export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async placeOrder(customerId: string, addressId: string, paymentMethodId: string, currency: string, checkoutToken: string, paymentReference?: string, paymentNotes?: string): Promise<OrderDetails> {
    const existing = await this.db.order.findUnique({ where: { checkoutToken }, include: orderInclude });
    if (existing && existing.customerId === customerId) return toDetails(existing);

    const record = await this.db.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({ where: { customerId }, include: { coupon: true, items: true } });
      if (!cart || cart.items.length === 0) throw new Error("CART_EMPTY");
      const address = await tx.customerAddress.findFirst({ where: { id: addressId, userId: customerId } });
      if (!address) throw new Error("ADDRESS_NOT_FOUND");
      const method = await tx.paymentMethod.findFirst({ where: { id: paymentMethodId, enabled: true } });
      if (!method || method.type === "ONLINE_GATEWAY") throw new Error("PAYMENT_METHOD_UNAVAILABLE");

      const products = await tx.product.findMany({
        where: { id: { in: cart.items.map((item) => item.productId) } },
        include: { images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] } },
      });
      const productById = new Map(products.map((product) => [product.id, product]));

      for (const item of cart.items) {
        const product = productById.get(item.productId);
        if (!product || product.status !== "ACTIVE") throw new Error("PRODUCT_UNAVAILABLE");
        if (product.trackInventory) {
          const changed = await tx.product.updateMany({
            where: { id: product.id, status: "ACTIVE", trackInventory: true, stockQuantity: { gte: item.quantity } },
            data: { stockQuantity: { decrement: item.quantity } },
          });
          if (changed.count !== 1) throw new Error("INSUFFICIENT_STOCK");
        }
        await tx.cartItem.update({
          where: { id: item.id },
          data: { name: product.name, imageUrl: product.images[0]?.url ?? null, unitPrice: product.price },
        });
      }

      // Re-evaluate promotions inside the authoritative transaction
      const promoEval = await evaluatePromotions({
        items: cart.items.map((item) => ({
          productId: item.productId,
          unitPrice: productById.get(item.productId)!.price.toFixed(2),
          quantity: item.quantity,
        })),
        tx,
        now: new Date(),
      });

      const subtotal = cart.items.reduce(
        (sum, item) => sum.add(productById.get(item.productId)!.price.mul(item.quantity)),
        new Prisma.Decimal(0),
      );
      let promotionDiscount = new Prisma.Decimal(promoEval.discountAmount);
      let appliedPromotion = promoEval.appliedPromotion;
      let giftItems = promoEval.giftItems;
      let couponForOrder: Awaited<ReturnType<typeof findCouponForPricing>> = null;
      let couponDiscount = new Prisma.Decimal(0);

      if (cart.couponId) {
        await tx.$queryRaw`SELECT "id" FROM "Coupon" WHERE "id" = ${cart.couponId} FOR UPDATE`;
        couponForOrder = await findCouponForPricing(tx, cart.couponId, customerId);
        if (!couponForOrder) throw new Error("COUPON_PRICING_CHANGED");
        const couponEval = evaluateCoupon({
          coupon: couponForOrder,
          subtotal,
          promotionDiscount: couponForOrder.canCombineWithPromotions ? promotionDiscount : 0,
          totalRedeemed: couponForOrder.totalRedeemed,
          customerRedeemed: couponForOrder.customerRedeemed,
          now: new Date(),
        });
        if (!couponEval.valid) throw new Error("COUPON_PRICING_CHANGED");
        const couponAmount = new Prisma.Decimal(couponEval.discountAmount);
        if (!couponForOrder.canCombineWithPromotions && promotionDiscount.gt(couponAmount)) {
          couponDiscount = new Prisma.Decimal(0);
        } else if (!couponForOrder.canCombineWithPromotions && couponAmount.gte(promotionDiscount)) {
          promotionDiscount = new Prisma.Decimal(0);
          appliedPromotion = null;
          giftItems = [];
          couponDiscount = couponAmount;
        } else {
          couponDiscount = couponAmount;
        }
      }

      // Atomically decrement stock for free gift items
      for (const gift of giftItems) {
        if (gift.trackInventory) {
          const changed = await tx.product.updateMany({
            where: { id: gift.productId, status: "ACTIVE", trackInventory: true, stockQuantity: { gte: gift.quantity } },
            data: { stockQuantity: { decrement: gift.quantity } },
          });
          if (changed.count !== 1) throw new Error("INSUFFICIENT_STOCK");
        }
      }

      const shippingAmount = new Prisma.Decimal(0);
      const calculatedTotal = subtotal.sub(promotionDiscount).sub(couponDiscount).add(shippingAmount);
      const total = calculatedTotal.gt(0) ? calculatedTotal : new Prisma.Decimal(0);
      const paymentStatus = method.type === "CASH_ON_DELIVERY" ? ("UNPAID" as const) : ("PENDING_VERIFICATION" as const);

      const orderItemsData = [
        ...cart.items.map((item) => {
          const product = productById.get(item.productId)!;
          return {
            productId: item.productId,
            variantId: item.variantId,
            name: product.name,
            imageUrl: product.images[0]?.url ?? null,
            unitPrice: product.price,
            quantity: item.quantity,
            isPromotionGift: false,
            promotionId: null,
            inventoryTrackedAtPurchase: product.trackInventory,
          };
        }),
        ...giftItems.map((gift) => ({
          productId: gift.productId,
          variantId: null,
          name: gift.name,
          imageUrl: gift.imageUrl,
          unitPrice: new Prisma.Decimal(0),
          quantity: gift.quantity,
          isPromotionGift: true,
          promotionId: gift.promotionId,
          inventoryTrackedAtPurchase: gift.trackInventory,
        })),
      ];

      const order = await tx.order.create({
        data: {
          orderNumber: `ORD-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          checkoutToken,
          customerId,
          status: "PENDING",
          paymentStatus,
          paymentMethodId: method.id,
          paymentMethodCode: method.code,
          paymentMethodName: method.name,
          paymentReference: paymentReference || null,
          paymentNotes: paymentNotes || null,
          currency,
          subtotal,
          promotionDiscount,
          couponDiscount,
          shippingAmount,
          total,
          shippingAddress: snapshot(address) as Prisma.InputJsonValue,
          items: { create: orderItemsData },
          promotions: appliedPromotion
            ? {
                create: {
                  promotionId: appliedPromotion.promotionId,
                  promotionName: appliedPromotion.promotionName,
                  promotionType: appliedPromotion.promotionType,
                  discountAmount: new Prisma.Decimal(appliedPromotion.discountAmount),
                  ruleSnapshot: appliedPromotion.ruleSnapshot as Prisma.InputJsonValue,
                },
              }
            : undefined,
          couponSnapshot: couponForOrder && couponDiscount.gt(0)
            ? { create: { couponId: couponForOrder.id, couponCode: couponForOrder.code, couponName: couponForOrder.name, couponType: couponForOrder.type, configuredValue: new Prisma.Decimal(couponForOrder.type === "PERCENTAGE" ? couponForOrder.percentageDiscount ?? 0 : couponForOrder.fixedDiscountAmount ?? 0), actualDiscountAmount: couponDiscount, minimumSubtotalSnapshot: couponForOrder.minimumOrderSubtotal, combinationSnapshot: { canCombineWithPromotions: couponForOrder.canCombineWithPromotions, promotionDiscount: promotionDiscount.toFixed(2) } as Prisma.InputJsonValue } }
            : undefined,
          couponRedemption: couponForOrder && couponDiscount.gt(0)
            ? { create: { couponId: couponForOrder.id, customerId, discountAmount: couponDiscount } }
            : undefined,
          statusHistory: {
            create: { oldStatus: null, newStatus: "PENDING", changedByUserId: customerId, note: "Order placed." },
          },
          paymentStatusHistory: {
            create: {
              oldStatus: null,
              newStatus: paymentStatus,
              changedByUserId: customerId,
              note: paymentStatus === "PENDING_VERIFICATION" ? "Manual payment submitted for verification." : "Payment will be collected on delivery.",
            },
          },
        },
        include: orderInclude,
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return order;
    });

    return toDetails(record);
  }
  async findCustomerOrders(customerId: string) { return (await this.db.order.findMany({ where: { customerId }, include: orderInclude, orderBy: { createdAt: "desc" } })).map(toSummary); }
  async findCustomerOrder(customerId: string, orderNumber: string) { const record = await this.db.order.findFirst({ where: { customerId, orderNumber }, include: orderInclude }); return record ? toDetails(record) : null; }
  async findAdminOrders() { return (await this.db.order.findMany({ include: orderInclude, orderBy: { createdAt: "desc" } })).map(toSummary); }
  async findAdminOrder(orderId: string) { const record = await this.db.order.findUnique({ where: { id: orderId }, include: orderInclude }); return record ? toDetails(record) : null; }
  async findStatus(orderId: string) { const record = await this.db.order.findUnique({ where: { id: orderId }, select: { status: true } }); return record?.status ?? null; }
  async findShipmentStatus(orderId: string) { const record = await this.db.orderShipment.findUnique({ where: { orderId }, select: { status: true } }); return record?.status ?? null; }
  async findPaymentStatus(orderId: string) { const record = await this.db.order.findUnique({ where: { id: orderId }, select: { paymentStatus: true } }); return record?.paymentStatus ?? null; }
  async updateStatus(orderId: string, expectedStatus: OrderStatus, status: OrderStatus, changedByUserId: string, note?: string | null) {
    const record = await this.db.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id: orderId }, include: { paymentMethod: true, items: true, shipment: { select: { status: true } } } });
      if (!current) throw new Error("ORDER_NOT_FOUND");
      if (current.status !== expectedStatus) throw new Error("ORDER_STATE_CHANGED");
      const canRestoreBeforeHandover = !current.shipment || ["NOT_ASSIGNED", "READY_FOR_SHIPPING"].includes(current.shipment.status);
      if (status === "CANCELLED" && canRestoreBeforeHandover) {
        for (const item of current.items) {
          if (item.inventoryTrackedAtPurchase) {
            await tx.product.updateMany({ where: { id: item.productId }, data: { stockQuantity: { increment: item.quantity } } });
          }
        }
      }
      if (status === "CANCELLED") {
        await tx.couponRedemption.updateMany({ where: { orderId, status: "REDEEMED" }, data: { status: "REVERSED", reversedAt: new Date() } });
      }
      const codDelivered = status === "DELIVERED" && current.paymentMethod?.type === "CASH_ON_DELIVERY";
      const collectCod = codDelivered && current.paymentStatus !== "PAID";
      const paymentData = collectCod ? { paymentStatus: "PAID" as const, paidAt: new Date() } : {};
      await tx.order.update({ where: { id: orderId }, data: { status, ...paymentData } });
      await tx.orderStatusHistory.create({ data: { orderId, oldStatus: current.status, newStatus: status, changedByUserId, note: note ?? null } });
      if (codDelivered) {
        if (collectCod) await tx.paymentStatusHistory.create({ data: { orderId, oldStatus: current.paymentStatus, newStatus: "PAID", changedByUserId, note: "COD payment collected on delivery." } });
        await tx.paymentSettlement.upsert({ where: { orderId }, create: { orderId, amount: current.total, status: "PENDING_SETTLEMENT" }, update: {} });
      }
      return tx.order.findUnique({ where: { id: orderId }, include: orderInclude });
    });
    if (!record) throw new Error("ORDER_NOT_FOUND");
    return toDetails(record);
  }
  async updatePaymentStatus(orderId: string, status: PaymentStatus, changedByUserId: string, note?: string | null) {
    const record = await this.db.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id: orderId }, include: { paymentMethod: true } });
      if (!current) throw new Error("ORDER_NOT_FOUND");
      await tx.order.update({ where: { id: orderId }, data: { paymentStatus: status, paidAt: status === "PAID" ? new Date() : null } });
      if (current.paymentStatus !== status) await tx.paymentStatusHistory.create({ data: { orderId, oldStatus: current.paymentStatus, newStatus: status, changedByUserId, note: note ?? null } });
      if (status === "PAID" && current.paymentMethod?.type === "CASH_ON_DELIVERY" && ["DELIVERED", "COMPLETED"].includes(current.status)) await tx.paymentSettlement.upsert({ where: { orderId }, create: { orderId, amount: current.total, status: "PENDING_SETTLEMENT" }, update: {} });
      return tx.order.findUnique({ where: { id: orderId }, include: orderInclude });
    });
    if (!record) throw new Error("ORDER_NOT_FOUND");
    return toDetails(record);
  }
}
