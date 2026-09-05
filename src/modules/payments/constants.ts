export const PAYMENTS_FEATURE = "payments" as const;
export const PAYMENT_METHOD_CODES = { cashOnDelivery: "cash_on_delivery" } as const;

export const defaultPaymentMethod = {
  code: PAYMENT_METHOD_CODES.cashOnDelivery,
  name: "Cash on Delivery",
  type: "CASH_ON_DELIVERY" as const,
  enabled: true,
  isSystem: true,
  destination: null,
  instructions: "You will pay when your order is delivered.",
  confirmationWhatsApp: null,
  providerKey: null,
  sortOrder: 0,
};
