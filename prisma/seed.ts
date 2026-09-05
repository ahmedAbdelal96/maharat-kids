import { PrismaClient } from "@prisma/client";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  defaultPermissionDefinitions,
  defaultRoleDefinitions,
} from "../src/modules/identity/constants";
import { defaultStoreSettings } from "../src/modules/store/constants";
import { defaultPaymentMethod } from "../src/modules/payments/constants";
import { ScryptPasswordHasher } from "../src/modules/auth/providers/password-hasher-core";

const prisma = new PrismaClient();

type SeedMediaKind = "categories" | "products";

function seedSvg(label: string, start: string, end: string): string {
  const safeLabel = label.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${start}"/><stop offset="1" stop-color="${end}"/></linearGradient></defs><rect width="1200" height="900" fill="url(#g)"/><circle cx="1000" cy="140" r="180" fill="white" fill-opacity=".14"/><circle cx="170" cy="760" r="260" fill="white" fill-opacity=".1"/><text x="600" y="760" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="64" font-weight="700">${safeLabel}</text></svg>`;
}

async function ensureSeedMedia(kind: SeedMediaKind, key: string, label: string, start: string, end: string) {
  const filename = `seed-${key}.svg`;
  const path = `uploads/${kind}/${filename}`;
  const absolutePath = join(process.cwd(), "public", ...path.split("/"));
  const contents = seedSvg(label, start, end);
  await mkdir(join(process.cwd(), "public", "uploads", kind), { recursive: true });
  await writeFile(absolutePath, contents, "utf8");

  const existing = await prisma.media.findFirst({ where: { path } });
  const data = {
    url: `/${path}`,
    path,
    filename,
    mimeType: "image/svg+xml",
    size: Buffer.byteLength(contents),
  };

  return existing
    ? prisma.media.update({ where: { id: existing.id }, data })
    : prisma.media.create({ data });
}

async function removeSeedMediaIfUnused(mediaId: string | null) {
  if (!mediaId) return;
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    include: { _count: { select: { productImages: true, categoryImages: true } } },
  });
  if (!media || !media.filename.startsWith("seed-")) return;
  if (media._count.productImages > 0 || media._count.categoryImages > 0) return;
  await prisma.media.delete({ where: { id: media.id } });
  await unlink(join(process.cwd(), "public", ...media.path.split("/"))).catch(() => undefined);
}

