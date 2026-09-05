import "server-only";

import type { AuditChanges, AuditMetadata, AuditValue } from "../types";

const sensitiveKey = /(password|token|secret|cookie|api.?key|credential|hash|code)/i;
const maxStringLength = 500;

function safeValue(value: AuditValue, depth = 0): AuditValue {
  if (typeof value === "string") return value.slice(0, maxStringLength);
  if (depth >= 3) return "[nested value omitted]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => safeValue(item, depth + 1));
  return value && typeof value === "object"
    ? Object.fromEntries(Object.entries(value).filter(([key]) => !sensitiveKey.test(key)).slice(0, 30).map(([key, item]) => [key, safeValue(item, depth + 1)]))
    : value;
}

export function sanitizeAuditChanges(changes?: AuditChanges | null): AuditChanges | null {
  if (!changes) return null;
  return { fields: changes.fields.filter((field) => field.field && !sensitiveKey.test(field.field)).slice(0, 30).map((field) => ({ ...field, field: field.field.slice(0, 80), before: safeValue(field.before), after: safeValue(field.after) })) };
}

export function sanitizeAuditMetadata(metadata?: AuditMetadata | null): AuditMetadata | null {
  if (!metadata) return null;
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => !sensitiveKey.test(key)).slice(0, 30).map(([key, value]) => [key.slice(0, 80), safeValue(value)]));
}
