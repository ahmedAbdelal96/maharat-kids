# Returns & Refunds

This module handles post-delivery customer returns. It is intentionally separate from Phase 23 carrier delivery failures.

`ReturnRequest` owns the customer-return lifecycle; `ReturnItem` keeps requested, approved, received, and restocked quantities distinct; `Refund` records the later manual money movement. Customer ownership is derived from the authenticated session, while admin operations are protected by `returns.view`, `returns.manage`, and `payments.refund`.

Physical receipt and inventory restoration are transactional and idempotent at the request level. Refund completion is a separate transaction that updates payment status and history. No gateway refund, exchange, store credit, return media, or reverse-carrier integration is included.
