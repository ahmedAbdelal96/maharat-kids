import "server-only";

import { randomUUID } from "node:crypto";
import { allowedMediaTypes, type MediaKind } from "../constants";
import { publicObjectStorage } from "@/modules/storage/provider";
import type { ObjectStorage } from "@/modules/storage/types";

export type StoredMedia = {
  path: string;
  url: string;
  filename: string;
};

export interface MediaStorageProvider {
  upload(input: {
    bytes: Uint8Array;
    mimeType: keyof typeof allowedMediaTypes;
    kind: MediaKind;
  }): Promise<StoredMedia>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}

export class ObjectMediaStorageProvider implements MediaStorageProvider {
  constructor(private readonly storage: ObjectStorage = publicObjectStorage) {}

  async upload(input: { bytes: Uint8Array; mimeType: keyof typeof allowedMediaTypes; kind: MediaKind }): Promise<StoredMedia> {
    const filename = `${input.kind}-${randomUUID()}${allowedMediaTypes[input.mimeType]}`;
    const path = `${input.kind}/${filename}`;
    await this.storage.put({ key: path, bytes: input.bytes, mimeType: input.mimeType });
    return { path, filename, url: this.getUrl(path) };
  }

  async delete(path: string): Promise<void> {
    const key = path.startsWith("uploads/") ? path.slice("uploads/".length) : path;
    await this.storage.delete(key);
  }

  getUrl(path: string): string {
    return this.storage.publicUrl?.(path) ?? `/uploads/${path}`;
  }
}

// Existing imports remain source-compatible while using the consolidated
// PUBLIC_MEDIA policy underneath.
export class LocalStorageProvider extends ObjectMediaStorageProvider {}
