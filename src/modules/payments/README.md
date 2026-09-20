# Payments

Payment methods are stable commerce concepts (`CASH_ON_DELIVERY`, `ONLINE_PAYMENT`, and `BANK_TRANSFER`) with market-scoped availability. Historical orders snapshot method, provider, market, currency, amount, and bank instructions at creation time.

Payzaty is an adapter behind `ONLINE_PAYMENT`, not an order-domain concept. The adapter uses the official hosted-checkout contract: `POST {base}/checkout` with `X-AccountNo` and `X-SecretKey`, returning `checkout_id` and `checkout_url`. Status verification remains fail-closed until a merchant supplies the documented status endpoint through `PAYZATY_STATUS_ENDPOINT`; no undocumented webhook signature or URL is guessed.

Production prerequisites: `PAYZATY_ACCOUNT_NO`, `PAYZATY_SECRET_KEY`, a verified `PAYZATY_STATUS_ENDPOINT`, and durable private object storage for receipt proofs. Development acceptance can use `DevelopmentPaymentProvider`; it cannot activate in production. Receipt proofs are stored outside `public/` locally and must use private object storage before a multi-instance production deployment.
