# ADR 026: Post-delivery returns and manual refunds

## Status

Accepted for the single-store ecommerce template.

## Decision

Customer returns are modeled separately from Phase 23 carrier delivery
failures. A return belongs to a delivered or completed order and owns an
explicit lifecycle: `REQUESTED`, `APPROVED`, `RETURNING`, `RECEIVED`, and
`COMPLETED`, with rejection and customer cancellation terminal paths.

`ReturnItem` stores requested, approved, received, and restocked quantities
independently. The server validates each transition and quantity, derives
ownership from the authenticated customer session, and only restores the
historical inventory amount that the store marks as restockable. Receiving is
transactional and cannot restore stock a second time.

Refunds are deliberately separate from physical receipt. A received return
creates one pending `Refund`; an administrator with `payments.refund` records
the manual method, reference, and completion. The `RefundCalculator` uses
immutable `OrderItem` prices and the order's promotion discount allocation;
current catalog prices and compare-at prices are never used. Shipping is not
automatically refunded in this phase.

## Policy and permissions

The store controls `returns.enabled`, `returns.windowDays`, and optional
customer-facing policy text through existing Store Settings. The delivery
timestamp comes from `OrderShipment.deliveredAt` or the delivered status
history, never from order creation time. Admin queue access uses `returns.view`,
return operations use `returns.manage`, and completing money movement uses
`payments.refund`.

## Scope boundaries

This phase does not add gateway refund APIs, exchanges, store credit, reverse
shipping, return photos, email/SMS/WhatsApp notifications, or a generic policy
engine. Customer-facing lifecycle updates reuse the existing in-app
notification service.
