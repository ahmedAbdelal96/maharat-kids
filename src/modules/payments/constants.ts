export const PAYMENTS_FEATURE = "payments" as const;
export const PAYMENT_METHOD_CODES = { cashOnDelivery: "cash_on_delivery", onlinePayment: "online_payment", bankTransfer: "bank_transfer" } as const;

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

export const defaultPaymentMethods = [
  defaultPaymentMethod,
  { code: PAYMENT_METHOD_CODES.onlinePayment, name: "Online Payment", type: "ONLINE_PAYMENT" as const, enabled: true, isSystem: true, destination: null, instructions: "Secure payment via Payzaty.", confirmationWhatsApp: null, providerKey: "PAYZATY", sortOrder: 10 },
  { code: PAYMENT_METHOD_CODES.bankTransfer, name: "Bank Transfer", type: "BANK_TRANSFER" as const, enabled: true, isSystem: true, destination: null, instructions: "Transfer to the store bank account and submit your proof.", confirmationWhatsApp: null, providerKey: null, sortOrder: 20 },
] as const;
