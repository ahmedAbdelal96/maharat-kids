import assert from "node:assert/strict";
import { before, test } from "node:test";

Object.assign(process.env, { NODE_ENV: "development" });
process.env.CUSTOMER_OTP_EMAIL_PROVIDER = "brevo";
process.env.CUSTOMER_OTP_EMAIL_API_KEY = "test-brevo-key";
process.env.EMAIL_FROM = "Maharat Kids <no-reply@example.com>";

let BrevoEmailOtpProvider: typeof import("../src/modules/auth/providers/otp-delivery").BrevoEmailOtpProvider;
let OtpDeliveryProviderRegistry: typeof import("../src/modules/auth/providers/otp-delivery").OtpDeliveryProviderRegistry;
let getOtpCapability: typeof import("../src/modules/auth/providers/otp-delivery").getOtpCapability;
let generateOtp: typeof import("../src/modules/auth/domain/customer-otp").generateOtp;
let hashOtp: typeof import("../src/modules/auth/domain/customer-otp").hashOtp;

before(async () => {
  const providers = await import("../src/modules/auth/providers/otp-delivery");
  BrevoEmailOtpProvider = providers.BrevoEmailOtpProvider;
  OtpDeliveryProviderRegistry = providers.OtpDeliveryProviderRegistry;
  getOtpCapability = providers.getOtpCapability;
  const engine = await import("../src/modules/auth/domain/customer-otp");
  generateOtp = engine.generateOtp;
  hashOtp = engine.hashOtp;
});

test("OTP engine generates numeric six-digit values and persists only a derived value", () => {
  const code = generateOtp();
  assert.match(code, /^\d{6}$/);
  assert.notEqual(hashOtp(code), code);
  assert.equal(hashOtp(code).length, 64);
});

test("Brevo receives the backend-generated OTP in the body, never the subject", async () => {
  let request: { url: string; init?: RequestInit } | undefined;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async (input, init) => {
    request = { url: String(input), init };
    return new Response(JSON.stringify({ messageId: "<provider-message-id>" }), { status: 201, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const result = await new BrevoEmailOtpProvider().send({ channel: "EMAIL", destination: "customer@example.com", otp: "123456", locale: "en", purpose: "LOGIN", expiresInMinutes: 5 });
    const payload = JSON.parse(String(request?.init?.body));
    assert.equal(result.accepted, true);
    assert.equal(request?.url, "https://api.brevo.com/v3/smtp/email");
    assert.equal(payload.sender.email, "no-reply@example.com");
    assert.equal(payload.to[0].email, "customer@example.com");
    assert.equal(payload.subject, "Your Maharat Kids verification code");
    assert.equal(payload.subject.includes("123456"), false);
    assert.equal(payload.textContent.includes("123456"), true);
    assert.equal((request?.init?.headers as Record<string, string>)["api-key"], "test-brevo-key");
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("provider registry supports a second adapter without changing OTP business logic", async () => {
  const registry = new OtpDeliveryProviderRegistry();
  const fake = { name: "fake", channel: "EMAIL" as const, async send() { return { accepted: true }; } };
  registry.register(fake);
  assert.equal(registry.get("EMAIL", "fake"), fake);
  assert.equal(getOtpCapability("EMAIL").available, true);
});
