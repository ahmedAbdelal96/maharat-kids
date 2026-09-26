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
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
  PUBLIC_MEDIA_BASE_URL: process.env.PUBLIC_MEDIA_BASE_URL,
  PUBLIC_STORAGE_ROOT: process.env.PUBLIC_STORAGE_ROOT,
  PRIVATE_STORAGE_ROOT: process.env.PRIVATE_STORAGE_ROOT,
  STORAGE_S3_ENDPOINT: process.env.STORAGE_S3_ENDPOINT,
  STORAGE_S3_REGION: process.env.STORAGE_S3_REGION,
  STORAGE_S3_PUBLIC_BUCKET: process.env.STORAGE_S3_PUBLIC_BUCKET,
  STORAGE_S3_PRIVATE_BUCKET: process.env.STORAGE_S3_PRIVATE_BUCKET,
  STORAGE_S3_ACCESS_KEY_ID: process.env.STORAGE_S3_ACCESS_KEY_ID,
  STORAGE_S3_SECRET_ACCESS_KEY: process.env.STORAGE_S3_SECRET_ACCESS_KEY,
};

const requiredS3Keys = [
  "PUBLIC_MEDIA_BASE_URL",
  "STORAGE_S3_PUBLIC_BUCKET",
  "STORAGE_S3_PRIVATE_BUCKET",
  "STORAGE_S3_ACCESS_KEY_ID",
  "STORAGE_S3_SECRET_ACCESS_KEY",
  "STORAGE_S3_REGION",
] as const;

export type StorageCapability =
  | { status: "available"; provider: "s3" | "local" }
  | { status: "unavailable"; reason: "not-configured" | "incomplete" | "production-local-disabled"; missing: string[] };

function validHttpsUrl(value: string | undefined) {
  if (!value) return false;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

function getMissingS3Configuration() {
  const missing: string[] = requiredS3Keys.filter((key) => !storageEnv[key]);
  if (storageEnv.PUBLIC_MEDIA_BASE_URL && !validHttpsUrl(storageEnv.PUBLIC_MEDIA_BASE_URL)) missing.push("PUBLIC_MEDIA_BASE_URL");
  if (storageEnv.STORAGE_S3_ENDPOINT && !validHttpsUrl(storageEnv.STORAGE_S3_ENDPOINT)) missing.push("STORAGE_S3_ENDPOINT");
  return [...new Set(missing)];
}

export function getStorageCapability(): StorageCapability {
  if (storageEnv.STORAGE_PROVIDER === "s3") {
    const missing = getMissingS3Configuration();
    return missing.length ? { status: "unavailable", reason: "incomplete", missing } : { status: "available", provider: "s3" };
  }
  if (storageEnv.STORAGE_PROVIDER === "disabled") {
    return { status: "unavailable", reason: "not-configured", missing: requiredS3Keys.slice() };
  }
  if (storageEnv.NODE_ENV === "production") {
    return { status: "unavailable", reason: storageEnv.STORAGE_PROVIDER === "local" ? "production-local-disabled" : "not-configured", missing: requiredS3Keys.slice() };
  }
  return { status: "available", provider: "local" };
}

let warningLogged = false;
function warnUnavailable(capability: StorageCapability) {
  if (warningLogged || capability.status === "available" || storageEnv.NODE_ENV !== "production" || process.env.NEXT_PHASE === "phase-production-build") return;
  warningLogged = true;
  console.warn("Object storage is not configured; storage-backed features are unavailable.");
}

export function isStorageAvailable() {
  const capability = getStorageCapability();
  warnUnavailable(capability);
  return capability.status === "available";
}

export function requireStorage() {
  const capability = getStorageCapability();
  warnUnavailable(capability);
  if (capability.status !== "available") throw new Error("STORAGE_UNAVAILABLE");
  return capability;
}

class UnavailableObjectStorage implements ObjectStorage {
  constructor(public readonly visibility: StorageVisibility) {}
  private unavailable(): never { throw new Error("STORAGE_UNAVAILABLE"); }
  put(): Promise<StoredObject> { return Promise.reject(new Error("STORAGE_UNAVAILABLE")); }
  get(): Promise<Uint8Array> { return Promise.reject(new Error("STORAGE_UNAVAILABLE")); }
  exists(): Promise<boolean> { return Promise.reject(new Error("STORAGE_UNAVAILABLE")); }
  delete(): Promise<void> { return Promise.reject(new Error("STORAGE_UNAVAILABLE")); }
  publicUrl(): string { return this.unavailable(); }
}

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
      region: storageEnv.STORAGE_S3_REGION ?? "auto",
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
  return storageEnv.NODE_ENV === "production" && !isStorageAvailable();
}

function createStorage(visibility: StorageVisibility): ObjectStorage {
  const capability = getStorageCapability();
  warnUnavailable(capability);
  if (capability.status === "unavailable") return new UnavailableObjectStorage(visibility);
  if (capability.provider === "s3") {
    const bucket = visibility === "PUBLIC_MEDIA" ? storageEnv.STORAGE_S3_PUBLIC_BUCKET : storageEnv.STORAGE_S3_PRIVATE_BUCKET;
    if (!bucket) return new UnavailableObjectStorage(visibility);
    return new S3ObjectStorage(visibility, bucket, visibility === "PUBLIC_MEDIA" ? storageEnv.PUBLIC_MEDIA_BASE_URL : undefined);
  }
  const root = visibility === "PUBLIC_MEDIA"
    ? resolve(storageEnv.PUBLIC_STORAGE_ROOT ?? join(process.cwd(), "public", "uploads"))
    : resolve(storageEnv.PRIVATE_STORAGE_ROOT ?? join(process.cwd(), ".private"));
  return new LocalObjectStorage(visibility, root, visibility === "PUBLIC_MEDIA" ? storageEnv.PUBLIC_MEDIA_BASE_URL : undefined);
}

export const publicObjectStorage = createStorage("PUBLIC_MEDIA");
export const privateObjectStorage = createStorage("PRIVATE_ASSET");

export { productionStorageRequired };
