import type { ShipmentStatus } from "@prisma/client";

const transitions: Record<ShipmentStatus, readonly ShipmentStatus[]> = {
  NOT_ASSIGNED: ["READY_FOR_SHIPPING"],
  READY_FOR_SHIPPING: ["WITH_CARRIER"],
  WITH_CARRIER: ["OUT_FOR_DELIVERY", "DELIVERED", "DELIVERY_FAILED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "DELIVERY_FAILED"],
  DELIVERED: [],
  DELIVERY_FAILED: ["RETURNING"],
  RETURNING: ["RETURNED_TO_STORE"],
  RETURNED_TO_STORE: [],
};

export function canTransitionShipmentStatus(current: ShipmentStatus, next: ShipmentStatus) {
  return transitions[current].includes(next);
}

export function allowedShipmentTransitions(current: ShipmentStatus) {
  return transitions[current];
}
