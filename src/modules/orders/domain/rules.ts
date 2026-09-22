import type { OrderStatus, PaymentStatus, PaymentMethodType } from "@prisma/client";

const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: "Awaiting Confirmation",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function canTransitionOrderStatus(current: OrderStatus, next: OrderStatus): boolean {
  return transitions[current].includes(next);
}

export function allowedOrderStatusTransitions(current: OrderStatus): readonly OrderStatus[] {
  return transitions[current];
}

export type OrderFulfillment = "PHYSICAL_ONLY" | "DIGITAL_ONLY" | "MIXED";

export type OrderTransitionContext = {
  current: OrderStatus;
  next: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethodType: PaymentMethodType | null;
  fulfillment: OrderFulfillment;
  hasShipment: boolean;
};

/** Central server-side operational authority. Shipment transitions remain owned by shipping. */
export function canTransitionOrder(context: OrderTransitionContext): boolean {
  const { current, next, paymentStatus, paymentMethodType, fulfillment, hasShipment } = context;
  if (!(fulfillment === "DIGITAL_ONLY" && current === "CONFIRMED" && next === "COMPLETED") && !canTransitionOrderStatus(current, next)) return false;
  if (fulfillment === "DIGITAL_ONLY" && ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(next)) return false;
  if (fulfillment === "DIGITAL_ONLY" && next === "COMPLETED" && paymentStatus !== "PAID") return false;
  if (next === "PROCESSING" && paymentStatus !== "PAID" && paymentMethodType !== "CASH_ON_DELIVERY") return false;
  if (next === "CONFIRMED" && fulfillment === "DIGITAL_ONLY" && paymentStatus !== "PAID") return false;
  if (["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(next) && !hasShipment) return false;
  if (["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(next) && hasShipment) return false;
  if (next === "CANCELLED" && ["DELIVERED", "COMPLETED", "CANCELLED"].includes(current)) return false;
  return true;
}

export function allowedOrderTransitionsFor(context: Omit<OrderTransitionContext, "next">): readonly OrderStatus[] {
  return allowedOrderStatusTransitions(context.current).filter((next) => canTransitionOrder({ ...context, next }));
}
