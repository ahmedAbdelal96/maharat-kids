import "server-only";
import { failure } from "@/core/result";
import { AppError } from "@/core/errors";
import { requireAuthenticatedUser, requireCustomer } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";
import { getPublicStoreSettings } from "@/modules/store/server/queries";
import { revalidateCurrentCart } from "@/modules/cart/server/queries";
import { getCustomerAccountData } from "@/modules/customers/server/queries";
import { resolveMarket } from "@/modules/market/server/resolver";
import { getAvailablePaymentMethods } from "@/modules/payments/server/queries";
import { resolveShippingQuote, ShippingQuoteError } from "@/modules/shipping/domain/quote";
import { OrderService } from "../domain/service";
import { PrismaOrderRepository } from "../infrastructure/repository";

function service() { return new OrderService(new PrismaOrderRepository(), new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository())); }
export async function getCheckoutData() { const actor = await requireCustomer(); if (!actor.success) return failure(actor.error); const market = await resolveMarket(); const [cart, account, methods, settings] = await Promise.all([revalidateCurrentCart(), getCustomerAccountData(market.market), getAvailablePaymentMethods(), getPublicStoreSettings()]); if (!cart.success) return failure(cart.error); if (!account.success) return failure(account.error); if (!methods.success) return failure(methods.error); if (!settings.success) return failure(settings.error); let shippingQuote: { carrierNameAr: string; carrierNameEn: string; amount: string; currency: "SAR" | "EGP"; source: "ADMIN_CONFIGURED" } | null = null; const selectedAddress = account.data.addresses.find((address) => address.isDefault) ?? account.data.addresses[0]; if (selectedAddress) { try { const quote = await resolveShippingQuote({ market: market.market, address: selectedAddress }); shippingQuote = { carrierNameAr: quote.carrierNameAr, carrierNameEn: quote.carrierNameEn, amount: quote.amount.toFixed(2), currency: quote.currency, source: quote.source }; } catch (error) { if (error instanceof ShippingQuoteError) return failure(new AppError(error.code, error.code === "SHIPPING_UNAVAILABLE" || error.code === "SHIPPING_CONFIGURATION_AMBIGUOUS" ? "Shipping is currently unavailable. Please try again later." : "Please select a delivery address for the current market.")); throw error; } } return { success: true as const, data: { cart: cart.data, customer: { name: account.data.profile.name, email: account.data.profile.email, phone: account.data.profile.phone }, addresses: account.data.addresses, paymentMethods: methods.data, currency: market.configuration.currency, market: market.market, shippingQuote } }; }
export async function getCustomerOrders() { const actor = await requireCustomer(); return actor.success ? service().getCustomerOrders(actor.data.user.id) : failure(actor.error); }
export async function getCustomerOrder(orderNumber: string) { const actor = await requireCustomer(); return actor.success ? service().getCustomerOrder(actor.data.user.id, orderNumber) : failure(actor.error); }
export async function getAdminOrders() { const actor = await requireAuthenticatedUser(); return actor.success ? service().getAdminOrders(actor.data.user.id) : failure(actor.error); }
export async function getAdminOrder(orderId: string) { const actor = await requireAuthenticatedUser(); return actor.success ? service().getAdminOrder(actor.data.user.id, orderId) : failure(actor.error); }
