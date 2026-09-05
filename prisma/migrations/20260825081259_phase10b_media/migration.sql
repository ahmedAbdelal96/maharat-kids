-- AlterTable
ALTER TABLE "public"."Category" ADD COLUMN     "imageMediaId" TEXT;

-- AlterTable
ALTER TABLE "public"."ProductImage" ADD COLUMN     "mediaId" TEXT,
ALTER COLUMN "url" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."Media" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- Preserve existing URL-backed images by representing them as legacy Media records.
-- Their path remains the external URL, so the local provider will never delete them.
INSERT INTO "public"."Media" ("id", "url", "path", "filename", "mimeType", "size", "createdAt", "updatedAt")
SELECT md5('legacy-media:' || legacy."url"), legacy."url", legacy."url",
       'legacy-' || md5(legacy."url"), 'application/octet-stream', 0,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT "imageUrl" AS "url"
    FROM "public"."Category"
    WHERE "imageUrl" IS NOT NULL
    UNION
    SELECT DISTINCT "url"
    FROM "public"."ProductImage"
    WHERE "url" IS NOT NULL
) AS legacy;

UPDATE "public"."Category" AS category
SET "imageMediaId" = media."id"
FROM "public"."Media" AS media
WHERE category."imageUrl" IS NOT NULL
  AND media."url" = category."imageUrl";

UPDATE "public"."ProductImage" AS product_image
SET "mediaId" = media."id"
FROM "public"."Media" AS media
WHERE product_image."url" IS NOT NULL
  AND media."url" = product_image."url";

-- CreateIndex
CREATE INDEX "Media_path_idx" ON "public"."Media"("path");

-- CreateIndex
CREATE INDEX "Category_imageMediaId_idx" ON "public"."Category"("imageMediaId");

-- CreateIndex
CREATE INDEX "ProductImage_mediaId_idx" ON "public"."ProductImage"("mediaId");

-- AddForeignKey
ALTER TABLE "public"."Category" ADD CONSTRAINT "Category_imageMediaId_fkey" FOREIGN KEY ("imageMediaId") REFERENCES "public"."Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductImage" ADD CONSTRAINT "ProductImage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "public"."Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
