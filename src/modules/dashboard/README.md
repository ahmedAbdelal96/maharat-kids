# Dashboard module

The dashboard is a small operations view for the single store. Its query flow is:

`/admin` page → dashboard server query → `DashboardService` → `PrismaDashboardRepository`.

Aggregates are calculated in PostgreSQL. Revenue includes non-cancelled orders with
`PaymentStatus.PAID`; fulfillment status and payment status remain independent.
Access requires the existing `dashboard.view` permission.
