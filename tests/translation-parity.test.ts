import assert from "node:assert/strict";
import test from "node:test";
import arMessages from "../messages/ar";
import enMessages from "../messages/en";

function keyPaths(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return prefix ? [prefix] : [];
  return Object.entries(value).flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key));
}

test("Arabic and English message catalogs keep key parity", () => {
  const ar = new Set(keyPaths(arMessages));
  const en = new Set(keyPaths(enMessages));
  assert.deepEqual([...ar].sort(), [...en].sort());
  assert.equal(ar.has("storefront.viewAll"), true);
});
