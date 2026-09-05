# Production Operations

## Logging and incident correlation

Application logs are structured JSON with a timestamp, level, message, and context. Unexpected failures should include a `requestId` and an `errorId`; the client receives only the correlation identifiers and a safe message. The logger redacts passwords, reset codes, tokens, cookies, authorization headers, secrets, database URLs, and email addresses before writing context.

The current rate limiter is process-local and protects login, registration, password reset, and password changes. It is suitable for the single-instance template deployment. A multi-instance deployment must move the limiter to a shared store or edge gateway before relying on it as a global control.

Development password-reset delivery does not log the reset code. Configure a real email provider before production. Do not enable verbose or request-body logging in production.

## Health checks

`GET /api/health` performs a minimal database connectivity check and returns only `status`, `requestId`, and (on failure) `errorId`. It never returns connection details, environment variables, or database errors.

## Monitoring

The project does not install a monitoring SDK by default. If Sentry or another provider is introduced, connect it at the `logUnexpectedError` boundary and preserve the existing redaction and safe-client-error rules.
