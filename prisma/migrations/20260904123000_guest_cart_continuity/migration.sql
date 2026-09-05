-- Guest carts reuse the existing Cart and CartItem tables.
ALTER TABLE "Cart" ALTER COLUMN "customerId" DROP NOT NULL;

ALTER TABLE "Cart" ADD COLUMN "guestTokenHash" TEXT;

CREATE UNIQUE INDEX "Cart_guestTokenHash_key" ON "Cart"("guestTokenHash");
CREATE INDEX "Cart_updatedAt_idx" ON "Cart"("updatedAt");

ALTER TABLE "Cart"
  ADD CONSTRAINT "Cart_owner_check"
  CHECK (("customerId" IS NOT NULL AND "guestTokenHash" IS NULL) OR ("customerId" IS NULL AND "guestTokenHash" IS NOT NULL));
