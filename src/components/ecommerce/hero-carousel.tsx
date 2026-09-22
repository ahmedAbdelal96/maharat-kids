"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ArrowRight, ChevronLeft, ChevronRight, Gift, Percent, Sparkles, Tag, BookOpen } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/ecommerce/countdown";
import { PROMOTION_TYPE_LABELS, type PromotionType } from "@/modules/promotions/constants";
import type { Promotion } from "@/modules/promotions/types";

function getPromoTypeBadge(type: PromotionType) {
  switch (type) {
    case "ORDER_PERCENTAGE_DISCOUNT":
      return (
        <Badge variant="coral" size="sm" className="gap-1.5 font-bold shadow-xs">
          <Percent className="h-3 w-3" />
          {PROMOTION_TYPE_LABELS[type]}
        </Badge>
      );
    case "ORDER_FIXED_DISCOUNT":
      return (
        <Badge variant="coral" size="sm" className="gap-1.5 font-bold shadow-xs">
          <Tag className="h-3 w-3" />
          {PROMOTION_TYPE_LABELS[type]}
        </Badge>
      );
    case "BUY_X_GET_Y_FREE":
      return (
        <Badge variant="coral" size="sm" className="gap-1.5 font-bold shadow-xs">
          <Gift className="h-3 w-3" />
          {PROMOTION_TYPE_LABELS[type]}
        </Badge>
      );
    default:
      return null;
  }
}

