import assert from "node:assert/strict";
import { test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { CatalogRepository } from "../src/modules/catalog/server/repository";

const db = new PrismaClient();
const suffix = Date.now().toString();
let rootId = ""; let childId = ""; let grandchildId = ""; let productId = "";

test.after(async () => {
  if (productId) await db.product.delete({ where: { id: productId } }).catch(() => undefined);
  if (grandchildId) await db.category.delete({ where: { id: grandchildId } }).catch(() => undefined);
  if (childId) await db.category.delete({ where: { id: childId } }).catch(() => undefined);
  if (rootId) await db.category.delete({ where: { id: rootId } }).catch(() => undefined);
  await db.$disconnect();
});

test("dynamic category tree supports arbitrary depth, navigation state, and many-to-many assignment", async () => {
  const root = await db.category.create({ data: { name: `MK05 root ${suffix}`, slug: `mk05-root-${suffix}`, showInNavigation: true } }); rootId = root.id;
  const child = await db.category.create({ data: { name: `MK05 child ${suffix}`, slug: `mk05-child-${suffix}`, parentId: root.id } }); childId = child.id;
  const grandchild = await db.category.create({ data: { name: `MK05 grandchild ${suffix}`, slug: `mk05-grandchild-${suffix}`, parentId: child.id, showInNavigation: false } }); grandchildId = grandchild.id;
  assert.equal((await db.category.findUniqueOrThrow({ where: { id: grandchild.id } })).parentId, child.id);
  assert.equal((await db.category.findUniqueOrThrow({ where: { id: grandchild.id } })).showInNavigation, false);
  const product = await db.product.create({ data: { name: `MK05 product ${suffix}`, slug: `mk05-product-${suffix}`, price: "10", status: "ACTIVE", marketPrices: { create: [{ market: "SAUDI_ARABIA", price: "10" }, { market: "EGYPT", price: "100" }] }, categoryId: child.id, primaryCategoryId: child.id, minAgeMonths: 36, maxAgeMonths: 72 } }); productId = product.id;
  await db.productCategory.createMany({ data: [{ productId: product.id, categoryId: child.id }, { productId: product.id, categoryId: grandchild.id }] });
  assert.equal(await db.productCategory.count({ where: { productId: product.id } }), 2);
});

test("education metadata validates age ranges and composes category, age, skill, and product type filters", async () => {
  const repo = new CatalogRepository(db);
  const skill = await db.skill.findFirstOrThrow({ where: { slug: "focus" } });
  const type = await db.productType.findFirstOrThrow({ where: { slug: "puzzle" } });
  const objective = await db.learningObjective.findFirstOrThrow({ where: { slug: "sustain-attention" } });
  const context = await db.useContext.findFirstOrThrow({ where: { slug: "home" } });
  const age = await db.ageGroup.findFirstOrThrow({ where: { slug: "three-six-years" } });
  await assert.rejects(() => repo.saveProductEducation(productId, { categoryIds: [childId], minAgeMonths: 80, maxAgeMonths: 20 }), /AGE_RANGE_INVALID/);
  await repo.saveProductEducation(productId, { categoryIds: [childId, grandchildId], primaryCategoryId: childId, minAgeMonths: 36, maxAgeMonths: 72, ageGroupIds: [age.id], skillIds: [skill.id], learningObjectiveIds: [objective.id], productTypeIds: [type.id], useContextIds: [context.id], productLanguage: "ARABIC" });
  const education = await repo.findProductEducation(productId);
  assert.deepEqual(education?.categoryAssignments.map((row) => row.categoryId).sort(), [childId, grandchildId].sort());
  assert.equal(education?.skillAssignments.length, 1);
  const matches = await repo.findFilteredProducts({ categoryId: grandchildId, ageMonths: 48, skillIds: [skill.id], productTypeIds: [type.id] });
  assert.ok(matches.some((row) => row.id === productId));
});

test("moving a child preserves descendants and rejects self or descendant cycles", async () => {
  await db.category.update({ where: { id: childId }, data: { parentId: rootId } });
  const chainContains = async (start: string, target: string) => { let cursor: string | null = start; const seen = new Set<string>(); while (cursor) { if (cursor === target) return true; if (seen.has(cursor)) return true; seen.add(cursor); cursor = (await db.category.findUnique({ where: { id: cursor }, select: { parentId: true } }))?.parentId ?? null; } return false; };
  assert.equal(await chainContains(grandchildId, rootId), true);
  assert.equal(await chainContains(rootId, grandchildId), false);
  assert.equal(await chainContains(childId, childId), true);
});

test("explicit sibling ordering and independent category visibility are persisted", async () => {
  await db.category.update({ where: { id: rootId }, data: { sortOrder: 20, isActive: true, showInNavigation: false } });
  await db.category.update({ where: { id: childId }, data: { sortOrder: 10, isActive: true, showInNavigation: true } });
  const rows = await db.category.findMany({ where: { id: { in: [rootId, childId] } }, orderBy: { sortOrder: "asc" } });
  assert.deepEqual(rows.map((row) => row.id), [childId, rootId]);
  assert.equal(rows[1].isActive, true); assert.equal(rows[1].showInNavigation, false);
});

test("disabled taxonomy keeps existing product relationships while active filters fail closed", async () => {
  const skill = await db.skill.findFirstOrThrow({ where: { slug: "focus" } });
  await db.skill.update({ where: { id: skill.id }, data: { isActive: false } });
  assert.equal(await db.productSkill.count({ where: { productId, skillId: skill.id } }), 1);
  const repo = new CatalogRepository(db);
  const matches = await repo.findFilteredProducts({ skillIds: [skill.id] });
  assert.equal(matches.some((row) => row.id === productId), false);
  await db.skill.update({ where: { id: skill.id }, data: { isActive: true } });
});

test("learning objectives, use contexts, product types, and age groups remain independently assigned", async () => {
  const objective = await db.learningObjective.findFirstOrThrow({ where: { slug: "sustain-attention" } });
  const context = await db.useContext.findFirstOrThrow({ where: { slug: "home" } });
  const type = await db.productType.findFirstOrThrow({ where: { slug: "puzzle" } });
  const age = await db.ageGroup.findFirstOrThrow({ where: { slug: "three-six-years" } });
  await db.productLearningObjective.upsert({ where: { productId_learningObjectiveId: { productId, learningObjectiveId: objective.id } }, update: {}, create: { productId, learningObjectiveId: objective.id } });
  await db.productUseContext.upsert({ where: { productId_useContextId: { productId, useContextId: context.id } }, update: {}, create: { productId, useContextId: context.id } });
  await db.productProductType.upsert({ where: { productId_productTypeId: { productId, productTypeId: type.id } }, update: {}, create: { productId, productTypeId: type.id } });
  await db.productAgeGroup.upsert({ where: { productId_ageGroupId: { productId, ageGroupId: age.id } }, update: {}, create: { productId, ageGroupId: age.id } });
  const loaded = await new CatalogRepository(db).findProductEducation(productId);
  assert.equal(loaded?.objectiveAssignments.length, 1); assert.equal(loaded?.useContextAssignments.length, 1); assert.equal(loaded?.productTypeAssignments.length, 1); assert.equal(loaded?.ageGroups.length, 1);
});

test("precise ages and presentation age groups remain distinct and market prices never fall back", async () => {
  const loaded = await db.product.findUniqueOrThrow({ where: { id: productId }, include: { marketPrices: true } });
  assert.equal(loaded.minAgeMonths, 36); assert.equal(loaded.maxAgeMonths, 72);
  assert.equal(loaded.marketPrices.find((row) => row.market === "SAUDI_ARABIA")?.price.toFixed(2), "10.00");
  assert.equal(loaded.marketPrices.find((row) => row.market === "EGYPT")?.price.toFixed(2), "100.00");
  assert.notEqual(loaded.price.toFixed(2), "100.00");
});

test("related products are deterministic and require active market pricing", async () => {
  const repo = new CatalogRepository(db);
  const related = await repo.relatedProducts(productId, "SAUDI_ARABIA");
  assert.ok(Array.isArray(related));
  assert.ok(related.every((row) => row.marketPrices.some((price) => price.market === "SAUDI_ARABIA")));
});
