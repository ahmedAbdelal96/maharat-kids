import { notFound } from "next/navigation";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ArrowRight, ChevronRight, Gift, Home, Percent, ShieldCheck, Tag, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Countdown } from "@/components/ecommerce/countdown";
import { ProductCard } from "@/components/ecommerce/product-card";
import { getPublicOffer } from "@/modules/promotions/server/queries";
import { getPublicProduct, getPublicProducts } from "@/modules/products/server/queries";
import { getCurrentCustomerFavoriteIds } from "@/modules/favorites/server/queries";
import { PROMOTION_TYPE_LABELS, type PromotionType } from "@/modules/promotions/constants";
import { formatMoney } from "@/lib/formatters";
import { isLocale, type Locale } from "@/config/locale";
import { localizedAlternates, localizedUrl } from "@/lib/seo";
import { resolveMarket } from "@/modules/market/server/resolver";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug, locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "ar";
  const result = await getPublicOffer(slug);
  if (!result.success) {
    return { title: "Offer Not Found" };
  }
  const offer = result.data;
  const path = `/offers/${offer.slug}`;
  return {
    title: `${offer.name} | Special Offers`,
    description: offer.shortDescription,
    alternates: localizedAlternates(path, locale),
    openGraph: {
      title: offer.name,
      description: offer.shortDescription,
      url: localizedUrl(path, locale),
      images: offer.bannerUrl ? [{ url: offer.bannerUrl }] : [],
    },
  };
}

function getPromoBadge(type: PromotionType) {
  switch (type) {
    case "ORDER_PERCENTAGE_DISCOUNT":
      return (
        <Badge variant="accent" size="md" className="gap-1.5 font-semibold">
          <Percent className="h-3.5 w-3.5" />
          {PROMOTION_TYPE_LABELS[type]}
        </Badge>
      );
    case "ORDER_FIXED_DISCOUNT":
      return (
        <Badge variant="accent" size="md" className="gap-1.5 font-semibold">
          <Tag className="h-3.5 w-3.5" />
          {PROMOTION_TYPE_LABELS[type]}
        </Badge>
      );
    case "BUY_X_GET_Y_FREE":
      return (
        <Badge variant="accent" size="md" className="gap-1.5 font-semibold">
          <Gift className="h-3.5 w-3.5" />
          {PROMOTION_TYPE_LABELS[type]}
        </Badge>
      );
    default:
      return null;
  }
}

