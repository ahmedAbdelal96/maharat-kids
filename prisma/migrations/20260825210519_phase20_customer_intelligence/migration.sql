-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "firstLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "loginCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketingConsentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_type_status_createdAt_idx" ON "public"."User"("type", "status", "createdAt");

-- CreateIndex
CREATE INDEX "User_type_marketingConsent_idx" ON "public"."User"("type", "marketingConsent");
