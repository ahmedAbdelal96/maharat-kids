import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Gift, Percent, Sparkles, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Countdown } from "@/components/ecommerce/countdown";
import { SectionHeader } from "@/components/shared/section-header";
import { getPublicOffers } from "@/modules/promotions/server/queries";
import { PROMOTION_TYPE_LABELS, type PromotionType } from "@/modules/promotions/constants";
import { formatMoney } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Special Offers & Promotions",
  description: "Browse current commercial offers, order discounts, and buy-one-get-one promotions.",
};

function getBadge(type: PromotionType) {
  switch (type) {
    case "ORDER_PERCENTAGE_DISCOUNT":
      return (
        <Badge variant="accent" size="sm" className="gap-1 font-semibold">
          <Percent className="h-3 w-3" />
          {PROMOTION_TYPE_LABELS[type]}
        </Badge>
      );
    case "ORDER_FIXED_DISCOUNT":
      return (
        <Badge variant="accent" size="sm" className="gap-1 font-semibold">
          <Tag className="h-3 w-3" />
          {PROMOTION_TYPE_LABELS[type]}
        </Badge>
      );
    case "BUY_X_GET_Y_FREE":
      return (
        <Badge variant="accent" size="sm" className="gap-1 font-semibold">
          <Gift className="h-3 w-3" />
          {PROMOTION_TYPE_LABELS[type]}
        </Badge>
      );
    default:
      return null;
  }
}

export default async function OffersPage() {
  const result = await getPublicOffers();
  const offers = result.success ? result.data : [];

  return (
    <div className="space-y-10 sm:space-y-16">
      {/* Header */}
      <SectionHeader
        badge="Special Offers"
        title="Current Promotions & Deals"
        description="Take advantage of limited-time order discounts, free gift rewards, and store specials."
      />

      {offers.length === 0 ? (
        <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] p-12 text-center">
          <Sparkles className="mx-auto mb-3 h-10 w-10 text-[var(--text-muted)] opacity-50" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">No Active Offers Right Now</h2>
          <p className="mt-2 text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
            We do not have any active promotional campaigns running at this moment. Check back soon for seasonal discounts!
          </p>
          <div className="mt-6">
            <Link href="/products">
              <Button size="sm">Browse Full Catalog</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer) => {
            const displayImage =
              offer.bannerUrl ||
              offer.giftProduct?.imageUrl ||
              offer.qualifyingProduct?.imageUrl ||
              "/placeholders/hero-placeholder.svg";

            return (
              <Card
                key={offer.id}
                className="group flex flex-col overflow-hidden border-[var(--border)] transition-all hover:shadow-[var(--shadow-card-hover)]"
              >
                {/* Banner Thumbnail */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--surface-muted)]">
                  <Image
                    src={displayImage}
                    alt={offer.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3">{getBadge(offer.type)}</div>
                  {offer.endsAt && (
                    <div className="absolute bottom-3 left-3">
                      <Countdown endsAt={offer.endsAt} size="sm" className="bg-[var(--surface)]/90 backdrop-blur-sm shadow-sm" />
                    </div>
                  )}
                </div>

                {/* Offer Body */}
                <CardContent className="flex flex-1 flex-col justify-between p-5 space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                      {offer.name}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                      {offer.shortDescription}
                    </p>

                    {/* BOGO preview item */}
                    {offer.type === "BUY_X_GET_Y_FREE" && offer.qualifyingProduct && offer.giftProduct && (
                      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)]/50 p-2.5 text-[11px] text-[var(--text-secondary)] space-y-1">
                        <p>
                          <strong>Buy:</strong> {offer.buyQuantity}x {offer.qualifyingProduct.name}
                        </p>
                        <p className="text-[var(--primary)] font-medium">
                          <strong>Get Free:</strong> {offer.giftQuantity}x {offer.giftProduct.name}
                        </p>
                      </div>
                    )}

                    {/* Order discount preview */}
                    {offer.type === "ORDER_PERCENTAGE_DISCOUNT" && offer.minimumOrderSubtotal && (
                      <p className="text-[11px] text-[var(--text-muted)] font-medium">
                        Min. purchase: {formatMoney(offer.minimumOrderSubtotal, "USD")}
                      </p>
                    )}
                    {offer.type === "ORDER_FIXED_DISCOUNT" && offer.minimumOrderSubtotal && (
                      <p className="text-[11px] text-[var(--text-muted)] font-medium">
                        Min. purchase: {formatMoney(offer.minimumOrderSubtotal, "USD")}
                      </p>
                    )}
                  </div>

                  {/* Action Link */}
                  <div className="pt-2">
                    <Link href={`/offers/${offer.slug}`} className="w-full">
                      <Button variant="outline" size="sm" className="w-full justify-between group/btn text-xs">
                        <span>View Offer & Products</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