export function HeroCarousel({
  promotions,
  fallbackStoreName,
  fallbackDescription,
  fallbackImageUrl,
}: {
  promotions: Promotion[];
  fallbackStoreName: string;
  fallbackDescription: string;
  fallbackImageUrl?: string | null;
}) {
  const shouldReduceMotion = useReducedMotion();
  const t = useTranslations("storefront");
  const locale = useLocale();
  const isAr = locale === "ar";
  
  const heroBadge = isAr ? "مهارة طفل • نتعلم • نلعب • نتطور" : "Maharat Kids • Learn • Play • Grow";
  const heroTitle = isAr ? "خطوات صغيرة،" : "Little Steps.";
  const heroAccent = isAr ? "ومهارات تصنع المستقبل." : "Big Skills for Growing Minds.";
  const heroDesc = fallbackDescription || (isAr
    ? "وجهتكم الأولى لأجود كتب الأطفال، أوراق العمل التفاعلية، والألعاب التعليمية المصممة بعناية لبناء عقول واثقة ومبدعة."
    : "Your premier educational bookstore for children's books, interactive workbooks, and developmental learning toys.");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const totalSlides = promotions.length;

  const nextSlide = useCallback(() => {
    if (totalSlides > 1) {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    if (totalSlides > 1) {
      setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    }
  }, [totalSlides]);

  useEffect(() => {
    if (totalSlides <= 1 || isPaused || shouldReduceMotion) return;
    const interval = setInterval(nextSlide, 6500);
    return () => clearInterval(interval);
  }, [totalSlides, isPaused, nextSlide, shouldReduceMotion]);

  // Case 0: No active hero campaigns -> Render default store hero
  if (totalSlides === 0) {
    return (
      <section className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-gradient-to-br from-[var(--surface-card)] via-[var(--surface-subtle)] to-[var(--primary-soft)]/20 p-5 sm:p-7 lg:p-8 shadow-[var(--shadow-card)]">
        {/* Subtle decorative background spots */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-12 -end-12 h-56 w-56 rounded-full bg-[var(--primary)]/5 blur-2xl" />
          <div className="absolute -bottom-12 -start-12 h-56 w-56 rounded-full bg-[var(--accent)]/10 blur-2xl" />
        </div>

        <div className="relative z-10 grid items-center gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-card)] px-3 py-1 text-xs font-bold text-[var(--primary)] shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>{heroBadge}</span>
            </div>

            <h1 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl lg:text-4xl text-[var(--text-primary)]">
              {heroTitle}
              <br />
              <span className="text-[var(--primary)]">{heroAccent}</span>
            </h1>

            <p className="max-w-lg text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm line-clamp-2">
              {heroDesc}
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Link href="/products">
                <Button size="md" variant="primary" className="gap-2 shadow-xs font-bold text-xs h-10 px-5">
                  <BookOpen className="h-4 w-4" />
                  <span>{isAr ? "تسوق الكتب والألعاب" : "Explore Bookstore"}</span>
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Button>
              </Link>
              <Link href="/categories">
                <Button variant="outline" size="md" className="font-semibold text-xs h-10 px-4">
                  {t("viewCategories")}
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative flex items-center justify-center lg:col-span-5">
            <div className="relative aspect-[4/3] sm:aspect-square w-full max-w-xs sm:max-w-sm max-h-64 sm:max-h-72 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-card)] shadow-[var(--shadow-card-hover)] p-1.5">
              <div className="relative h-full w-full overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-subtle)]">
                <Image
                  src={fallbackImageUrl || "/placeholders/hero-placeholder.svg"}
                  alt={fallbackStoreName}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 24rem"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Case 1 & 2: 1 or multiple hero promotions
  const currentPromo = promotions[currentIndex];
  const promoImage =
    currentPromo.bannerUrl ||
    currentPromo.giftProduct?.imageUrl ||
    currentPromo.qualifyingProduct?.imageUrl ||
    fallbackImageUrl ||
    "/placeholders/hero-placeholder.svg";

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("promotionsAndCampaigns")}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-gradient-to-br from-[var(--surface-card)] via-[var(--surface-subtle)] to-[var(--primary-soft)]/20 p-5 sm:p-7 lg:p-8 shadow-[var(--shadow-card)]"
    >
      <div className="relative z-10 grid items-center gap-6 lg:grid-cols-12">
        {/* Slide Content */}
        <div className="space-y-4 lg:col-span-7">
          <div className="flex flex-wrap items-center gap-2">
            {getPromoTypeBadge(currentPromo.type)}
            {currentPromo.endsAt && (
              <Countdown endsAt={currentPromo.endsAt} size="sm" />
            )}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentPromo.id}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-2.5"
            >
              <h1 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl lg:text-4xl text-[var(--text-primary)]">
                {currentPromo.name}
              </h1>
              <p className="max-w-lg text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm line-clamp-2">
                {currentPromo.shortDescription}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Link href={`/offers/${currentPromo.slug}`}>
              <Button size="md" variant="primary" className="gap-2 shadow-xs font-bold text-xs h-10 px-5">
                <span>{t("claimOffer")}</span>
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </Link>
            <Link href="/offers">
              <Button variant="outline" size="md" className="font-semibold text-xs h-10 px-4">
                {t("viewAllOffers")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Slide Visual */}
        <div className="relative flex items-center justify-center lg:col-span-5">
          <div className="relative aspect-[4/3] sm:aspect-square w-full max-w-xs sm:max-w-sm max-h-64 sm:max-h-72 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-card)] shadow-[var(--shadow-card-hover)] p-1.5">
            <div className="relative h-full w-full overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-subtle)]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPromo.id}
                  initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 1.04 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="relative h-full w-full"
                >
                  <Image
                    src={promoImage}
                    alt={currentPromo.name}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 24rem"
                    className="object-cover"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Carousel Controls (when 2 or more slides) */}
      {totalSlides > 1 && (
        <div className="relative z-20 mt-8 flex items-center justify-between border-t border-[var(--border)] pt-4 sm:mt-10">
          {/* Dots Indicator */}
          <div className="flex items-center gap-2" role="tablist">
            {promotions.map((p, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={p.id}
                  onClick={() => setCurrentIndex(idx)}
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`${idx + 1} / ${totalSlides}: ${p.name}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isActive
                      ? "w-8 bg-[var(--primary)]"
                      : "w-2 bg-[var(--border)] hover:bg-[var(--text-muted)]"
                  }`}
                />
              );
            })}
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevSlide}
              aria-label={t("previousSlide")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </button>
            <button
              onClick={nextSlide}
              aria-label={t("nextSlide")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
