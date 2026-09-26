import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { resolvePublicMediaUrl, isBundledPublicMediaUrl } from "../src/modules/media/domain/public-url";

test("bundled demo product, category, and digital cover assets are present", () => {
  assert.equal(readdirSync("public/demo-catalog/products").filter((name) => name.endsWith(".jpg")).length, 70);
  assert.equal(readdirSync("public/demo-catalog/digital-covers").filter((name) => name.endsWith(".png")).length, 4);
  assert.equal(readdirSync("public/seed-catalog/categories").filter((name) => name.endsWith(".svg")).length, 11);
  assert.equal(existsSync("public/seed-catalog/products/seed-oak-lounge-chair-primary.svg"), true);
});

test("legacy database media paths resolve to tracked static URLs without storage", () => {
  assert.equal(resolvePublicMediaUrl("/uploads/demo-catalog/source/client-001.jpg"), "/demo-catalog/products/client-001.jpg");
  assert.equal(resolvePublicMediaUrl("/uploads/demo-catalog/digital-covers/attention-focus-01.png"), "/demo-catalog/digital-covers/attention-focus-01.png");
  assert.equal(resolvePublicMediaUrl("/uploads/categories/seed-home-living.svg"), "/seed-catalog/categories/seed-home-living.svg");
  assert.equal(isBundledPublicMediaUrl("/uploads/products/seed-oak-lounge-chair-primary.svg"), true);
});

test("unsafe local paths are never emitted as public media URLs", () => {
  assert.equal(resolvePublicMediaUrl("D:\\private\\receipt.pdf"), "");
  assert.equal(resolvePublicMediaUrl("file:///tmp/private.pdf"), "");
  assert.equal(resolvePublicMediaUrl("http://localhost:3000/uploads/image.jpg"), "");
  assert.equal(resolvePublicMediaUrl("/uploads/runtime/image.jpg"), "/uploads/runtime/image.jpg");
});
