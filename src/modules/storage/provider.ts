import { createHash } from "node:crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { ObjectStorage, StorageVisibility, StoredObject } from "./types";

// Keep the storage provider usable from the migration utility as well as Next
// server modules. The application env module intentionally imports
// `server-only`; this provider validates the storage-specific values locally
// and never exposes secrets to client bundles.
const storageEnv = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER === "s3" ? "s3" : "local",
  PUBLIC_MEDIA_BASE_URL: process.env.PUBLIC_MEDIA_BASE_URL,
  PUBLIC_STORAGE_ROOT: process.env.PUBLIC_STORAGE_ROOT,
  PRIVATE_STORAGE_ROOT: process.env.PRIVATE_STORAGE_ROOT,
  STORAGE_S3_ENDPOINT: process.env.STORAGE_S3_ENDPOINT,
  STORAGE_S3_REGION: process.env.STORAGE_S3_REGION ?? "auto",
  STORAGE_S3_PUBLIC_BUCKET: process.env.STORAGE_S3_PUBLIC_BUCKET,
  STORAGE_S3_PRIVATE_BUCKET: process.env.STORAGE_S3_PRIVATE_BUCKET,
  STORAGE_S3_ACCESS_KEY_ID: process.env.STORAGE_S3_ACCESS_KEY_ID,
  STORAGE_S3_SECRET_ACCESS_KEY: process.env.STORAGE_S3_SECRET_ACCESS_KEY,
};

function checksum(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function validateKey(key: string) {
  if (!key || key.includes("..") || key.includes("\\") || key.startsWith("/") || key.includes("//")) {
    throw new Error("STORAGE_KEY_INVALID");
  }
  return key;
}

export class LocalObjectStorage implements ObjectStorage {
  constructor(
    public readonly visibility: StorageVisibility,
    private readonly root: string,
    private readonly baseUrl?: string,
  ) {}

  private absolute(key: string) {
    return join(this.root, ...validateKey(key).split("/"));
  }

  async put(input: { key: string; bytes: Uint8Array; mimeType: string }): Promise<StoredObject> {
    const key = validateKey(input.key);
    const absolute = this.absolute(key);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, input.bytes, { flag: "wx" });
    return { key, sizeBytes: input.bytes.byteLength, checksum: checksum(input.bytes), mimeType: input.mimeType };
  }

  async get(key: string) {
    return readFile(this.absolute(key));
  }

  async exists(key: string) {
    try { await stat(this.absolute(key)); return true; } catch { return false; }
  }

  async delete(key: string) {
    await unlink(this.absolute(key)).catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    });
  }

  publicUrl(key: string) {
    if (this.visibility !== "PUBLIC_MEDIA") throw new Error("PRIVATE_STORAGE_PUBLIC_URL_FORBIDDEN");
    if (!this.baseUrl) return `/uploads/${key}`;
    return `${this.baseUrl.replace(/\/$/, "")}/${key}`;
  }
}

class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;

  constructor(
    public readonly visibility: StorageVisibility,
    private readonly bucket: string,
    private readonly baseUrl?: string,
  ) {
    if (!storageEnv.STORAGE_S3_ACCESS_KEY_ID || !storageEnv.STORAGE_S3_SECRET_ACCESS_KEY) {
      throw new Error("STORAGE_S3_CREDENTIALS_REQUIRED");
    }
    this.client = new S3Client({
      endpoint: storageEnv.STORAGE_S3_ENDPOINT,
      region: storageEnv.STORAGE_S3_REGION,
      forcePathStyle: Boolean(storageEnv.STORAGE_S3_ENDPOINT),
      credentials: { accessKeyId: storageEnv.STORAGE_S3_ACCESS_KEY_ID, secretAccessKey: storageEnv.STORAGE_S3_SECRET_ACCESS_KEY },
    });
  }

  async put(input: { key: string; bytes: Uint8Array; mimeType: string }): Promise<StoredObject> {
    const key = validateKey(input.key);
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: input.bytes, ContentType: input.mimeType, CacheControl: this.visibility === "PRIVATE_ASSET" ? "private, no-store" : "public, max-age=31536000, immutable" }));
    return { key, sizeBytes: input.bytes.byteLength, checksum: checksum(input.bytes), mimeType: input.mimeType };
  }

  async get(key: string) {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: validateKey(key) }));
    if (!result.Body) throw new Error("STORAGE_OBJECT_EMPTY");
    return new Uint8Array(await result.Body.transformToByteArray());
  }

  async exists(key: string) {
    try { await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: validateKey(key) })); return true; } catch { return false; }
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: validateKey(key) }));
  }

  publicUrl(key: string) {
    if (this.visibility !== "PUBLIC_MEDIA" || !this.baseUrl) throw new Error("PRIVATE_STORAGE_PUBLIC_URL_FORBIDDEN");
    return `${this.baseUrl.replace(/\/$/, "")}/${validateKey(key)}`;
  }
}

function productionStorageRequired() {
  // Next evaluates route modules during `next build`; defer the operational
  // requirement to runtime so builds remain portable while production starts
  // fail closed when durable storage is not configured.
  return (process.env.NODE_ENV ?? storageEnv.NODE_ENV) === "production"
    && process.env.MK_E2E_TEST_MODE !== "1"
    && process.env.NEXT_PHASE !== "phase-production-build";
}

function createStorage(visibility: StorageVisibility): ObjectStorage {
  if (storageEnv.STORAGE_PROVIDER === "s3") {
    const bucket = visibility === "PUBLIC_MEDIA" ? storageEnv.STORAGE_S3_PUBLIC_BUCKET : storageEnv.STORAGE_S3_PRIVATE_BUCKET;
    if (!bucket) throw new Error(`STORAGE_S3_${visibility === "PUBLIC_MEDIA" ? "PUBLIC" : "PRIVATE"}_BUCKET_REQUIRED`);
    if (visibility === "PUBLIC_MEDIA" && !storageEnv.PUBLIC_MEDIA_BASE_URL) throw new Error("PUBLIC_MEDIA_BASE_URL_REQUIRED");
    return new S3ObjectStorage(visibility, bucket, visibility === "PUBLIC_MEDIA" ? storageEnv.PUBLIC_MEDIA_BASE_URL : undefined);
  }
  if (productionStorageRequired()) {
    throw new Error("DURABLE_STORAGE_REQUIRED_IN_PRODUCTION");
  }
  const root = visibility === "PUBLIC_MEDIA"
    ? resolve(storageEnv.PUBLIC_STORAGE_ROOT ?? join(process.cwd(), "public", "uploads"))
    : resolve(storageEnv.PRIVATE_STORAGE_ROOT ?? join(process.cwd(), ".private"));
  return new LocalObjectStorage(visibility, root, visibility === "PUBLIC_MEDIA" ? storageEnv.PUBLIC_MEDIA_BASE_URL : undefined);
}

export const publicObjectStorage = createStorage("PUBLIC_MEDIA");
export const privateObjectStorage = createStorage("PRIVATE_ASSET");

export { productionStorageRequired };
