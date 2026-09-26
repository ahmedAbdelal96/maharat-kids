const STATIC_MEDIA_PREFIXES = [
  ["/uploads/demo-catalog/source/", "/demo-catalog/products/"],
  ["/uploads/demo-catalog/digital-covers/", "/demo-catalog/digital-covers/"],
  ["/uploads/categories/", "/seed-catalog/categories/"],
  ["/uploads/products/", "/seed-catalog/products/"],
] as const;

/** Resolve repository-owned public media without making it depend on object storage. */
export function resolvePublicMediaUrl(value: string | null | undefined): string {
  const raw = value?.trim() ?? "";
  if (!raw || raw.includes("\\") || /^[a-zA-Z]:[\\/]/.test(raw) || /^file:/i.test(raw) || /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(raw)) return "";
  const normalized = raw.startsWith("uploads/") ? `/${raw}` : raw;
  for (const [legacyPrefix, staticPrefix] of STATIC_MEDIA_PREFIXES) {
    if (normalized.startsWith(legacyPrefix)) return `${staticPrefix}${normalized.slice(legacyPrefix.length)}`;
  }
  return raw;
}

export function isBundledPublicMediaUrl(value: string | null | undefined): boolean {
  const resolved = resolvePublicMediaUrl(value);
  return resolved.startsWith("/demo-catalog/") || resolved.startsWith("/seed-catalog/");
}
