-- Preserve historical records while giving every existing catalog item an explicit
-- starting price in both markets. Operators must subsequently set independent EGP values.
INSERT INTO "ProductMarketPrice" ("id", "productId", "market", "price", "compareAtPrice", "createdAt", "updatedAt")
SELECT 'mk01-sa-' || "id", "id", 'SAUDI_ARABIA'::"Market", "price", "compareAtPrice", NOW(), NOW()
FROM "Product"
ON CONFLICT ("productId", "market") DO NOTHING;

INSERT INTO "ProductMarketPrice" ("id", "productId", "market", "price", "compareAtPrice", "createdAt", "updatedAt")
SELECT 'mk01-eg-' || "id", "id", 'EGYPT'::"Market", "price", "compareAtPrice", NOW(), NOW()
FROM "Product"
ON CONFLICT ("productId", "market") DO NOTHING;

-- Existing carts/orders did not have an explicit commercial market. Their legacy
-- currency identifies the immutable snapshot; unknown legacy currencies stay null.
UPDATE "Cart" SET "market" = 'SAUDI_ARABIA'::"Market" WHERE "market" IS NULL;
UPDATE "Order" SET "market" = CASE WHEN "currency" = 'EGP' THEN 'EGYPT'::"Market" ELSE 'SAUDI_ARABIA'::"Market" END WHERE "market" IS NULL;