async function seedCatalog(): Promise<void> {
  const categoryDefinitions = [
    { slug: "home-living", name: "Home & Living", parentSlug: null, description: "Warm, practical pieces for everyday spaces.", start: "#0f766e", end: "#164e63" },
    { slug: "furniture", name: "Furniture", parentSlug: "home-living", description: "Comfortable foundations for living and dining rooms.", start: "#0369a1", end: "#1e3a8a" },
    { slug: "chairs", name: "Chairs", parentSlug: "furniture", description: "Seating designed for long, comfortable days.", start: "#7c3aed", end: "#312e81" },
    { slug: "tables", name: "Tables", parentSlug: "furniture", description: "Clean surfaces for meals, work, and gathering.", start: "#b45309", end: "#7c2d12" },
    { slug: "technology", name: "Technology", parentSlug: null, description: "Useful technology for work, home, and travel.", start: "#1d4ed8", end: "#1e1b4b" },
    { slug: "mobile-devices", name: "Mobile Devices", parentSlug: "technology", description: "Connected essentials that keep up with your day.", start: "#0891b2", end: "#164e63" },
    { slug: "smartphones", name: "Smartphones", parentSlug: "mobile-devices", description: "Modern phones with bright displays and reliable battery life.", start: "#2563eb", end: "#172554" },
    { slug: "accessories", name: "Accessories", parentSlug: "mobile-devices", description: "Small upgrades that make devices easier to use.", start: "#db2777", end: "#4c1d95" },
    { slug: "fashion", name: "Fashion", parentSlug: null, description: "Simple, versatile pieces for every wardrobe.", start: "#be123c", end: "#4c0519" },
    { slug: "men", name: "Men", parentSlug: "fashion", description: "Everyday layers and accessories with clean lines.", start: "#475569", end: "#0f172a" },
    { slug: "women", name: "Women", parentSlug: "fashion", description: "Easy-to-wear pieces for work and weekends.", start: "#c026d3", end: "#581c87" },
  ] as const;

  const categoryMedia = new Map<string, string>();
  for (const category of categoryDefinitions) {
    const media = await ensureSeedMedia("categories", category.slug, category.name, category.start, category.end);
    categoryMedia.set(category.slug, media.id);
  }

  const categoryIds = new Map<string, string>();
  for (const category of categoryDefinitions) {
    const parentId = category.parentSlug ? categoryIds.get(category.parentSlug) ?? null : null;
    const saved = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, parentId, description: category.description, imageMediaId: categoryMedia.get(category.slug), isActive: true },
      create: { slug: category.slug, name: category.name, parentId, description: category.description, imageMediaId: categoryMedia.get(category.slug), isActive: true },
    });
    categoryIds.set(category.slug, saved.id);
  }

  const productDefinitions = [
    { slug: "oak-lounge-chair", name: "Oak Lounge Chair", categorySlug: "chairs", price: "149.00", compareAtPrice: "179.00", stockQuantity: 12, isFeatured: true, description: "A warm oak frame with a comfortable woven seat for quiet corners." },
    { slug: "solid-wood-dining-table", name: "Solid Wood Dining Table", categorySlug: "tables", price: "329.00", compareAtPrice: null, stockQuantity: 5, isFeatured: true, description: "A sturdy dining table with a clean silhouette for shared meals." },
    { slug: "pocket-smartphone", name: "Pocket Smartphone", categorySlug: "smartphones", price: "549.00", compareAtPrice: "599.00", stockQuantity: 18, isFeatured: true, description: "A bright, responsive phone made for everyday communication and media." },
    { slug: "everyday-phone-case", name: "Everyday Phone Case", categorySlug: "accessories", price: "24.00", compareAtPrice: null, stockQuantity: 64, isFeatured: false, description: "A lightweight protective case with a soft-touch grip." },
    { slug: "mens-utility-jacket", name: "Men's Utility Jacket", categorySlug: "men", price: "89.00", compareAtPrice: "109.00", stockQuantity: 22, isFeatured: true, description: "A versatile layer with practical pockets and a relaxed fit." },
    { slug: "womens-canvas-tote", name: "Women's Canvas Tote", categorySlug: "women", price: "42.00", compareAtPrice: null, stockQuantity: 31, isFeatured: true, description: "A durable daily tote with room for the essentials." },
    { slug: "reading-floor-lamp", name: "Reading Floor Lamp", categorySlug: "home-living", price: "118.00", compareAtPrice: null, stockQuantity: 9, isFeatured: false, description: "Soft directional light for reading, relaxing, and late-night work." },
    { slug: "weekend-backpack", name: "Weekend Backpack", categorySlug: "fashion", price: "68.00", compareAtPrice: null, stockQuantity: 0, isFeatured: false, description: "A compact, structured backpack for short trips and busy days." },
  ] as const;

  for (const product of productDefinitions) {
    const primaryMedia = await ensureSeedMedia("products", `${product.slug}-primary`, product.name, "#334155", "#0f172a");
    const detailMedia = await ensureSeedMedia("products", `${product.slug}-detail`, `${product.name} detail`, "#64748b", "#1e293b");
    const existing = await prisma.product.findUnique({ where: { slug: product.slug }, select: { id: true, images: { select: { mediaId: true } } } });
    const data = {
      name: product.name,
      shortDescription: product.description,
      description: product.description,
      sku: `SEED-${product.slug.toUpperCase().replaceAll("-", "-")}`,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      status: "ACTIVE" as const,
      isFeatured: product.isFeatured,
      categoryId: categoryIds.get(product.categorySlug) ?? null,
      trackInventory: true,
      stockQuantity: product.stockQuantity,
    };
    if (existing) {
      await prisma.$transaction([
        prisma.product.update({ where: { id: existing.id }, data }),
        prisma.productImage.deleteMany({ where: { productId: existing.id } }),
        prisma.productImage.createMany({
          data: [
            { productId: existing.id, url: null, mediaId: primaryMedia.id, sortOrder: 0, isPrimary: true, altText: product.name },
            { productId: existing.id, url: null, mediaId: detailMedia.id, sortOrder: 1, isPrimary: false, altText: `${product.name} detail` },
          ],
        }),
      ]);
      for (const oldImage of existing.images) {
        if (oldImage.mediaId !== primaryMedia.id && oldImage.mediaId !== detailMedia.id) await removeSeedMediaIfUnused(oldImage.mediaId);
      }
    } else {
      const created = await prisma.product.create({ data: { slug: product.slug, ...data } });
      await prisma.productImage.createMany({
        data: [
          { productId: created.id, url: null, mediaId: primaryMedia.id, sortOrder: 0, isPrimary: true, altText: product.name },
          { productId: created.id, url: null, mediaId: detailMedia.id, sortOrder: 1, isPrimary: false, altText: `${product.name} detail` },
        ],
      });
    }
  }
}

