import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalSeedKey,
  isSeedMediaPath,
  mimeTypeForKey,
  isDemoPrivatePdfKey,
} from "../src/modules/storage/domain/seed-media-migration";

test("canonicalizes legacy and bundled seed media paths without local paths", () => {
  assert.equal(canonicalSeedKey("uploads/demo-catalog/source/client-001.jpg"), "demo-catalog/products/client-001.jpg");
  assert.equal(canonicalSeedKey("demo-catalog/source/client-001.jpg"), "demo-catalog/products/client-001.jpg");
  assert.equal(canonicalSeedKey("/uploads/categories/seed-home-living.svg"), "seed-catalog/categories/seed-home-living.svg");
  assert.equal(canonicalSeedKey("demo-catalog/digital-covers/attention-focus-01.png"), "demo-catalog/digital-covers/attention-focus-01.png");
  assert.equal(canonicalSeedKey("D:\\assets\\client-001.jpg"), null);
  assert.equal(canonicalSeedKey("file:///tmp/client-001.jpg"), null);
});

test("accepts only repository-owned seed media and maps exact content types", () => {
  assert.equal(isSeedMediaPath("demo-catalog/products/client-001.jpg"), true);
  assert.equal(isSeedMediaPath("seed-catalog/categories/seed-home-living.svg"), true);
  assert.equal(isSeedMediaPath("uploads/runtime/customer-photo.jpg"), false);
  assert.equal(mimeTypeForKey("demo-catalog/products/client-001.jpg"), "image/jpeg");
  assert.equal(mimeTypeForKey("demo-catalog/digital-covers/attention-focus-01.png"), "image/png");
  assert.equal(mimeTypeForKey("seed-catalog/categories/seed-home-living.svg"), "image/svg+xml");
});

test("recognizes only demo private PDF keys", () => {
  assert.equal(isDemoPrivatePdfKey("digital-assets/00000000-0000-4000-8000-000000000001/attention-focus.pdf"), true);
  assert.equal(isDemoPrivatePdfKey("payment-proofs/customer-receipt.pdf"), false);
  assert.equal(isDemoPrivatePdfKey("digital-assets/user-owned/book.pdf"), false);
});
