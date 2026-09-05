import type { MediaKind } from "./constants";

export type MediaId = string & { readonly __brand: "MediaId" };

export type MediaAsset = {
  id: MediaId;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: string;
};

export type MediaUploadInput = {
  bytes: Uint8Array;
  mimeType: string;
  kind: MediaKind;
};
