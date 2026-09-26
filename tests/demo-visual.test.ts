import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { canonicalSeedKey } from "../src/modules/storage/domain/seed-media-migration";

const db = new PrismaClient();
const publicRoot = resolve(process.cwd(), process.env.PUBLIC_STORAGE_ROOT ?? join("public", "uploads"));
const staticRoot = resolve(process.cwd(), "public");

async function assertPublicMedia(media: { path: string; url: string }, label: string) {
  assert.ok(media.url.startsWith("/") || media.url.startsWith("https://"), `${label} should use a public media URL`);
  if (media.url.startsWith("https://")) {
    const response = await fetch(media.url);
    assert.equal(response.status, 200, `${label} public URL should resolve`);
    await response.arrayBuffer();
    return;
  }
  const canonical = canonicalSeedKey(media.path);
  const root = canonical ? staticRoot : publicRoot;
  const relativePath = (canonical ?? media.path).replace(/^\//, "").replace(/^uploads\//, "");
  await access(join(root, relativePath));
}

test.after(async () => { await db.$disconnect(); });

test("every demo product has a real primary public media object", async () => {
  const products = await db.product.findMany({
    where: { sku: { startsWith: "MK-DEMO-" } },
    select: { slug: true, images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1, select: { isPrimary: true, media: { select: { path: true, url: true } } } } },
  });
  assert.equal(products.length, 44);
  for (const product of products) {
    const image = product.images[0];
    assert.equal(image?.isPrimary, true, `${product.slug} should have a primary image`);
    await assertPublicMedia(image.media!, product.slug);
  }
});

test("every visible category has representative public media", async () => {
  const categories = await db.category.findMany({ where: { isActive: true, showInNavigation: true, parentId: null }, include: { imageMedia: { select: { path: true, url: true } } } });
  assert.ok(categories.length > 0);
  assert.equal(categories.filter((category) => Boolean(category.imageMedia?.url)).length, categories.length);
  for (const category of categories) await assertPublicMedia(category.imageMedia!, category.slug);
});

test("digital products have public covers while source PDFs remain private", async () => {
  const digital = await db.product.findMany({ where: { sku: { startsWith: "MK-DEMO-" }, fulfillmentType: "DIGITAL" }, include: { images: { where: { isPrimary: true }, include: { media: true } }, digitalAssets: true } });
  assert.equal(digital.length, 4);
  for (const product of digital) {
    assert.ok(product.images[0]?.media?.url?.endsWith(".png"), `${product.slug} should have a PNG cover`);
    assert.ok(product.images[0]?.media?.path.startsWith("demo-catalog/digital-covers/"));
    assert.ok(product.digitalAssets[0]?.storageKey.startsWith("digital-assets/"));
    assert.equal(product.digitalAssets[0]?.storageKey.includes("public"), false);
  }
  assert.equal((await db.media.count({ where: { path: { startsWith: "demo-catalog/digital-covers/" } } })), 4);
});