export default async function OfferDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [offerResult, catalogResult, favoriteIds] = await Promise.all([
    getPublicOffer(slug),
    getPublicProducts({ pageSize: 8 }),
    getCurrentCustomerFavoriteIds(),
  ]);

  if (!offerResult.success) {
    notFound();
  }

  const offer = offerResult.data;
  const market = await resolveMarket();
  const [qualifyingResult, giftResult] = await Promise.all([
    offer.qualifyingProduct ? getPublicProduct(offer.qualifyingProduct.slug) : Promise.resolve(null),
    offer.giftProduct ? getPublicProduct(offer.giftProduct.slug) : Promise.resolve(null),
  ]);
  const qualifyingProduct = offer.qualifyingProduct
    ? {
        ...offer.qualifyingProduct,
        price: qualifyingResult?.success && qualifyingResult.data ? qualifyingResult.data.price : offer.qualifyingProduct.price,
      }
    : null;
  const giftProduct = offer.giftProduct
    ? {
        ...offer.giftProduct,
        price: giftResult?.success && giftResult.data ? giftResult.data.price : offer.giftProduct.price,
      }
    : null;
  const catalogProducts = catalogResult.success ? catalogResult.data.items : [];

  const displayImage =
    offer.bannerUrl ||
    giftProduct?.imageUrl ||
    qualifyingProduct?.imageUrl ||
    "/placeholders/hero-placeholder.svg";

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumbs" className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <Link href="/" className="hover:text-[var(--text-primary)] flex items-center gap-1">
          <Home className="h-3.5 w-3.5" />
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/offers" className="hover:text-[var(--text-primary)]">
          Offers
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-[var(--text-primary)] font-medium truncate max-w-xs">{offer.name}</span>
      </nav>

      {/* Offer Header Hero Section */}
      <section className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-card)] p-8 shadow-[var(--shadow-card)] sm:p-12 lg:p-16">
        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-2.5">
              {getPromoBadge(offer.type)}
              {offer.endsAt && <Countdown endsAt={offer.endsAt} size="md" />}
            </div>

            <h1 className="text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl text-[var(--text-primary)]">
              {offer.name}
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
              {offer.shortDescription}
            </p>

            {/* Offer Terms / Details */}
            {offer.description && (
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)]/60 p-4 text-xs text-[var(--text-secondary)] space-y-1.5 max-w-xl">
                <span className="font-semibold text-[var(--text-primary)] uppercase tracking-wider text-[10px]">
                  Offer Terms & Conditions:
                </span>
                <p className="leading-relaxed">{offer.description}</p>
              </div>
            )}

            {/* Value Highlights */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
              <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)]/40 p-3 text-xs">
                <ShieldCheck className="h-4 w-4 text-[var(--primary)] shrink-0" />
                <span className="text-[var(--text-secondary)]">Automatically applied at checkout</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)]/40 p-3 text-xs">
                <Zap className="h-4 w-4 text-[var(--primary)] shrink-0" />
                <span className="text-[var(--text-secondary)]">Best savings guaranteed</span>
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-center lg:col-span-5">
            <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-md">
              <Image
                src={displayImage}
                alt={offer.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 32rem"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Merchandising Section */}
      {offer.type === "BUY_X_GET_Y_FREE" && qualifyingProduct && giftProduct ? (
        <section className="space-y-6">
          <div>
            <Badge variant="secondary" size="sm" className="uppercase font-semibold tracking-wider text-[10px]">
              Bundle Reward
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mt-1">
              Participating Products
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Add the qualifying item to your cart to automatically receive the free promotional gift!
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Qualifying Product Card */}
            <Card className="overflow-hidden border-2 border-[var(--primary)]/30">
              <div className="bg-[var(--primary-soft)]/20 px-4 py-2 border-b border-[var(--primary)]/20 flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--primary)]">
                  1. Buy this product ({offer.buyQuantity} required)
                </span>
                <Badge variant="accent" size="sm">Step 1</Badge>
              </div>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)]">
                    <Image
                      src={qualifyingProduct.imageUrl || "/placeholders/product-placeholder.svg"}
                      alt={qualifyingProduct.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-3 text-center sm:text-left">
                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                      {qualifyingProduct.name}
                    </h3>
                    <p className="text-xl font-black text-[var(--primary)]">
                      {formatMoney(qualifyingProduct.price, market.configuration.currency)}
                    </p>
                    <div className="pt-2">
                        <Link href={`/products/${qualifyingProduct.slug}`}>
                        <Button size="sm" className="w-full sm:w-auto">
                          View & Add to Cart
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Free Gift Card */}
            <Card className="overflow-hidden border-2 border-[var(--success)]/40 bg-[var(--surface-muted)]/20">
              <div className="bg-[var(--success-soft)] px-4 py-2 border-b border-[var(--success)]/30 flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--success)]">
                  2. Get this reward for Free!
                </span>
                <Badge variant="success" size="sm">Free Gift</Badge>
              </div>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
                    <Image
                      src={giftProduct.imageUrl || "/placeholders/product-placeholder.svg"}
                      alt={giftProduct.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-3 text-center sm:text-left">
                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                      {giftProduct.name}
                    </h3>
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <span className="text-xl font-black text-[var(--success)]">{formatMoney("0", market.configuration.currency)} FREE</span>
                      <span className="text-xs text-[var(--text-muted)] line-through">
                      {formatMoney(giftProduct.price, market.configuration.currency)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      Automatically added at {formatMoney("0", market.configuration.currency)} in your cart when you checkout!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      ) : (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="secondary" size="sm" className="uppercase font-semibold tracking-wider text-[10px]">
                Eligible Products
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mt-1">
                Shop The Catalog
              </h2>
            </div>
            <Link href="/products">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <span>View All Products</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {catalogProducts.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                currency={market.configuration.currency}
                initialFavorite={favoriteIds.includes(prod.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
