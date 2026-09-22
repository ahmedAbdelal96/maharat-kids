"use client";

import { useState, type FormEvent } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, CreditCard, MapPin, Sparkles, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProductImage } from "@/components/ecommerce/product-image";
import { formatMoney as formatMoneyBase } from "@/lib/formatters";
import { localeToIntl } from "@/config/locale";
import { formatCustomerAddress } from "@/modules/customers/address";
import { placeOrder, startOnlinePayment } from "../server/actions";
import type { CheckoutData } from "../types";

export function CheckoutClient({ data }: { data: CheckoutData }) {
  const router = useRouter();
  const locale = useLocale();
  const isAr = locale === "ar";
  const formatMoney = (amount: string | number, currencyCode = data.currency) => formatMoneyBase(amount, currencyCode, localeToIntl(locale === "en" ? "en" : "ar"));
  const reduceMotion = useReducedMotion();
  const [addressId, setAddressId] = useState(data.addresses.find((address) => address.isDefault)?.id ?? data.addresses[0]?.id ?? "");
  const [paymentMethodId, setPaymentMethodId] = useState(data.paymentMethods[0]?.id ?? "");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [checkoutToken] = useState(() => crypto.randomUUID());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const selectedAddressId = data.addresses.some((address) => address.id === addressId) ? addressId : data.addresses.find((address) => address.isDefault)?.id ?? data.addresses[0]?.id ?? "";
  const selectedAddress = data.addresses.find((item) => item.id === selectedAddressId);
  const selectedPayment = data.paymentMethods.find((item) => item.id === paymentMethodId);
  const shippingName = data.shippingQuote ? (locale === "ar" ? data.shippingQuote.carrierNameAr : data.shippingQuote.carrierNameEn) : null;
  const shippingAmount = data.shippingQuote?.amount ?? "0.00";
  const checkoutTotal = data.shippingQuote ? (Number(data.cart.subtotal) + Number(shippingAmount)).toFixed(2) : data.cart.subtotal;
  const digitalOnly = data.fulfillment === "DIGITAL_ONLY";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const result = await placeOrder({
      addressId: digitalOnly ? null : selectedAddressId,
      paymentMethodId,
      checkoutToken,
      paymentReference: selectedPayment?.type === "BANK_TRANSFER" || selectedPayment?.type === "MANUAL_TRANSFER" ? paymentReference : undefined,
      paymentNotes: selectedPayment?.type === "BANK_TRANSFER" || selectedPayment?.type === "MANUAL_TRANSFER" ? paymentNotes : undefined,
    });
    if (result.success) {
      if (selectedPayment?.type === "ONLINE_PAYMENT" || selectedPayment?.type === "ONLINE_GATEWAY") {
        const payment = await startOnlinePayment({ orderId: result.data.id, locale, idempotencyKey: checkoutToken });
        if (!payment.success) {
          setError(payment.error.message);
          setSubmitting(false);
          return;
        }
        window.location.assign(payment.data.checkoutUrl);
      } else {
        router.push(`/checkout/success?order=${encodeURIComponent(result.data.orderNumber)}`);
      }
    } else {
      setError(result.error.message);
      setSubmitting(false);
    }
  }

  if (!digitalOnly && data.addresses.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
            <MapPin className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold">{isAr ? "أضف عنوان توصيل أولاً" : "Add a delivery address first"}</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {isAr ? "اختر عنواناً محفوظاً أو أضف عنواناً جديداً من حسابك قبل إتمام الطلب." : "Choose a saved address or add one from your account before placing the order."}
          </p>
          <Link href="/account">
            <Button className="mt-5">{isAr ? "إدارة عناويني" : "Manage My Addresses"}</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (data.paymentMethods.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--warning-subtle)] text-[var(--warning)]">
            <CreditCard className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold">{isAr ? "لا توجد وسيلة دفع متاحة حالياً" : "No payment method is currently available"}</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{isAr ? "يرجى المحاولة لاحقاً." : "Please try again later."}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserRound className="h-4 w-4 text-[var(--primary)]" />
                <span>{isAr ? "معلومات العميل" : "Customer Information"}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{isAr ? "الاسم" : "Name"}</p>
                  <p className="mt-1 text-sm font-semibold">{data.customer.name || (isAr ? "عميل" : "Customer")}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{isAr ? "البريد الإلكتروني" : "Email"}</p>
                  <p className="mt-1 break-all text-sm font-semibold">{data.customer.email}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{isAr ? "رقم الهاتف" : "Phone"}</p>
                  <p className="mt-1 text-sm font-semibold">{data.customer.phone || (isAr ? "غير محدد" : "Not provided")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {!digitalOnly && (
          <motion.div initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-[var(--primary)]" />
                  <span>{isAr ? "عنوان الشحن" : "Shipping Address"}</span>
                  <Badge variant="outline" size="sm">
                    {data.market === "SAUDI_ARABIA" ? (isAr ? "المملكة العربية السعودية" : "Saudi Arabia") : (isAr ? "جمهورية مصر العربية" : "Egypt")}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.addresses.map((item) => (
                  <label
                    key={item.id}
                    className={`block cursor-pointer rounded-[var(--radius-md)] border p-4 transition-colors ${
                      item.id === selectedAddressId
                        ? "border-[var(--primary)] bg-[var(--primary-soft)]/30"
                        : "border-[var(--border)] hover:border-[var(--primary)]/50"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input type="radio" name="address" checked={item.id === selectedAddressId} onChange={() => setAddressId(item.id)} />
                      <span className="font-bold">{item.label}</span>
                      {item.verification === "VERIFIED" && <Badge variant="success" size="sm">{isAr ? "موثق" : "Verified"}</Badge>}
                      {item.isDefault && <Badge variant="secondary" size="sm">{isAr ? "افتراضي" : "Default"}</Badge>}
                    </span>
                    <span className="mt-2 block text-xs leading-5 text-[var(--text-secondary)]">
                      <strong className="text-[var(--text-primary)]">{item.recipientName}</strong> • {item.phone}
                      <br />
                      {formatCustomerAddress(item)}
                      {item.notes && (
                        <>
                          <br />
                          <span className="font-semibold text-[var(--text-primary)]">{isAr ? "ملاحظات:" : "Notes:"}</span> {item.notes}
                        </>
                      )}
                    </span>
                  </label>
                ))}
                <Link href="/account" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline">
                  <span>{isAr ? "إضافة أو تعديل عنوان في حسابي" : "Add or edit an address in My Account"}</span>
                  <ArrowRight className="h-3 w-3 rtl:rotate-180" />
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4 text-[var(--primary)]" />
                <span>{isAr ? "طريقة الدفع" : "Payment Method"}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.paymentMethods.map((method) => (
                <label
                  key={method.id}
                  className={`block cursor-pointer rounded-[var(--radius-md)] border p-4 transition-colors ${
                    method.id === paymentMethodId
                      ? "border-[var(--primary)] bg-[var(--primary-soft)]/30"
                      : "border-[var(--border)] hover:border-[var(--primary)]/50"
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <input type="radio" name="payment" checked={method.id === paymentMethodId} onChange={() => setPaymentMethodId(method.id)} />
                      <span className="font-bold">{method.name}</span>
                    </span>
                    <Badge variant="outline" size="sm">
                      {method.type === "CASH_ON_DELIVERY"
                        ? (isAr ? "الدفع عند الاستلام" : "Pay on delivery")
                        : method.type === "ONLINE_PAYMENT" || method.type === "ONLINE_GATEWAY"
                        ? (isAr ? "دفع إلكتروني آمن" : "Secure online payment")
                        : (isAr ? "تحويل بنكي" : "Bank transfer")}
                    </Badge>
                  </span>
                  {method.type === "CASH_ON_DELIVERY" ? (
                    <span className="mt-2 block text-xs text-[var(--text-secondary)]">
                      {isAr ? "ادفع نقداً عند استلام طلبك من المندوب." : "Pay when your order arrives."}
                    </span>
                  ) : method.type === "ONLINE_PAYMENT" || method.type === "ONLINE_GATEWAY" ? (
                    <span className="mt-2 block text-xs text-[var(--text-secondary)]">
                      {isAr ? `دفع آمن ومحمي عبر ${method.providerKey ?? "بوابة الدفع المعتمدة"}.` : `Secure payment via ${method.providerKey ?? "the configured provider"}.`}
                    </span>
                  ) : (
                    <span className="mt-2 block text-xs leading-5 text-[var(--text-secondary)]">
                      {method.bankAccount ? (
                        <>
                          <strong>{locale === "ar" ? method.bankAccount.bankNameAr : method.bankAccount.bankNameEn}</strong>
                          <br />
                          IBAN: <strong>{method.bankAccount.iban}</strong>
                          {(locale === "ar" ? method.bankAccount.instructionsAr : method.bankAccount.instructionsEn) && (
                            <>
                              <br />
                              {locale === "ar" ? method.bankAccount.instructionsAr : method.bankAccount.instructionsEn}
                            </>
                          )}
                        </>
                      ) : (
                        isAr ? "بيانات التحويل البنكي غير متوفرة حالياً." : "Bank transfer details are currently unavailable."
                      )}
                    </span>
                  )}
                  {method.id === paymentMethodId && (method.type === "BANK_TRANSFER" || method.type === "MANUAL_TRANSFER") && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <span className="text-xs font-semibold">
                        {isAr ? "رقم الحوالة أو المرجع" : "Transfer reference"}
                        <Input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder={isAr ? "اختياري" : "Optional"} />
                      </span>
                      <span className="text-xs font-semibold">
                        {isAr ? "ملاحظة الدفع" : "Payment note"}
                        <Input value={paymentNotes} onChange={(event) => setPaymentNotes(event.target.value)} placeholder={isAr ? "اختياري" : "Optional"} />
                      </span>
                    </div>
                  )}
                </label>
              ))}
            </CardContent>
          </Card>
        </motion.div>
        {error && <p role="alert" className="rounded-[var(--radius-md)] bg-[var(--destructive-subtle)] px-3 py-2 text-xs text-[var(--destructive)]">{error}</p>}
      </div>

      <Card className="lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Check className="h-4 w-4 text-[var(--primary)]" />
            <span>{isAr ? "مراجعة الطلب النهائية" : "Final Review"}</span>
          </CardTitle>
          <p className="text-xs text-[var(--text-secondary)]">
            {isAr ? "راجع منتجاتك، العنوان، وطريقة الدفع قبل تأكيد الطلب." : "Review your items, address, and payment before placing the order."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {data.cart.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 text-xs">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-md)]">
                  <ProductImage src={item.imageUrl ?? undefined} alt={item.name} aspectRatio="square" />
                </div>
                <span className="min-w-0 flex-1 truncate text-[var(--text-secondary)]">{item.name} × {item.quantity}</span>
                <span className="font-semibold">{formatMoney(item.lineTotal, data.currency)}</span>
              </div>
            ))}

            {data.cart.giftItems?.map((gift) => (
              <div key={`gift-${gift.productId}`} className="flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--surface-muted)]/50 p-2 text-xs">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-md)]">
                  <ProductImage src={gift.imageUrl ?? undefined} alt={gift.name} aspectRatio="square" />
                  <span className="absolute top-0.5 start-0.5 rounded bg-[var(--accent)] px-1 text-[8px] font-bold text-[var(--accent-foreground)]">GIFT</span>
                </div>
                <div className="min-w-0 flex-1 truncate">
                  <span className="font-semibold text-[var(--text-primary)]">{gift.name} × {gift.quantity}</span>
                  <span className="block text-[10px] text-[var(--success)]">{gift.promotionName}</span>
                </div>
                <span className="font-bold text-[var(--success)]">{isAr ? "مجاناً" : "FREE"}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-[var(--border)] pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">{isAr ? "المجموع الفرعي" : "Subtotal"}</span>
              <span className="font-bold">{formatMoney(data.cart.originalSubtotal, data.currency)}</span>
            </div>
            {Number(data.cart.discountAmount) > 0 && (
              <div className="flex justify-between text-xs text-[var(--primary)] font-semibold">
                <span className="flex items-center gap-1 truncate max-w-[200px]">
                  <Sparkles className="h-3 w-3 shrink-0" />
                  {data.cart.appliedPromotion?.promotionName || (isAr ? "خصم العرض" : "Offer Discount")}
                </span>
                <span>-{formatMoney(data.cart.discountAmount, data.currency)}</span>
              </div>
            )}
            {Number(data.cart.couponDiscount) > 0 && data.cart.coupon && (
              <div className="flex justify-between text-xs font-semibold text-[var(--accent)]">
                <span>{data.cart.coupon.code}</span>
                <span>-{formatMoney(data.cart.couponDiscount, data.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-[var(--text-secondary)]">
              <span className="flex flex-col">
                <span>{digitalOnly ? (isAr ? "توصيل رقمي" : "Digital delivery") : (isAr ? "رسوم الشحن" : "Shipping fee")}</span>
                {shippingName && <span className="text-[10px] text-[var(--text-muted)]">{shippingName}</span>}
              </span>
              <span>{formatMoney(shippingAmount, data.currency)}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--border)] pt-3 text-base font-extrabold">
              <span>{isAr ? "الإجمالي النهائي" : "Total"}</span>
              <span className="text-[var(--primary)]">{formatMoney(checkoutTotal, data.currency)}</span>
            </div>
          </div>

          <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3 text-xs text-[var(--text-secondary)]">
            <p className="font-semibold text-[var(--text-primary)]">
              {digitalOnly
                ? (isAr ? "منتج رقمي: سيتاح التحميل في مكتبتك فور تأكيد الدفع" : "Digital product: available after payment confirmation")
                : (isAr ? `الشحن إلى: ${selectedAddress ? formatCustomerAddress(selectedAddress) : "العنوان المحدد"}` : `Delivering to ${selectedAddress ? formatCustomerAddress(selectedAddress) : "your selected address"}`)}
            </p>
            <p className="mt-1">{selectedPayment?.name ?? (isAr ? "حدد وسيلة الدفع" : "Select a payment method")}</p>
          </div>
          <Button type="submit" className="w-full font-bold" isLoading={submitting}>
            {isAr ? "تأكيد وإتمام الطلب" : "Place Order"}
          </Button>
          <p className="text-center text-[11px] text-[var(--text-muted)]">
            {isAr ? "تُؤكد الأسعار والإجماليات على الخادم بأمان عند تقديم الطلب." : "Prices and totals are confirmed on the server at checkout."}
          </p>
        </CardContent>
      </Card>
    </form>
  );
}
