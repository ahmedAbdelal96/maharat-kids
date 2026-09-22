import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { LocalObjectStorage, privateObjectStorage, publicObjectStorage } from "../src/modules/storage/provider";
import type { ObjectStorage } from "../src/modules/storage/types";

const dryRun = process.argv.includes("--dry-run");
const db = new PrismaClient();
const publicSource = new LocalObjectStorage("PUBLIC_MEDIA", resolve(process.env.PUBLIC_STORAGE_ROOT ?? join(process.cwd(), "public", "uploads")));
const privateSource = new LocalObjectStorage("PRIVATE_ASSET", resolve(process.env.PRIVATE_STORAGE_ROOT ?? join(process.cwd(), ".private")));

async function migrateObject(source: LocalObjectStorage, target: ObjectStorage, key: string, mimeType: string) {
  if (await target.exists(key)) return "already-present" as const;
  if (!(await source.exists(key))) return "missing-source" as const;
  if (dryRun) return "would-copy" as const;
  const bytes = await source.get(key);
  await target.put({ key, bytes, mimeType });
  return "copied" as const;
}

const result = { media: { alreadyPresent: 0, copied: 0, wouldCopy: 0, missingSource: 0 }, privateAssets: { alreadyPresent: 0, copied: 0, wouldCopy: 0, missingSource: 0 } };
async function main() {
  try {
    for (const media of await db.media.findMany({ select: { path: true, mimeType: true } })) {
    const key = media.path.startsWith("uploads/") ? media.path.slice("uploads/".length) : media.path;
    const status = await migrateObject(publicSource, publicObjectStorage, key, media.mimeType);
    result.media[status === "already-present" ? "alreadyPresent" : status === "would-copy" ? "wouldCopy" : status === "missing-source" ? "missingSource" : "copied"] += 1;
    }
    for (const asset of await db.digitalAsset.findMany({ select: { storageKey: true, mimeType: true } })) {
    const status = await migrateObject(privateSource, privateObjectStorage, asset.storageKey, asset.mimeType);
    result.privateAssets[status === "already-present" ? "alreadyPresent" : status === "would-copy" ? "wouldCopy" : status === "missing-source" ? "missingSource" : "copied"] += 1;
    }
    console.log(JSON.stringify({ dryRun, ...result }));
  } finally {
    await db.$disconnect();
  }
}

void main();
