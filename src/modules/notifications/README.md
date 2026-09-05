# Customer Notifications

This module owns private, in-app notifications for storefront customers. Order and payment domain services create immutable text snapshots with deterministic dedupe keys. Customer reads and mutations derive ownership from the authenticated session and never accept a browser-supplied user id.

This foundation intentionally excludes email, SMS, push, realtime delivery, marketing campaigns, and administration notification management.
