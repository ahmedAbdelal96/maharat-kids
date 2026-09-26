import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { privateObjectStorage, requireStorage } from "@/modules/storage/provider";

export type PrivateStoredObject = { storageKey: string; sizeBytes: number; checksum: string; mimeType: string };

const MAX_PDF_BYTES = 25 * 1024 * 1024;
const PDF_SIGNATURE = Buffer.from("%PDF-");

function safeKey(key: string) {
  if (!key || key.includes("..") || key.includes("\\") || key.startsWith("/") || !/^digital-assets\/[a-z0-9-]+\/[a-z0-9-]+\.pdf$/.test(key)) throw new Error("PRIVATE_STORAGE_KEY_INVALID");
  return key;
}

export function validatePdf(bytes: Uint8Array, mimeType: string) {
  if (mimeType !== "application/pdf") throw new Error("DIGITAL_ASSET_MIME_INVALID");
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PDF_BYTES) throw new Error("DIGITAL_ASSET_SIZE_INVALID");
  if (!Buffer.from(bytes).subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)) throw new Error("DIGITAL_ASSET_SIGNATURE_INVALID");
}

export class PrivateDigitalStorage {
  private assertAvailable() {
    requireStorage();
  }

  async putPdf(bytes: Uint8Array, mimeType = "application/pdf"): Promise<PrivateStoredObject> {
    this.assertAvailable();
    validatePdf(bytes, mimeType);
    const checksum = createHash("sha256").update(bytes).digest("hex");
    const storageKey = `digital-assets/${randomUUID()}/${randomUUID()}.pdf`;
    await privateObjectStorage.put({ key: storageKey, bytes, mimeType });
    return { storageKey, sizeBytes: bytes.byteLength, checksum, mimeType };
  }

  async get(storageKey: string) {
    this.assertAvailable();
    return privateObjectStorage.get(safeKey(storageKey));
  }

  async exists(storageKey: string) {
    this.assertAvailable();
    return privateObjectStorage.exists(safeKey(storageKey));
  }

  async remove(storageKey: string) {
    this.assertAvailable();
    await privateObjectStorage.delete(safeKey(storageKey));
  }
}

export const privateDigitalStorage = new PrivateDigitalStorage();
