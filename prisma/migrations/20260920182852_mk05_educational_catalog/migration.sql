-- CreateEnum
CREATE TYPE "ProductLanguage" AS ENUM ('ARABIC', 'ENGLISH', 'BILINGUAL', 'LANGUAGE_INDEPENDENT');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "showInNavigation" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "difficultyLevel" "DifficultyLevel",
ADD COLUMN     "dimensions" TEXT,
ADD COLUMN     "materials" TEXT,
ADD COLUMN     "maxAgeMonths" INTEGER,
ADD COLUMN     "minAgeMonths" INTEGER,
ADD COLUMN     "numberOfPieces" INTEGER,
ADD COLUMN     "primaryCategoryId" TEXT,
ADD COLUMN     "productLanguage" "ProductLanguage" NOT NULL DEFAULT 'LANGUAGE_INDEPENDENT',
ADD COLUMN     "recommendedPlayers" TEXT,
ADD COLUMN     "safetyNotes" TEXT,
ADD COLUMN     "supervisionRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "usageInstructions" TEXT;

-- CreateTable
CREATE TABLE "ProductCategory" (
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("productId","categoryId")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "descriptionEn" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSkill" (
    "productId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "ProductSkill_pkey" PRIMARY KEY ("productId","skillId")
);

-- CreateTable
CREATE TABLE "LearningObjective" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "descriptionEn" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningObjective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductLearningObjective" (
    "productId" TEXT NOT NULL,
    "learningObjectiveId" TEXT NOT NULL,

    CONSTRAINT "ProductLearningObjective_pkey" PRIMARY KEY ("productId","learningObjectiveId")
);

-- CreateTable
CREATE TABLE "ProductType" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductProductType" (
    "productId" TEXT NOT NULL,
    "productTypeId" TEXT NOT NULL,

    CONSTRAINT "ProductProductType_pkey" PRIMARY KEY ("productId","productTypeId")
);

-- CreateTable
CREATE TABLE "UseContext" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UseContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductUseContext" (
    "productId" TEXT NOT NULL,
    "useContextId" TEXT NOT NULL,

    CONSTRAINT "ProductUseContext_pkey" PRIMARY KEY ("productId","useContextId")
);

-- CreateTable
CREATE TABLE "AgeGroup" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "minAgeMonths" INTEGER NOT NULL,
    "maxAgeMonths" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgeGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAgeGroup" (
    "productId" TEXT NOT NULL,
    "ageGroupId" TEXT NOT NULL,

    CONSTRAINT "ProductAgeGroup_pkey" PRIMARY KEY ("productId","ageGroupId")
);

-- CreateIndex
CREATE INDEX "ProductCategory_categoryId_productId_idx" ON "ProductCategory"("categoryId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_slug_key" ON "Skill"("slug");

-- CreateIndex
CREATE INDEX "Skill_isActive_sortOrder_idx" ON "Skill"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductSkill_skillId_productId_idx" ON "ProductSkill"("skillId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningObjective_slug_key" ON "LearningObjective"("slug");

-- CreateIndex
CREATE INDEX "LearningObjective_isActive_sortOrder_idx" ON "LearningObjective"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductLearningObjective_learningObjectiveId_productId_idx" ON "ProductLearningObjective"("learningObjectiveId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductType_slug_key" ON "ProductType"("slug");

-- CreateIndex
CREATE INDEX "ProductType_isActive_sortOrder_idx" ON "ProductType"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductProductType_productTypeId_productId_idx" ON "ProductProductType"("productTypeId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "UseContext_slug_key" ON "UseContext"("slug");

-- CreateIndex
CREATE INDEX "UseContext_isActive_sortOrder_idx" ON "UseContext"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductUseContext_useContextId_productId_idx" ON "ProductUseContext"("useContextId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "AgeGroup_slug_key" ON "AgeGroup"("slug");

-- CreateIndex
CREATE INDEX "AgeGroup_minAgeMonths_maxAgeMonths_idx" ON "AgeGroup"("minAgeMonths", "maxAgeMonths");

-- CreateIndex
CREATE INDEX "AgeGroup_isActive_sortOrder_idx" ON "AgeGroup"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductAgeGroup_ageGroupId_productId_idx" ON "ProductAgeGroup"("ageGroupId", "productId");

-- CreateIndex
CREATE INDEX "Product_primaryCategoryId_idx" ON "Product"("primaryCategoryId");

-- CreateIndex
CREATE INDEX "Product_minAgeMonths_maxAgeMonths_idx" ON "Product"("minAgeMonths", "maxAgeMonths");

-- CreateIndex
CREATE INDEX "Product_productLanguage_idx" ON "Product"("productLanguage");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_primaryCategoryId_fkey" FOREIGN KEY ("primaryCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSkill" ADD CONSTRAINT "ProductSkill_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSkill" ADD CONSTRAINT "ProductSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLearningObjective" ADD CONSTRAINT "ProductLearningObjective_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLearningObjective" ADD CONSTRAINT "ProductLearningObjective_learningObjectiveId_fkey" FOREIGN KEY ("learningObjectiveId") REFERENCES "LearningObjective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductProductType" ADD CONSTRAINT "ProductProductType_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductProductType" ADD CONSTRAINT "ProductProductType_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductUseContext" ADD CONSTRAINT "ProductUseContext_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductUseContext" ADD CONSTRAINT "ProductUseContext_useContextId_fkey" FOREIGN KEY ("useContextId") REFERENCES "UseContext"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAgeGroup" ADD CONSTRAINT "ProductAgeGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAgeGroup" ADD CONSTRAINT "ProductAgeGroup_ageGroupId_fkey" FOREIGN KEY ("ageGroupId") REFERENCES "AgeGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
