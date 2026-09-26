import "server-only";

import { env } from "@/config/env";
import { logger } from "@/server/logger";

export type OtpChannel = "EMAIL" | "SMS";
export type OtpLocale = "ar" | "en";

export type OtpDeliveryRequest = Readonly<{
  channel: OtpChannel;
  destination: string;
  otp: string;
  locale: OtpLocale;
  purpose: "LOGIN";
  expiresInMinutes: number;
  correlationId?: string;
}>;

export type OtpDeliveryResult = Readonly<{
  accepted: boolean;
  providerMessageId?: string;
}>;

export class OtpDeliveryUnavailableError extends Error {
  constructor(message = "OTP_DELIVERY_UNAVAILABLE") {
    super(message);
    this.name = "OtpDeliveryUnavailableError";
  }
}

export class OtpDeliveryRejectedError extends Error {
  constructor(message = "OTP_DELIVERY_REJECTED") {
    super(message);
    this.name = "OtpDeliveryRejectedError";
  }
}

export class OtpProviderConfigurationError extends Error {
  constructor(message = "OTP_PROVIDER_CONFIGURATION_INVALID") {
    super(message);
    this.name = "OtpProviderConfigurationError";
  }
}

export interface OtpDeliveryProvider {
  readonly name: string;
  readonly channel: OtpChannel;
  send(request: OtpDeliveryRequest): Promise<OtpDeliveryResult>;
}

export interface EmailOtpProvider extends OtpDeliveryProvider {
  readonly channel: "EMAIL";
}

export interface SmsOtpProvider extends OtpDeliveryProvider {
  readonly channel: "SMS";
}

export class OtpDeliveryProviderRegistry {
  private readonly providers = new Map<string, OtpDeliveryProvider>();

  register(provider: OtpDeliveryProvider): this {
    this.providers.set(`${provider.channel}:${provider.name}`.toLowerCase(), provider);
    return this;
  }

  get(channel: OtpChannel, name: string | undefined): OtpDeliveryProvider | undefined {
    return name ? this.providers.get(`${channel}:${name}`.toLowerCase()) : undefined;
  }
}

const BREVO_DEFAULT_API_URL = "https://api.brevo.com/v3/smtp/email";
const DELIVERY_TIMEOUT_MS = 10_000;
function validHttpsUrl(value: string | undefined): boolean { return !value || /^https:\/\//i.test(value); }

function maskDestination(destination: string, channel: OtpChannel): string {
  if (channel === "EMAIL") {
    const [local, domain] = destination.split("@", 2);
    if (!domain) return "***";
    return `${local.slice(0, 1)}***@${domain}`;
  }
  return destination.length > 6 ? `${destination.slice(0, 6)}*****${destination.slice(-3)}` : "***";
}

function localizedEmail(request: OtpDeliveryRequest) {
  if (request.locale === "ar") {
    return {
      subject: "رمز تسجيل الدخول إلى مهارة طفل",
      text: `مهارة طفل\n\nرمز تسجيل الدخول\n\nرمز التحقق الخاص بك: ${request.otp}\n\nالرمز صالح لمدة ${request.expiresInMinutes} دقائق.\n\nإذا لم تطلب هذا الرمز يمكنك تجاهل الرسالة.\n\nنتعلم • نلعب • نتطور`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7;color:#172033"><h1>مهارة طفل</h1><h2>رمز تسجيل الدخول</h2><p>رمز التحقق الخاص بك:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${request.otp}</p><p>الرمز صالح لمدة ${request.expiresInMinutes} دقائق.</p><p>إذا لم تطلب هذا الرمز يمكنك تجاهل الرسالة.</p><p>نتعلم • نلعب • نتطور</p></div>`,
    };
  }
  return {
    subject: "Your Maharat Kids verification code",
    text: `Maharat Kids\n\nYour sign-in verification code\n\n${request.otp}\n\nThis code expires in ${request.expiresInMinutes} minutes.\n\nIf you did not request this code, you can ignore this email.\n\nLearn • Play • Grow`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.7;color:#172033"><h1>Maharat Kids</h1><h2>Your sign-in verification code</h2><p>Your verification code is:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${request.otp}</p><p>This code expires in ${request.expiresInMinutes} minutes.</p><p>If you did not request this code, you can ignore this email.</p><p>Learn • Play • Grow</p></div>`,
  };
}

export class BrevoEmailOtpProvider implements EmailOtpProvider {
  readonly name = "brevo";
  readonly channel = "EMAIL" as const;

  async send(request: OtpDeliveryRequest): Promise<OtpDeliveryResult> {
    if (!env.CUSTOMER_OTP_EMAIL_API_KEY || !env.EMAIL_FROM || !validHttpsUrl(env.CUSTOMER_OTP_EMAIL_API_URL)) throw new OtpProviderConfigurationError();
    const content = localizedEmail(request);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
    const startedAt = Date.now();
    try {
      const sender = env.EMAIL_FROM.match(/^(.*)\s*<([^>]+)>$/);
      const response = await fetch(env.CUSTOMER_OTP_EMAIL_API_URL ?? BREVO_DEFAULT_API_URL, {
        method: "POST",
        headers: { "api-key": env.CUSTOMER_OTP_EMAIL_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ sender: sender ? { name: sender[1].trim(), email: sender[2] } : { email: env.EMAIL_FROM }, to: [{ email: request.destination }], subject: content.subject, textContent: content.text, htmlContent: content.html }),
        signal: controller.signal,
      });
      if (!response.ok) throw new OtpDeliveryRejectedError();
      const data = await response.json().catch(() => ({})) as { messageId?: string };
      logger.info("OTP delivery completed", { channel: request.channel, provider: this.name, destination: maskDestination(request.destination, request.channel), accepted: true, latencyMs: Date.now() - startedAt, providerMessageId: data.messageId });
      return { accepted: true, providerMessageId: data.messageId };
    } catch (error) {
      const normalized = error instanceof OtpDeliveryRejectedError ? error : new OtpDeliveryUnavailableError(error instanceof Error && error.name === "AbortError" ? "OTP_DELIVERY_TIMEOUT" : "OTP_DELIVERY_UNAVAILABLE");
      logger.warn("OTP delivery failed", { channel: request.channel, provider: this.name, destination: maskDestination(request.destination, request.channel), reason: normalized.message, latencyMs: Date.now() - startedAt });
      throw normalized;
    } finally {
      clearTimeout(timeout);
    }
  }
}

