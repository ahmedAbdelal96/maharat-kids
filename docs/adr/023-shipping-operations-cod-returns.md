# ADR 023: Shipping operations, COD settlement, and returns

## Decision

The single-store application keeps four operational truths separate:

- `Order.status` describes the commercial order lifecycle.
- `OrderShipment.status` describes the physical parcel lifecycle.
- `Order.paymentStatus` describes customer payment collection.
- `PaymentSettlement` describes money still owed by a carrier to the store.

One order has at most one operational shipment. Shipping companies are
admin-managed records with no external API credentials, pricing engine, fleet,
or branch model.

## Transition and inventory rules

Shipment transitions are checked in the shipping domain and repeated in the
transactional repository operation. Handover requires an active assigned
company. Failed delivery requires a controlled reason. Inventory is restored
only when a shipment reaches `RETURNED_TO_STORE`; `inventoryRestoredAt` makes
that operation idempotent. Cancelling an order after carrier handover does not
restore stock early.

## COD reconciliation

Delivery marks a COD order paid and creates or preserves its existing pending
`PaymentSettlement`. A `CarrierSettlementBatch` records the carrier's actual
receipt and contains selected `CarrierSettlementItem` rows. The server derives
eligible orders and expected amounts, and the unique order item prevents a
second settlement.

## Access and future integration

Viewing and operating shipments use `shipping.view` and `shipping.update`.
Receiving carrier money uses the existing `payments.settle` permission.
Customers see delivery updates through the existing notification system but
never see carrier receivables. External carrier adapters can be added later
without changing this internal operational model.
