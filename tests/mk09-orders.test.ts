import assert from "node:assert/strict";
import { test } from "node:test";
import { canTransitionOrder, allowedOrderTransitionsFor } from "../src/modules/orders/domain/rules";

test("central order authority keeps order, payment, and shipping states separate", () => {
  assert.equal(canTransitionOrder({ current: "PENDING", next: "CONFIRMED", paymentStatus: "UNPAID", paymentMethodType: "CASH_ON_DELIVERY", fulfillment: "PHYSICAL_ONLY", hasShipment: false }), true);
  assert.equal(canTransitionOrder({ current: "CONFIRMED", next: "PROCESSING", paymentStatus: "UNPAID", paymentMethodType: "CASH_ON_DELIVERY", fulfillment: "PHYSICAL_ONLY", hasShipment: false }), true);
  assert.equal(canTransitionOrder({ current: "CONFIRMED", next: "PROCESSING", paymentStatus: "PENDING", paymentMethodType: "ONLINE_PAYMENT", fulfillment: "PHYSICAL_ONLY", hasShipment: false }), false);
  assert.equal(canTransitionOrder({ current: "CANCELLED", next: "PROCESSING", paymentStatus: "UNPAID", paymentMethodType: "CASH_ON_DELIVERY", fulfillment: "PHYSICAL_ONLY", hasShipment: false }), false);
  assert.equal(canTransitionOrder({ current: "DELIVERED", next: "PROCESSING", paymentStatus: "PAID", paymentMethodType: "ONLINE_PAYMENT", fulfillment: "PHYSICAL_ONLY", hasShipment: true }), false);
});

test("digital orders have no courier transitions and complete only after trusted payment", () => {
  assert.equal(canTransitionOrder({ current: "PENDING", next: "CONFIRMED", paymentStatus: "PENDING", paymentMethodType: "ONLINE_PAYMENT", fulfillment: "DIGITAL_ONLY", hasShipment: false }), false);
  assert.equal(canTransitionOrder({ current: "CONFIRMED", next: "COMPLETED", paymentStatus: "PAID", paymentMethodType: "ONLINE_PAYMENT", fulfillment: "DIGITAL_ONLY", hasShipment: false }), true);
  assert.equal(canTransitionOrder({ current: "CONFIRMED", next: "SHIPPED", paymentStatus: "PAID", paymentMethodType: "ONLINE_PAYMENT", fulfillment: "DIGITAL_ONLY", hasShipment: false }), false);
  assert.deepEqual(allowedOrderTransitionsFor({ current: "CANCELLED", paymentStatus: "PAID", paymentMethodType: "ONLINE_PAYMENT", fulfillment: "DIGITAL_ONLY", hasShipment: false }), []);
});

test("paid cancellation remains a commercial status change and never a refund", () => {
  assert.equal(canTransitionOrder({ current: "PROCESSING", next: "CANCELLED", paymentStatus: "PAID", paymentMethodType: "ONLINE_PAYMENT", fulfillment: "MIXED", hasShipment: true }), true);
});
