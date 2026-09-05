# Shipping Operations

Shipping is the operational layer for outbound orders in the single-store
template. `ShippingCompany` and `OrderShipment` keep physical parcel state
separate from commercial order state, payment state, and carrier COD
settlement state.

The domain service enforces status transitions and permissions. The Prisma
repository performs shipment, order-status synchronization, notification,
payment settlement, and inventory-return work transactionally where those
records share one database transaction.

The admin entry points are `/admin/shipping` and `/admin/shipping/[id]`.
