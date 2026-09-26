const LEGACY_PUBLIC_PREFIXES = [
  ["demo-catalog/source/", "demo-catalog/products/"],
  ["/demo-catalog/source/", "demo-catalog/products/"],
  ["uploads/demo-catalog/source/", "demo-catalog/products/"],
  ["/uploads/demo-catalog/source/", "demo-catalog/products/"],
  ["uploads/demo-catalog/digital-covers/", "demo-catalog/digital-covers/"],
  ["/uploads/demo-catalog/digital-covers/", "demo-catalog/digital-covers/"],
  ["uploads/categories/", "seed-catalog/categories/"],
  ["/uploads/categories/", "seed-catalog/categories/"],
  ["uploads/products/", "seed-catalog/products/"],
  ["/uploads/products/", "seed-catalog/products/"],
] as const;

const SEED_PREFIXES = ["demo-catalog/products/", "demo-catalog/digital-covers/", "seed-catalog/categories/", "seed-catalog/products/"] as const;

export function canonicalSeedKey(value: string | null | undefined): string | null {
  const raw = value?.trim() ?? "";
  if (!raw || raw.includes("\\") || /^[a-zA-Z]:[\\/]/.test(raw) || /^file:/i.test(raw) || /^https?:\/\//i.test(raw)) return null;
  const normalized = raw.replace(/^\/+/, "");
  for (const [legacyPrefix, canonicalPrefix] of LEGACY_PUBLIC_PREFIXES) {
    if (raw.startsWith(legacyPrefix)) return `${canonicalPrefix}${raw.slice(legacyPrefix.length)}`;
    if (normalized.startsWith(legacyPrefix.replace(/^\/+/, ""))) return `${canonicalPrefix}${normalized.slice(legacyPrefix.replace(/^\/+/, "").length)}`;
  }
  return isSeedMediaPath(normalized) ? normalized : null;
}

export function isSeedMediaPath(value: string): boolean {
  return SEED_PREFIXES.some((prefix) => value.startsWith(prefix)) && !value.includes("..") && !value.includes("\\");
}

export function mimeTypeForKey(key: string): string {
  const extension = key.toLowerCase().split(".").pop();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "svg") return "image/svg+xml";
  if (extension === "pdf") return "application/pdf";
  throw new Error(`UNSUPPORTED_SEED_MEDIA_TYPE:${key}`);
}

export function isDemoPrivatePdfKey(key: string): boolean {
  return /^digital-assets\/00000000-0000-4000-8000-00000000000[1-4]\/[^/]+\.pdf$/i.test(key);
}

export function checksum(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
import { createHash } from "node:crypto";
