import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { LocalObjectStorage } from "@/modules/storage/provider";
import { validatePdf } from "@/modules/digital/infrastructure/private-storage";

test("PUBLIC_MEDIA uses generated keys and a public URL", async () => {
  const root = await mkdtemp(join(tmpdir(), "mk10-public-"));
  try {
    const storage = new LocalObjectStorage("PUBLIC_MEDIA", root);
    const object = await storage.put({ key: "products/generated.webp", bytes: new Uint8Array([1, 2, 3]), mimeType: "image/webp" });
    assert.equal(object.key, "products/generated.webp");
    assert.equal(storage.publicUrl?.(object.key), "/uploads/products/generated.webp");
    assert.equal(await storage.exists(object.key), true);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("PRIVATE_ASSET rejects public URL resolution and unsafe keys", async () => {
  const root = await mkdtemp(join(tmpdir(), "mk10-private-"));
  try {
    const storage = new LocalObjectStorage("PRIVATE_ASSET", root);
    assert.throws(() => storage.publicUrl?.("digital-assets/a/b.pdf"), /PRIVATE_STORAGE_PUBLIC_URL_FORBIDDEN/);
    await assert.rejects(() => storage.put({ key: "../public/leak.pdf", bytes: new Uint8Array([1]), mimeType: "application/pdf" }), /STORAGE_KEY_INVALID/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("PDF validation requires MIME, size, and the PDF magic signature", () => {
  assert.doesNotThrow(() => validatePdf(new TextEncoder().encode("%PDF-1.7\nfixture"), "application/pdf"));
  assert.throws(() => validatePdf(new TextEncoder().encode("not a pdf"), "application/pdf"), /SIGNATURE_INVALID/);
  assert.throws(() => validatePdf(new TextEncoder().encode("%PDF-1.7"), "image/png"), /MIME_INVALID/);
});
