import type { OrderStatus } from "@prisma/client";

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