class ConsoleOtpProvider implements OtpDeliveryProvider {
  readonly name = "console";
  readonly channel: OtpChannel;
  constructor(channel: OtpChannel) { this.channel = channel; }
  async send(request: OtpDeliveryRequest): Promise<OtpDeliveryResult> {
    logger.info("Development OTP delivery accepted", { channel: request.channel, provider: this.name, destination: maskDestination(request.destination, request.channel), expiresInMinutes: request.expiresInMinutes });
    return { accepted: true };
  }
}

class UnavailableOtpProvider implements OtpDeliveryProvider {
  readonly name = "unavailable";
  constructor(readonly channel: OtpChannel) {}
  async send(): Promise<OtpDeliveryResult> { throw new OtpDeliveryUnavailableError(); }
}

function configuredProvider(channel: OtpChannel): string | undefined {
  return channel === "EMAIL" ? env.CUSTOMER_OTP_EMAIL_PROVIDER : env.CUSTOMER_OTP_SMS_PROVIDER;
}

export function getOtpDeliveryProvider(channel: OtpChannel, registry?: OtpDeliveryProviderRegistry): OtpDeliveryProvider {
  const configured = configuredProvider(channel)?.trim().toLowerCase();
  const registered = registry?.get(channel, configured);
  if (registered) return registered;
  if (configured === "brevo" && channel === "EMAIL") return new BrevoEmailOtpProvider();
  if (configured === "console" && env.NODE_ENV !== "production") return new ConsoleOtpProvider(channel);
  if (!configured && env.NODE_ENV !== "production") return new ConsoleOtpProvider(channel);
  if (configured) logger.warn("OTP provider is unavailable", { channel, provider: configured });
  return new UnavailableOtpProvider(channel);
}

export function getOtpCapability(channel: OtpChannel): { available: boolean; provider?: string; reason?: string } {
  const provider = configuredProvider(channel)?.trim().toLowerCase();
  if (!provider && env.NODE_ENV !== "production") return { available: true, provider: "console" };
  if (provider === "console") return env.NODE_ENV === "production" ? { available: false, provider, reason: "development-provider-disabled" } : { available: true, provider };
  if (channel === "EMAIL" && provider === "brevo" && env.CUSTOMER_OTP_EMAIL_API_KEY && env.EMAIL_FROM && validHttpsUrl(env.CUSTOMER_OTP_EMAIL_API_URL)) return { available: true, provider };
  return { available: false, provider, reason: provider ? "incomplete-or-unsupported" : "not-configured" };
}
