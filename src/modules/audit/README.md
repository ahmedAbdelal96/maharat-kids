# Admin Audit Log

This module is an append-only, administrator-focused activity trail for successful business mutations. It stores actor and entity snapshots, controlled field changes, and safe operational metadata. Customers, page views, searches, automatic calculations, and failed operations are intentionally excluded.

Audit writes are server-only. Callers must resolve the actor from the authenticated admin context and provide explicit safe change fields. Audit records have no edit, delete, or clear operation.
