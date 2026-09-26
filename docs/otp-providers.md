# Customer OTP providers

Maharat Kids owns the complete OTP lifecycle. The backend generates a six-digit code with `crypto.randomInt`, stores only an HMAC-SHA-256 digest using `AUTH_SECRET`, enforces the shared expiry/cooldown/attempt policy, and atomically consumes a successful challenge. Providers only transport the already-generated code; they never generate or verify it.

## Routing

Market is resolved by the trusted backend market resolver, not by locale or a client-supplied channel:

- `EGYPT` + `EMAIL` identity → email OTP.
- `SAUDI_ARABIA` + `PHONE` identity → SMS OTP.

Arabic and English only select message copy. They do not change the channel.

## Registered providers

`CUSTOMER_OTP_EMAIL_PROVIDER=brevo` enables the Brevo transactional email adapter when `CUSTOMER_OTP_EMAIL_API_KEY` and `EMAIL_FROM` are complete. `CUSTOMER_OTP_EMAIL_API_URL` is optional and defaults to Brevo's SMTP API endpoint.

Development and tests may use `console`; Production rejects it and fails closed. Saudi SMS intentionally has no production adapter until a vendor is selected.

## Adding a provider

1. Implement `OtpDeliveryProvider` (or the channel-specific `EmailOtpProvider` / `SmsOtpProvider`) in `src/modules/auth/providers`.
2. Register the adapter in the provider registry/factory without changing `CustomerOtpService` or verification code.
3. Add optional environment capability checks without making storefront boot depend on the provider.
4. Add mocked provider tests for payload, timeout, rejection normalization, and secret redaction.

The normalized request contains `channel`, canonical `destination`, backend-generated `otp`, `locale`, `purpose`, expiry minutes, and an optional correlation ID. An adapter must not query Prisma or log the OTP, destination in full, API key, or authorization headers.

## Failure and retry rules

Delivery uses one bounded request with a 10-second timeout. A failed delivery invalidates the persisted challenge, while its cooldown and persistent rate limit remain in force. There is no provider retry loop and no production console fallback.
