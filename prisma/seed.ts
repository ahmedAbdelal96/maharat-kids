import { PrismaClient } from "@prisma/client";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  defaultPermissionDefinitions,
  defaultRoleDefinitions,
} from "../src/modules/identity/constants";
import { defaultStoreSettings } from "../src/modules/store/constants";
import { defaultPaymentMethods } from "../src/modules/payments/constants";
import { ScryptPasswordHasher } from "../src/modules/auth/providers/password-hasher-core";

const prisma = new PrismaClient();

type SeedMediaKind = "categories" | "products";

function seedSvg(_label: string, start: string, end: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${start}"/><stop offset="1" stop-color="${end}"/></linearGradient></defs><rect width="1200" height="900" fill="url(#g)"/><circle cx="1000" cy="140" r="180" fill="white" fill-opacity=".14"/><circle cx="170" cy="760" r="260" fill="white" fill-opacity=".1"/><path d="M120 180h960M120 720h960" stroke="white" stroke-opacity=".08" stroke-width="3"/></svg>`;
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
    { slug: "home-living", name: "Learning & Play", parentSlug: null, description: "Thoughtful tools for curious minds and everyday discovery.", start: "#125b78", end: "#2e8da4" },
    { slug: "furniture", name: "Create & Make", parentSlug: "home-living", description: "Creative materials for hands-on learning and expression.", start: "#4e9b68", end: "#245442" },
    { slug: "chairs", name: "Early Years", parentSlug: "furniture", description: "Gentle first steps for growing minds.", start: "#f3a928", end: "#d88b0d" },
    { slug: "tables", name: "School Skills", parentSlug: "furniture", description: "Build confidence through focused, playful practice.", start: "#e66a89", end: "#b64567" },
    { slug: "technology", name: "Discover & Explore", parentSlug: null, description: "Activities that turn curiosity into new skills.", start: "#125b78", end: "#0d465e" },
    { slug: "mobile-devices", name: "Puzzles & Games", parentSlug: "technology", description: "Playful challenges for thinking, sharing, and problem solving.", start: "#2e8da4", end: "#125b78" },
    { slug: "smartphones", name: "STEM & Discovery", parentSlug: "mobile-devices", description: "Explore science, numbers, and the world around us.", start: "#4e9b68", end: "#125b78" },
    { slug: "accessories", name: "Creative Kits", parentSlug: "mobile-devices", description: "Open-ended kits for making something wonderful.", start: "#e66a89", end: "#b64567" },
    { slug: "fashion", name: "By Age", parentSlug: null, description: "Find a thoughtful next step for every stage.", start: "#f3a928", end: "#e66a89" },
    { slug: "men", name: "Ages 3–5", parentSlug: "fashion", description: "Playful foundations for early learners.", start: "#4e9b68", end: "#245442" },
    { slug: "women", name: "Ages 6–8", parentSlug: "fashion", description: "Growing confidence through play and practice.", start: "#2e8da4", end: "#125b78" },
  ] as const;

  // Keep development presentation focused on the Maharat Kids catalog without
  // deleting any existing records that may be referenced by local test data.
  await prisma.category.updateMany({
    where: { slug: { notIn: categoryDefinitions.map(({ slug }) => slug) } },
    data: { isActive: false },
  });

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
    const arabicCategoryNames: Record<string, string> = {
      "home-living": "التعلم واللعب",
      furniture: "اصنع وابتكر",
      chairs: "السنوات الأولى",
      tables: "مهارات المدرسة",
      technology: "اكتشف واستكشف",
      "mobile-devices": "الألغاز والألعاب",
      smartphones: "العلوم والاكتشاف",
      accessories: "حقائب إبداعية",
      fashion: "حسب العمر",
      men: "من 3 إلى 5 سنوات",
      women: "من 6 إلى 8 سنوات",
    };
    const arabicCategoryDescriptions: Record<string, string> = {
      "home-living": "أدوات مختارة لعقول فضولية واكتشاف يومي.",
      furniture: "خامات إبداعية للتعلم العملي والتعبير.",
      chairs: "خطوات أولى لطيفة لعقول تنمو.",
      tables: "نبني الثقة من خلال التدريب واللعب.",
      technology: "أنشطة تحول الفضول إلى مهارات جديدة.",
      "mobile-devices": "تحديات مرحة للتفكير والمشاركة وحل المشكلات.",
      smartphones: "استكشف العلوم والأرقام والعالم من حولك.",
      accessories: "مجموعات مفتوحة لصنع شيء رائع.",
      fashion: "اختر الخطوة التالية المناسبة لكل مرحلة.",
      men: "أساسيات مرحة للمتعلمين الصغار.",
      women: "ثقة تنمو من خلال اللعب والتدريب.",
    };
    const arabicCategoryDescription = arabicCategoryDescriptions[category.slug] ?? category.description;
    await prisma.categoryTranslation.upsert({ where: { categoryId_locale: { categoryId: saved.id, locale: "ar" } }, update: { name: arabicCategoryNames[category.slug] ?? category.name, description: arabicCategoryDescription }, create: { categoryId: saved.id, locale: "ar", name: arabicCategoryNames[category.slug] ?? category.name, description: arabicCategoryDescription } });
    await prisma.categoryTranslation.upsert({ where: { categoryId_locale: { categoryId: saved.id, locale: "en" } }, update: { name: category.name, description: category.description }, create: { categoryId: saved.id, locale: "en", name: category.name, description: category.description } });
  }

  const productDefinitions = [
    { slug: "oak-lounge-chair", name: "Build & Balance Blocks", categorySlug: "chairs", price: "149.00", compareAtPrice: "179.00", stockQuantity: 12, isFeatured: true, description: "Open-ended wooden blocks for building, balancing, and storytelling." },
    { slug: "solid-wood-dining-table", name: "My First Discovery Set", categorySlug: "tables", price: "329.00", compareAtPrice: null, stockQuantity: 5, isFeatured: true, description: "A hands-on set of gentle activities for curious early learners." },
    { slug: "pocket-smartphone", name: "Little Scientist Kit", categorySlug: "smartphones", price: "549.00", compareAtPrice: "599.00", stockQuantity: 18, isFeatured: true, description: "Safe experiments that make science feel close, clear, and exciting." },
    { slug: "everyday-phone-case", name: "Storytelling Cards", categorySlug: "accessories", price: "24.00", compareAtPrice: null, stockQuantity: 64, isFeatured: false, description: "A playful card set for language, imagination, and shared stories." },
    { slug: "mens-utility-jacket", name: "Make It Your Way Art Kit", categorySlug: "men", price: "89.00", compareAtPrice: "109.00", stockQuantity: 22, isFeatured: true, description: "Creative materials that invite children to draw, build, and explore." },
    { slug: "womens-canvas-tote", name: "Little Learner Activity Book", categorySlug: "women", price: "42.00", compareAtPrice: null, stockQuantity: 31, isFeatured: true, description: "A bright collection of age-friendly activities for quiet moments." },
    { slug: "reading-floor-lamp", name: "Feelings & Friends Game", categorySlug: "home-living", price: "118.00", compareAtPrice: null, stockQuantity: 9, isFeatured: false, description: "A gentle game for conversation, empathy, and confident expression." },
    { slug: "weekend-backpack", name: "Little Explorer Bag", categorySlug: "fashion", price: "68.00", compareAtPrice: null, stockQuantity: 0, isFeatured: false, description: "A light, practical bag for carrying small discoveries on the go." },
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
    const arabicProductNames: Record<string, string> = {
      "oak-lounge-chair": "مكعبات البناء والتوازن",
      "solid-wood-dining-table": "مجموعة الاكتشاف الأولى",
      "pocket-smartphone": "مجموعة العالم الصغير",
      "everyday-phone-case": "بطاقات الحكايات",
      "mens-utility-jacket": "مجموعة اصنعها بطريقتك",
      "womens-canvas-tote": "كتاب أنشطة المتعلم الصغير",
      "reading-floor-lamp": "لعبة المشاعر والأصدقاء",
      "weekend-backpack": "حقيبة المستكشف الصغير",
    };
    const arabicProductDescriptions: Record<string, string> = {
      "oak-lounge-chair": "مكعبات خشبية مفتوحة للبناء والتوازن وصناعة الحكايات.",
      "solid-wood-dining-table": "أنشطة عملية لطيفة للمتعلمين الصغار الفضوليين.",
      "pocket-smartphone": "تجارب آمنة تجعل العلوم قريبة وواضحة وممتعة.",
      "everyday-phone-case": "بطاقات مرحة للغة والخيال والحكايات المشتركة.",
      "mens-utility-jacket": "خامات إبداعية للرسم والبناء والاستكشاف.",
      "womens-canvas-tote": "أنشطة مشرقة مناسبة للعمر للحظات الهادئة.",
      "reading-floor-lamp": "لعبة لطيفة للحوار والتعاطف والتعبير الواثق.",
      "weekend-backpack": "حقيبة خفيفة وعملية لحمل الاكتشافات الصغيرة.",
    };
    const arabicProductDescription = arabicProductDescriptions[product.slug] ?? product.description;
    const savedProduct = await prisma.product.findUniqueOrThrow({ where: { slug: product.slug }, select: { id: true } });
    await prisma.productMarketPrice.upsert({ where: { productId_market: { productId: savedProduct.id, market: "SAUDI_ARABIA" } }, update: { price: product.price, compareAtPrice: product.compareAtPrice }, create: { productId: savedProduct.id, market: "SAUDI_ARABIA", price: product.price, compareAtPrice: product.compareAtPrice } });
    const egyptSeedPrices: Record<string, { price: string; compareAtPrice: string | null }> = { "oak-lounge-chair": { price: "900.00", compareAtPrice: "1050.00" }, "solid-wood-dining-table": { price: "1850.00", compareAtPrice: null }, "pocket-smartphone": { price: "3100.00", compareAtPrice: "3400.00" }, "everyday-phone-case": { price: "180.00", compareAtPrice: null }, "mens-utility-jacket": { price: "520.00", compareAtPrice: "650.00" }, "womens-canvas-tote": { price: "290.00", compareAtPrice: null }, "reading-floor-lamp": { price: "700.00", compareAtPrice: null }, "weekend-backpack": { price: "420.00", compareAtPrice: null } };
    const egyptPrice = egyptSeedPrices[product.slug];
    await prisma.productMarketPrice.upsert({ where: { productId_market: { productId: savedProduct.id, market: "EGYPT" } }, update: egyptPrice, create: { productId: savedProduct.id, market: "EGYPT", ...egyptPrice } });
    await prisma.productTranslation.upsert({ where: { productId_locale: { productId: savedProduct.id, locale: "ar" } }, update: { name: arabicProductNames[product.slug] ?? product.name, shortDescription: arabicProductDescription, description: arabicProductDescription }, create: { productId: savedProduct.id, locale: "ar", name: arabicProductNames[product.slug] ?? product.name, shortDescription: arabicProductDescription, description: arabicProductDescription } });
    await prisma.productTranslation.upsert({ where: { productId_locale: { productId: savedProduct.id, locale: "en" } }, update: { name: product.name, shortDescription: product.description, description: product.description }, create: { productId: savedProduct.id, locale: "en", name: product.name, shortDescription: product.description, description: product.description } });
  }

  // Educational taxonomies are intentionally data, not code paths. Administrators
  // can add, reorder, disable, and relate new values without a migration.
  const educationalCategories = [
    { slug: "talking-language", name: "Speech & Language", nameAr: "التخاطب واللغة", parentSlug: null },
    { slug: "talking-books", name: "Speech Books", nameAr: "كتب التخاطب", parentSlug: "talking-language" },
    { slug: "talking-tools", name: "Speech Tools", nameAr: "أدوات التخاطب", parentSlug: "talking-language" },
    { slug: "focus-attention", name: "Focus & Attention", nameAr: "التركيز والانتباه", parentSlug: null },
    { slug: "visual-perception", name: "Visual Perception", nameAr: "الإدراك البصري", parentSlug: "focus-attention" },
    { slug: "sensory-integration", name: "Sensory Integration", nameAr: "التكامل الحسي", parentSlug: null },
    { slug: "creative-play", name: "Play & Learn", nameAr: "ألعب وتعلم", parentSlug: null },
    { slug: "arabic-learning", name: "Learn Arabic", nameAr: "تعلم العربية", parentSlug: "creative-play" },
    { slug: "puzzles", name: "Puzzles", nameAr: "البازل", parentSlug: "creative-play" },
    { slug: "educational-games", name: "Educational Games", nameAr: "الألعاب التعليمية", parentSlug: null },
    { slug: "educational-books", name: "Educational Books", nameAr: "الكتب التعليمية", parentSlug: null },
    { slug: "bundles", name: "Bundles", nameAr: "البكجات والمجموعات", parentSlug: null },
  ] as const;
  const educationalIds = new Map<string, string>();
  for (const category of educationalCategories) {
    const parentId = category.parentSlug ? educationalIds.get(category.parentSlug) ?? null : null;
    const saved = await prisma.category.upsert({ where: { slug: category.slug }, update: { name: category.name, parentId, isActive: true, showInNavigation: true }, create: { slug: category.slug, name: category.name, parentId, isActive: true, showInNavigation: true } });
    educationalIds.set(category.slug, saved.id);
    await prisma.categoryTranslation.upsert({ where: { categoryId_locale: { categoryId: saved.id, locale: "ar" } }, update: { name: category.nameAr }, create: { categoryId: saved.id, locale: "ar", name: category.nameAr } });
    await prisma.categoryTranslation.upsert({ where: { categoryId_locale: { categoryId: saved.id, locale: "en" } }, update: { name: category.name }, create: { categoryId: saved.id, locale: "en", name: category.name } });
  }
  const seedTaxonomy = async (model: "skill" | "learningObjective" | "productType" | "useContext", rows: Array<{ slug: string; nameAr: string; nameEn: string }>) => {
    for (const [sortOrder, row] of rows.entries()) {
      const args = { where: { slug: row.slug }, update: { ...row, isActive: true, sortOrder }, create: { ...row, sortOrder } };
      if (model === "skill") await prisma.skill.upsert(args);
      else if (model === "learningObjective") await prisma.learningObjective.upsert(args);
      else if (model === "productType") await prisma.productType.upsert(args);
      else await prisma.useContext.upsert(args);
    }
  };
  await seedTaxonomy("skill", [
    { slug: "focus", nameAr: "التركيز", nameEn: "Focus" }, { slug: "attention", nameAr: "الانتباه", nameEn: "Attention" }, { slug: "visual-perception", nameAr: "الإدراك البصري", nameEn: "Visual perception" }, { slug: "auditory-perception", nameAr: "الإدراك السمعي", nameEn: "Auditory perception" }, { slug: "language", nameAr: "اللغة", nameEn: "Language" }, { slug: "fine-motor", nameAr: "المهارات الحركية الدقيقة", nameEn: "Fine motor skills" }, { slug: "problem-solving", nameAr: "حل المشكلات", nameEn: "Problem solving" }, { slug: "sensory-integration", nameAr: "التكامل الحسي", nameEn: "Sensory integration" }, { slug: "independence", nameAr: "الاستقلالية", nameEn: "Independence" }, { slug: "sequencing", nameAr: "التسلسل", nameEn: "Sequencing" },
  ]);
  await seedTaxonomy("learningObjective", [
    { slug: "sustain-attention", nameAr: "الحفاظ على الانتباه لمدة أطول", nameEn: "Sustain attention for longer" }, { slug: "pencil-grip", nameAr: "مسك القلم", nameEn: "Pencil grip" }, { slug: "trace-lines", nameAr: "تتبع الخطوط", nameEn: "Trace lines" }, { slug: "build-vocabulary", nameAr: "تنمية الحصيلة اللغوية", nameEn: "Build vocabulary" }, { slug: "daily-routines", nameAr: "ترتيب خطوات الروتين اليومي", nameEn: "Sequence daily routines" },
  ]);
  await seedTaxonomy("productType", [
    { slug: "book", nameAr: "كتاب", nameEn: "Book" }, { slug: "puzzle", nameAr: "بازل", nameEn: "Puzzle" }, { slug: "educational-game", nameAr: "لعبة تعليمية", nameEn: "Educational game" }, { slug: "learning-tool", nameAr: "أداة تعليمية", nameEn: "Learning tool" }, { slug: "cards", nameAr: "بطاقات", nameEn: "Cards" }, { slug: "bundle", nameAr: "بكج / مجموعة", nameEn: "Bundle" },
  ]);
  await seedTaxonomy("useContext", [
    { slug: "home", nameAr: "المنزل", nameEn: "Home" }, { slug: "nursery", nameAr: "الحضانة", nameEn: "Nursery" }, { slug: "school", nameAr: "المدرسة", nameEn: "School" }, { slug: "speech-center", nameAr: "مركز التخاطب", nameEn: "Speech center" }, { slug: "individual", nameAr: "نشاط فردي", nameEn: "Individual activity" }, { slug: "group", nameAr: "نشاط جماعي", nameEn: "Group activity" },
  ]);
  for (const [slug, nameAr, nameEn, minAgeMonths, maxAgeMonths] of [["six-months-two-years", "6 شهور – سنتين", "6 months – 2 years", 6, 24], ["three-six-years", "3 – 6 سنوات", "3 – 6 years", 36, 72], ["six-twelve-years", "6 – 12 سنة", "6 – 12 years", 72, 144]] as const) await prisma.ageGroup.upsert({ where: { slug }, update: { nameAr, nameEn, minAgeMonths, maxAgeMonths, isActive: true }, create: { slug, nameAr, nameEn, minAgeMonths, maxAgeMonths } });
  const skillFocus = await prisma.skill.findUniqueOrThrow({ where: { slug: "focus" } });
  const objectiveAttention = await prisma.learningObjective.findUniqueOrThrow({ where: { slug: "sustain-attention" } });
  const typePuzzle = await prisma.productType.findUniqueOrThrow({ where: { slug: "puzzle" } });
  const contextHome = await prisma.useContext.findUniqueOrThrow({ where: { slug: "home" } });
  for (const product of await prisma.product.findMany({ where: { status: "ACTIVE" }, select: { id: true, categoryId: true } })) { if (product.categoryId) await prisma.productCategory.upsert({ where: { productId_categoryId: { productId: product.id, categoryId: product.categoryId } }, update: {}, create: { productId: product.id, categoryId: product.categoryId } }); await prisma.productSkill.upsert({ where: { productId_skillId: { productId: product.id, skillId: skillFocus.id } }, update: {}, create: { productId: product.id, skillId: skillFocus.id } }); await prisma.productLearningObjective.upsert({ where: { productId_learningObjectiveId: { productId: product.id, learningObjectiveId: objectiveAttention.id } }, update: {}, create: { productId: product.id, learningObjectiveId: objectiveAttention.id } }); await prisma.productProductType.upsert({ where: { productId_productTypeId: { productId: product.id, productTypeId: typePuzzle.id } }, update: {}, create: { productId: product.id, productTypeId: typePuzzle.id } }); await prisma.productUseContext.upsert({ where: { productId_useContextId: { productId: product.id, useContextId: contextHome.id } }, update: {}, create: { productId: product.id, useContextId: contextHome.id } }); }
}

