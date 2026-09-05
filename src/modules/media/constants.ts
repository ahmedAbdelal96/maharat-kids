export const mediaKinds = ["products", "categories", "promotions"] as const;

export type MediaKind = (typeof mediaKinds)[number];

export const mediaPermissions = {
  view: "media.view",
  upload: "media.upload",
  delete: "media.delete",
} as const;

export const DEFAULT_MAX_MEDIA_SIZE_BYTES = 5 * 1024 * 1024;

export const allowedMediaTypes = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
} as const;

export type AllowedMediaType = keyof typeof allowedMediaTypes;
