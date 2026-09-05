export const SHIPPING_FEATURE = "shipping" as const;
export const SHIPPING_PERMISSIONS = { view: "shipping.view", update: "shipping.update" } as const;
export const SHIPPING_PAGE_SIZE = 25;

export const shipmentStatusLabels = {
  NOT_ASSIGNED: "Not assigned",
  READY_FOR_SHIPPING: "Ready for shipping",
  WITH_CARRIER: "With carrier",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  DELIVERY_FAILED: "Delivery failed",
  RETURNING: "Returning",
  RETURNED_TO_STORE: "Returned to store",
} as const;

export const failureReasonLabels = {
  CUSTOMER_DID_NOT_ANSWER: "Customer did not answer",
  CUSTOMER_REFUSED: "Customer refused",
  WRONG_ADDRESS: "Wrong address",
  CUSTOMER_UNAVAILABLE: "Customer unavailable",
  OTHER: "Other",
} as const;

export const shipmentStatuses = [
  "NOT_ASSIGNED", "READY_FOR_SHIPPING", "WITH_CARRIER", "OUT_FOR_DELIVERY",
  "DELIVERED", "DELIVERY_FAILED", "RETURNING", "RETURNED_TO_STORE",
] as const;
