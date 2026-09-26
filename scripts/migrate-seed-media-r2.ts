import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import { PrismaClient } from "@prisma/client";
import { privateObjectStorage, publicObjectStorage } from "../src/modules/storage/provider";
import type { ObjectStorage } from "../src/modules/storage/types";
import { canonicalSeedKey, checksum, isDemoPrivatePdfKey, isSeedMediaPath, mimeTypeForKey } from "../src/modules/storage/domain/seed-media-migration";

const root = process.cwd();
const dryRun = process.argv.includes("--dry-run");
const confirm = process.argv.includes("--confirm");
const probeOnly = process.argv.includes("--probe-only");
const db = new PrismaClient();

type Counts = { copied: number; skipped: number; replaced: number; missing: number; failed: number };
const emptyCounts = (): Counts => ({ copied: 0, skipped: 0, replaced: 0, missing: 0, failed: 0 });

async function allFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await allFiles(absolute));
    else files.push(absolute);
  }
  return files;
}

const PRIVATE_SOURCE_FILES: Record<string, string> = {
  "attention-focus.pdf": "attention-focus-activity-book.pdf",
  "pre-writing.pdf": "pre-writing-skills-workbook.pdf",
  "visual-matching.pdf": "visual-perception-matching-workbook.pdf",
  "basic-concepts.pdf": "basic-concepts-activity-book.pdf",
};

async function sourceObjects() {
  const directories = [join(root, "public", "demo-catalog"), join(root, "public", "seed-catalog")];
  const objects: { key: string; source: string; mimeType: string }[] = [];
  for (const directory of directories) {
    for (const absolute of await allFiles(directory)) {
      const key = relative(join(root, "public"), absolute).split(sep).join("/");
      if (!isSeedMediaPath(key)) continue;
      objects.push({ key, source: absolute, mimeType: mimeTypeForKey(key) });
    }
  }
  return objects.sort((a, b) => a.key.localeCompare(b.key));
}

async function migrateObject(input: { key: string; bytes: Uint8Array; mimeType: string }, target: ObjectStorage, counts: Counts) {
  const exists = await target.exists(input.key);
  if (exists) {
    const current = await target.get(input.key);
    if (checksum(current) === checksum(input.bytes)) {
      counts.skipped += 1;
      return "skipped" as const;
    }
    if (dryRun) {
      counts.replaced += 1;
      return "would-replace" as const;
    }
    await target.delete(input.key);
    await target.put(input);
    counts.replaced += 1;
    return "replaced" as const;
  }
  if (dryRun) {
    counts.copied += 1;
    return "would-copy" as const;
  }
  await target.put(input);
  const uploaded = await target.get(input.key);
  if (checksum(uploaded) !== checksum(input.bytes)) throw new Error(`CHECKSUM_MISMATCH:${input.key}`);
  counts.copied += 1;
  return "copied" as const;
}

async function verifyPublicUrl(key: string) {
  if (!publicObjectStorage.publicUrl) throw new Error("PUBLIC_STORAGE_URL_UNAVAILABLE");
  const url = publicObjectStorage.publicUrl(key);
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`PUBLIC_MEDIA_HTTP_${response.status}:${key}`);
  return url;
}

async function mapWithConcurrency<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  async function consume() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => consume()));
}

async function probeStorage() {
  const suffix = `codex-r2-probe/${randomUUID()}`;
  const publicKey = `${suffix}.txt`;
  const privateKey = `${suffix}.pdf`;
  const bytes = new TextEncoder().encode("maharat-kids-r2-probe");
  try {
    await publicObjectStorage.put({ key: publicKey, bytes, mimeType: "text/plain" });
    const publicRead = await publicObjectStorage.get(publicKey);
    if (checksum(publicRead) !== checksum(bytes)) throw new Error("PUBLIC_PROBE_CHECKSUM_MISMATCH");
    const publicUrl = await verifyPublicUrl(publicKey);
    await privateObjectStorage.put({ key: privateKey, bytes, mimeType: "application/pdf" });
    const privateRead = await privateObjectStorage.get(privateKey);
    if (checksum(privateRead) !== checksum(bytes)) throw new Error("PRIVATE_PROBE_CHECKSUM_MISMATCH");
    let privatePublicUrl = "forbidden";
    try { privateObjectStorage.publicUrl?.(privateKey); privatePublicUrl = "unexpectedly-available"; } catch { /* expected */ }
    if (privatePublicUrl !== "forbidden") throw new Error("PRIVATE_PUBLIC_URL_EXPOSED");
    console.log(JSON.stringify({ probe: "passed", publicUrl, privatePublicUrl }));
  } finally {
    await publicObjectStorage.delete(publicKey).catch(() => undefined);
    await privateObjectStorage.delete(privateKey).catch(() => undefined);
  }
}

