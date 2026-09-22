export type StorageVisibility = "PUBLIC_MEDIA" | "PRIVATE_ASSET";

export type StoredObject = {
  key: string;
  sizeBytes: number;
  checksum: string;
  mimeType: string;
};

export interface ObjectStorage {
  readonly visibility: StorageVisibility;
  put(input: { key: string; bytes: Uint8Array; mimeType: string }): Promise<StoredObject>;
  get(key: string): Promise<Uint8Array>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  publicUrl?(key: string): string;
}