async function main(): Promise<void> {
  const seedAdminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!seedAdminEmail || !seedAdminPassword || seedAdminPassword.length < 12) {
    throw new Error(
      "SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of at least 12 characters are required to bootstrap the development ADMIN.",
    );
  }

  if (!process.env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET is required to hash the development ADMIN password.");
  }

  const obsoleteRoles = await prisma.role.findMany({
    where: {
      name: {
        in: ["CUSTOMER"],
      },
    },
    select: { id: true },
  });

  if (obsoleteRoles.length > 0) {
    const roleIds = obsoleteRoles.map(({ id }) => id);
    await prisma.userRole.deleteMany({ where: { roleId: { in: roleIds } } });
    await prisma.rolePermission.deleteMany({ where: { roleId: { in: roleIds } } });
    await prisma.role.deleteMany({ where: { id: { in: roleIds } } });
  }

  const permissions = new Map<string, string>();

  for (const definition of defaultPermissionDefinitions) {
    const permission = await prisma.permission.upsert({
      where: { key: definition.key },
      update: { description: definition.description },
      create: definition,
    });

    permissions.set(permission.key, permission.id);
  }

  for (const definition of defaultRoleDefinitions) {
    const role = await prisma.role.upsert({
      where: { name: definition.name },
      update: { description: definition.description },
      create: {
        name: definition.name,
        description: definition.description,
      },
    });

    for (const key of definition.permissions) {
      const permissionId = permissions.get(key);

      if (!permissionId) {
        throw new Error(`Missing seeded permission: ${key}`);
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId },
        },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }

  for (const setting of defaultStoreSettings) {
    await prisma.storeSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  await prisma.storeSetting.deleteMany({
    where: {
      key: {
        notIn: defaultStoreSettings.map(({ key }) => key),
      },
    },
  });

  await prisma.paymentMethod.upsert({
    where: { code: defaultPaymentMethod.code },
    update: {
      name: defaultPaymentMethod.name,
      type: defaultPaymentMethod.type,
      isSystem: true,
      enabled: defaultPaymentMethod.enabled,
      instructions: defaultPaymentMethod.instructions,
    },
    create: defaultPaymentMethod,
  });

  const adminRole = await prisma.role.findUnique({
    where: { name: "ADMIN" },
  });

  if (!adminRole) {
    throw new Error("ADMIN role was not seeded.");
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email: seedAdminEmail },
  });
  const passwordHash = existingAdmin
    ? existingAdmin.passwordHash
    : await new ScryptPasswordHasher(process.env.AUTH_SECRET).hash(seedAdminPassword);
  const adminUser = existingAdmin
    ? await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { type: "ADMIN", status: "ACTIVE" },
      })
    : await prisma.user.create({
        data: {
          email: seedAdminEmail,
          passwordHash,
          status: "ACTIVE",
        },
      });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: adminUser.id, roleId: adminRole.id },
    },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  // Demo catalog data is useful in development but must never be written by a
  // production bootstrap unless explicitly enabled by the deployment owner.
  const seedDemoCatalog = process.env.NODE_ENV !== "production" || process.env.SEED_DEMO_CATALOG === "true";
  if (seedDemoCatalog) {
    await seedCatalog();
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
