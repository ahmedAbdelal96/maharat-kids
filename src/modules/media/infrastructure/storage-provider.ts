import "server-only";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { allowedMediaTypes, type MediaKind } from "../constants";

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

export class LocalStorageProvider implements MediaStorageProvider {
  private readonly publicRoot = join(process.cwd(), "public");

  async upload(input: {
    bytes: Uint8Array;
    mimeType: keyof typeof allowedMediaTypes;
    kind: MediaKind;
  }): Promise<StoredMedia> {
    const filename = `${input.kind}-${randomUUID()}${allowedMediaTypes[input.mimeType]}`;
    const path = `uploads/${input.kind}/${filename}`;
    const absolutePath = join(this.publicRoot, ...path.split("/"));

    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.bytes);

    return { path, filename, url: this.getUrl(path) };
  }

  async delete(path: string): Promise<void> {
    if (!path.startsWith("uploads/") || path.includes("..")) return;
    await unlink(join(this.publicRoot, ...path.split("/"))).catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    });
  }

  getUrl(path: string): string {
    return `/${path}`;
  }
}
