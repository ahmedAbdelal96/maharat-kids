-- CreateEnum
CREATE TYPE "public"."UserType" AS ENUM ('ADMIN', 'CUSTOMER');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "type" "public"."UserType" NOT NULL DEFAULT 'CUSTOMER';

-- Preserve the current account meaning before the legacy CUSTOMER role is removed.
UPDATE "public"."User" AS u
SET "type" = 'ADMIN'
WHERE EXISTS (
  SELECT 1
  FROM "public"."UserRole" AS ur
  JOIN "public"."Role" AS r ON r."id" = ur."roleId"
  WHERE ur."userId" = u."id"
    AND (
      r."name" = 'ADMIN'
      OR EXISTS (
        SELECT 1
        FROM "public"."RolePermission" AS rp
        JOIN "public"."Permission" AS p ON p."id" = rp."permissionId"
        WHERE rp."roleId" = r."id"
          AND p."key" = 'admin.access'
      )
    )
);

-- CUSTOMER is now an account type, not an administration RBAC role.
DELETE FROM "public"."UserRole"
WHERE "roleId" IN (
  SELECT "id" FROM "public"."Role" WHERE "name" = 'CUSTOMER'
);

DELETE FROM "public"."RolePermission"
WHERE "roleId" IN (
  SELECT "id" FROM "public"."Role" WHERE "name" = 'CUSTOMER'
);

DELETE FROM "public"."Role"
WHERE "name" = 'CUSTOMER';
