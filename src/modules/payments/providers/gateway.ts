import "server-only";

export type PaymentGateway = {
  key: string;
  createPayment: (input: { orderNumber: string; amount: string; currency: string }) => Promise<never>;
  verifyPayment: (input: unknown) => Promise<never>;
  handleWebhook: (input: unknown) => Promise<never>;
};

export function getPaymentGateway(providerKey: string): PaymentGateway | null { void providerKey; return null; }
