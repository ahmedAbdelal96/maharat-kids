import "server-only";

import { env } from "@/config/env";

export type PaymentGateway = {
  key: string;
  createPayment: (input: { orderNumber: string; amount: string; currency: "SAR" | "EGP"; customer: { name: string; email: string | null; phone: string | null }; responseUrl: string; cancelUrl: string; idempotencyKey: string }) => Promise<{ providerReference: string; checkoutUrl: string }>;
  getPaymentStatus: (providerReference: string) => Promise<{ providerReference: string; status: "PENDING" | "PAID" | "FAILED"; amount?: string; currency?: string }>;
};

type PayzatyResponse = { checkout_id?: string; checkout_url?: string; paid?: boolean; status?: string; error?: string; errorText?: string; amount?: string | number; currency?: string; };

function isProduction() { return env.NODE_ENV === "production"; }
function payzatyConfig() {
  const accountNo = process.env.PAYZATY_ACCOUNT_NO;
  const secretKey = process.env.PAYZATY_SECRET_KEY;
  const baseUrl = process.env.PAYZATY_BASE_URL ?? (process.env.PAYZATY_SANDBOX === "true" ? "https://api.sandbox.payzaty.com" : "https://api.payzaty.com");
  // Production must name the merchant-approved endpoint explicitly. The
  // sandbox/default convenience URL is only suitable for non-production use.
  if (!accountNo || !secretKey || (isProduction() && !process.env.PAYZATY_BASE_URL)) return null;
  return { accountNo, secretKey, baseUrl };
}

function normalizeStatus(value: string | undefined, paid?: boolean): "PENDING" | "PAID" | "FAILED" {
  if (paid === true || ["PAID", "SUCCESS", "COMPLETED", "CAPTURED"].includes((value ?? "").toUpperCase())) return "PAID";
  if (["FAILED", "CANCELLED", "DECLINED", "ERROR"].includes((value ?? "").toUpperCase())) return "FAILED";
  return "PENDING";
}

export class PayzatyPaymentProvider implements PaymentGateway {
  key = "PAYZATY";
  async createPayment(input: Parameters<PaymentGateway["createPayment"]>[0]) {
    const config = payzatyConfig();
    if (!config) throw new Error("PAYZATY_NOT_CONFIGURED");
    const response = await fetch(`${config.baseUrl}/checkout`, { method: "POST", headers: { "content-type": "application/json", "X-AccountNo": config.accountNo, "X-SecretKey": config.secretKey }, body: JSON.stringify({ amount: Number(input.amount), currency: input.currency, language: "en", reference: input.orderNumber, customer: { name: input.customer.name, email: input.customer.email, phone: input.customer.phone }, response_url: input.responseUrl, cancel_url: input.cancelUrl, udf1: input.idempotencyKey }) });
    const body = await response.json() as PayzatyResponse;
    if (!response.ok || !body.checkout_id || !body.checkout_url) throw new Error(body.errorText || body.error || "PAYZATY_INITIATION_FAILED");
    return { providerReference: body.checkout_id, checkoutUrl: body.checkout_url };
  }
  async getPaymentStatus(providerReference: string) {
    const config = payzatyConfig();
    if (!config) throw new Error("PAYZATY_NOT_CONFIGURED");
    const statusEndpoint = process.env.PAYZATY_STATUS_ENDPOINT;
    if (!statusEndpoint) throw new Error("PAYZATY_STATUS_ENDPOINT_UNCONFIGURED");
    const response = await fetch(statusEndpoint.replaceAll("{checkoutId}", encodeURIComponent(providerReference)), { headers: { "X-AccountNo": config.accountNo, "X-SecretKey": config.secretKey } });
    const body = await response.json() as PayzatyResponse;
    if (!response.ok) throw new Error(body.errorText || body.error || "PAYZATY_STATUS_FAILED");
    return { providerReference, status: normalizeStatus(body.status, body.paid), amount: body.amount?.toString(), currency: body.currency };
  }
}

/** Deterministic local provider for acceptance tests only. It cannot be selected in production. */
export class DevelopmentPaymentProvider implements PaymentGateway {
  key = "PAYZATY_TEST";
  async createPayment(input: Parameters<PaymentGateway["createPayment"]>[0]) { if (isProduction()) throw new Error("PAYMENT_PROVIDER_UNAVAILABLE"); return { providerReference: `test_${input.idempotencyKey}`, checkoutUrl: `/checkout/payment/test?reference=${encodeURIComponent(input.idempotencyKey)}` }; }
  async getPaymentStatus(providerReference: string) { if (isProduction()) throw new Error("PAYMENT_PROVIDER_UNAVAILABLE"); return { providerReference, status: "PENDING" as const }; }
}

export function getPaymentGateway(providerKey: string): PaymentGateway | null {
  if (providerKey === "PAYZATY") return payzatyConfig() ? new PayzatyPaymentProvider() : null;
  if (providerKey === "PAYZATY_TEST" && !isProduction()) return new DevelopmentPaymentProvider();
  return null;
}
