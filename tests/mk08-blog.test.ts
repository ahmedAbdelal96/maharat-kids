import assert from "node:assert/strict";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { sanitizeBlogHtml } from "../src/modules/blog/domain/sanitize";

const db = new PrismaClient();
const fixture = `mk08-${Date.now()}`;
let categoryId = "";
let draftId = "";
let publishedId = "";

test.after(async () => {
  if (draftId || publishedId) await db.blogPost.deleteMany({ where: { id: { in: [draftId, publishedId].filter(Boolean) } } });
  if (categoryId) await db.blogCategory.delete({ where: { id: categoryId } }).catch(() => undefined);
  await db.$disconnect();
});

test("blog HTML sanitizer removes executable markup and unsafe links", () => {
  const clean = sanitizeBlogHtml('<p>Hello</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a><a href="https://example.com">safe</a>');
  assert.match(clean, /<p>Hello<\/p>/);
  assert.doesNotMatch(clean, /script|javascript:/i);
  assert.match(clean, /https:\/\/example\.com/);
});

test("drafts stay private while published posts and relations are public", async (t) => {
  try { await db.$queryRaw`SELECT 1`; } catch { t.skip("Disposable acceptance database is unavailable"); return; }
  const category = await db.blogCategory.create({ data: { nameAr: "اختبار", nameEn: "Test", slug: fixture } });
  categoryId = category.id;
  const draft = await db.blogPost.create({ data: { titleAr: "مسودة", titleEn: "Draft", contentAr: "<p>draft</p>", contentEn: "<p>draft</p>", slug: `${fixture}-draft`, categoryId, status: "DRAFT" } });
  draftId = draft.id;
  assert.equal(await db.blogPost.count({ where: { status: "PUBLISHED", slug: draft.slug } }), 0);
  const published = await db.blogPost.create({ data: { titleAr: "منشور", titleEn: "Published", contentAr: "<p>safe</p>", contentEn: "<p>safe</p>", slug: `${fixture}-published`, categoryId, status: "PUBLISHED", publishedAt: new Date() } });
  publishedId = published.id;
  await db.blogPostProduct.create({ data: { postId: published.id, productId: (await db.product.findFirstOrThrow({ where: { status: "ACTIVE" } })).id } });
  assert.equal(await db.blogPost.count({ where: { status: "PUBLISHED", slug: published.slug } }), 1);
  assert.equal(await db.blogPostProduct.count({ where: { postId: published.id } }), 1);
  await assert.rejects(() => db.blogPost.create({ data: { titleAr: "مكرر", titleEn: "Duplicate", contentAr: "<p>x</p>", contentEn: "<p>x</p>", slug: published.slug } }));
});