async function seedBlogCategories(): Promise<void> {
  const categories = [
    { slug: "play-learning", nameAr: "اللعب والتعلم", nameEn: "Play and learning", sortOrder: 0 },
    { slug: "parenting", nameAr: "إرشاد الوالدين", nameEn: "Parenting guidance", sortOrder: 1 },
    { slug: "activities", nameAr: "أنشطة منزلية", nameEn: "At-home activities", sortOrder: 2 },
  ];
  for (const category of categories) {
    await prisma.blogCategory.upsert({ where: { slug: category.slug }, update: { ...category, isActive: true }, create: { ...category, isActive: true } });
  }
}

async function main(): Promise<void> {
  const production = process.env.NODE_ENV === "production";
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

  const payzatyReady = Boolean(process.env.PAYZATY_ACCOUNT_NO && process.env.PAYZATY_SECRET_KEY && process.env.PAYZATY_BASE_URL && process.env.PAYZATY_STATUS_ENDPOINT);
  for (const method of defaultPaymentMethods) {
    const enabled = production
      ? method.type === "CASH_ON_DELIVERY"
        ? method.enabled
        : method.type === "ONLINE_PAYMENT" && payzatyReady
      : method.enabled;
    const record = await prisma.paymentMethod.upsert({
      where: { code: method.code },
      update: { name: method.name, type: method.type, isSystem: true, enabled, instructions: method.instructions, providerKey: method.providerKey },
      create: { ...method, enabled },
    });
    for (const market of ["SAUDI_ARABIA", "EGYPT"] as const) {
      await prisma.paymentMethodMarketConfig.upsert({ where: { market_paymentMethodId: { market, paymentMethodId: record.id } }, update: { enabled, sortOrder: method.sortOrder }, create: { market, paymentMethodId: record.id, enabled, sortOrder: method.sortOrder } });
    }
  }
  if (!production) {
    for (const account of [
      { market: "SAUDI_ARABIA" as const, bankNameAr: "بنك الاختبار", bankNameEn: "Test Bank", accountHolderName: "Maharat Kids Test", iban: "SA0000000000000000000000", accountNumber: "0000000000", swiftCode: null, instructionsAr: "استخدم بيانات التحويل التجريبية فقط.", instructionsEn: "Use the disposable test transfer details only." },
      { market: "EGYPT" as const, bankNameAr: "بنك الاختبار", bankNameEn: "Test Bank Egypt", accountHolderName: "Maharat Kids Test", iban: "EG000000000000000000000000000", accountNumber: "0000000000", swiftCode: null, instructionsAr: "استخدم بيانات التحويل التجريبية فقط.", instructionsEn: "Use the disposable test transfer details only." },
    ]) {
      await prisma.bankTransferAccount.upsert({ where: { id: `seed-${account.market.toLowerCase()}` }, update: { ...account, enabled: true, isDefault: true }, create: { id: `seed-${account.market.toLowerCase()}`, ...account, enabled: true, isDefault: true } });
    }
  } else {
    // A prior development seed must never remain an operational production
    // bank account. Admin configures real accounts after deployment.
    await prisma.bankTransferAccount.updateMany({ where: { id: { startsWith: "seed-" } }, data: { enabled: false, isDefault: false } });
  }

  const adminRole = await prisma.role.findUnique({
    where: { name: "ADMIN" },
  });

  if (!adminRole) {
    throw new Error("ADMIN role was not seeded.");
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email: seedAdminEmail },
  });
  const passwordHash = await new ScryptPasswordHasher(process.env.AUTH_SECRET).hash(seedAdminPassword);
  const adminUser = existingAdmin
    ? await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { type: "ADMIN", status: "ACTIVE", passwordHash },
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
  const seedDemoCatalog = !production;
  if (seedDemoCatalog) {
    await seedCatalog();
  }
  await seedBlogCategories();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
