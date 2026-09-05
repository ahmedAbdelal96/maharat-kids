import type { OrderStatus, PaymentStatus, ShipmentStatus } from "@prisma/client";
import type { CustomerAddress } from "@/modules/customers/types";
import type { Cart } from "@/modules/cart/types";
import type { PaymentMethod } from "@/modules/payments/types";

export type AddressSnapshot = Pick<CustomerAddress, "label" | "recipientName" | "phone" | "country" | "governorate" | "city" | "area" | "street" | "building" | "floor" | "apartment" | "postalCode" | "notes">;
export type OrderPromotionSnapshot = { id: string; promotionId: string | null; promotionName: string; promotionType: string; discountAmount: string; ruleSnapshot: Record<string, unknown> };
export type OrderCouponSnapshot = { id: string; couponId: string | null; couponCode: string; couponName: string; couponType: string; configuredValue: string; actualDiscountAmount: string; minimumSubtotalSnapshot: string; combinationSnapshot: Record<string, unknown> };
export type OrderItem = { id: string; productId: string; variantId: string | null; name: string; imageUrl: string | null; unitPrice: string; quantity: number; lineTotal: string; isPromotionGift: boolean; promotionId?: string | null };
export type OrderStatusHistory = { id: string; oldStatus: OrderStatus | null; newStatus: OrderStatus; changedByUserId: string; changedByName: string | null; changedByEmail: string; note: string | null; createdAt: string };
export type PaymentStatusHistory = { id: string; oldStatus: PaymentStatus | null; newStatus: PaymentStatus; changedByUserId: string; changedByName: string | null; changedByEmail: string; note: string | null; createdAt: string };
export type PaymentSettlement = { id: string; orderId: string; amount: string; status: "PENDING_SETTLEMENT" | "SETTLED"; settledByUserId: string | null; settledByName: string | null; settledByEmail: string | null; settledAt: string | null; note: string | null };
export type OrderSummary = { id: string; orderNumber: string; customerId: string; customerName: string | null; customerEmail: string; customerPhone: string | null; status: OrderStatus; paymentStatus: PaymentStatus; paymentMethodCode: string; paymentMethodName: string; currency: string; subtotal: string; promotionDiscount: string; couponDiscount: string; shippingAmount: string; total: string; createdAt: string; shippingCompanyName: string | null; shippingStatus: ShipmentStatus | null; trackingNumber: string | null; promotion: OrderPromotionSnapshot | null; coupon: OrderCouponSnapshot | null };
export type OrderDetails = OrderSummary & { shippingAddress: AddressSnapshot; paidAt: string | null; paymentReference: string | null; paymentNotes: string | null; items: OrderItem[]; history: OrderStatusHistory[]; paymentHistory: PaymentStatusHistory[]; settlement: PaymentSettlement | null; paymentDestination: string | null; paymentInstructions: string | null; confirmationWhatsApp: string | null };
export type CheckoutData = {
  cart: Cart;
  customer: { name: string | null; email: string; phone: string | null };
  addresses: CustomerAddress[];
  paymentMethods: PaymentMethod[];
  currency: string;
};