async function main() {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--allow-production")) throw new Error("REFUSING_PRODUCTION_WITHOUT_ALLOW_PRODUCTION");
  if (probeOnly) { await probeStorage(); return; }
  if (!dryRun && !confirm) throw new Error("PASS --dry-run OR --confirm");
  if (!isSeedMediaPath("demo-catalog/products/client-001.jpg")) throw new Error("SEED_SCOPE_GUARD_FAILED");

  const publicCounts = emptyCounts();
  const privateCounts = emptyCounts();
  const publicFiles = await sourceObjects();
  const publicByKey = new Map(publicFiles.map((file) => [file.key, file]));
  const media = await db.media.findMany({ select: { id: true, path: true, url: true, filename: true, mimeType: true, size: true } });
  const affectedMedia = media.flatMap((record) => {
    const key = canonicalSeedKey(record.path);
    return key ? [{ record, key }] : [];
  });
  const snapshotDir = join(root, "tmp");
  await mkdir(snapshotDir, { recursive: true });
  await writeFile(join(snapshotDir, "r2-media-migration-snapshot.json"), JSON.stringify({ createdAt: new Date().toISOString(), media: affectedMedia.map(({ record, key }) => ({ id: record.id, path: record.path, url: record.url, canonicalKey: key })), digitalAssetCount: await db.digitalAsset.count({ where: { product: { sku: { startsWith: "MK-DEMO-" } } } }) }, null, 2));
  const missingMedia: string[] = [];
  await mapWithConcurrency(affectedMedia, 8, async ({ record, key }) => {
    const file = publicByKey.get(key);
    if (!file) { publicCounts.missing += 1; missingMedia.push(`${record.id}:${key}`); return; }
    const bytes = await readFile(file.source);
    await migrateObject({ key, bytes, mimeType: file.mimeType }, publicObjectStorage, publicCounts);
    if (!dryRun) {
      const url = await verifyPublicUrl(key);
      await db.media.update({ where: { id: record.id }, data: { path: key, url, filename: basename(key), mimeType: file.mimeType, size: bytes.byteLength } });
      await db.productImage.updateMany({ where: { mediaId: record.id }, data: { url } });
    }
  });

  const assets = await db.digitalAsset.findMany({ where: { product: { sku: { startsWith: "MK-DEMO-" } } }, select: { id: true, storageKey: true, mimeType: true, product: { select: { sku: true } } } });
  const missingAssets: string[] = [];
  await mapWithConcurrency(assets, 4, async (asset) => {
    if (!isDemoPrivatePdfKey(asset.storageKey)) { privateCounts.failed += 1; missingAssets.push(`${asset.id}:${asset.storageKey}`); return; }
    const sourceName = PRIVATE_SOURCE_FILES[basename(asset.storageKey)];
    if (!sourceName) { privateCounts.missing += 1; missingAssets.push(`${asset.id}:unmapped:${asset.storageKey}`); return; }
    const source = join(root, "seed-assets", "demo-source", "digital", sourceName);
    try { await stat(source); } catch { privateCounts.missing += 1; missingAssets.push(`${asset.id}:${source}`); return; }
    const bytes = await readFile(source);
    await migrateObject({ key: asset.storageKey, bytes, mimeType: "application/pdf" }, privateObjectStorage, privateCounts);
    if (!dryRun) await db.digitalAsset.update({ where: { id: asset.id }, data: { sizeBytes: bytes.byteLength, checksum: createHash("sha256").update(bytes).digest("hex"), mimeType: "application/pdf" } });
  });
  if (missingMedia.length || missingAssets.length) throw new Error(`MISSING_SEED_ASSETS:${JSON.stringify({ media: missingMedia, privateAssets: missingAssets })}`);
  console.log(JSON.stringify({ dryRun, public: { sourceFiles: publicFiles.length, databaseRecords: affectedMedia.length, ...publicCounts }, private: { databaseRecords: assets.length, ...privateCounts }, snapshot: "tmp/r2-media-migration-snapshot.json" }));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }).finally(() => db.$disconnect());
