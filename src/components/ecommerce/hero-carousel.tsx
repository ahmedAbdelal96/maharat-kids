"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ArrowRight, ChevronLeft, ChevronRight, Gift, Percent, Sparkles, Tag } from "lucide-react";
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
        <Badge variant="accent" size="sm" className="gap-1.5 font-semibold">
          <Percent className="h-3 w-3" />
          {PROMOTION_TYPE_LABELS[type]}
        </Badge>
      );
    case "ORDER_FIXED_DISCOUNT":
      return (
        <Badge variant="accent" size="sm" className="gap-1.5 font-semibold">
          <Tag className="h-3 w-3" />
          {PROMOTION_TYPE_LABELS[type]}
        </Badge>
      );
    case "BUY_X_GET_Y_FREE":
      return (
        <Badge variant="accent" size="sm" className="gap-1.5 font-semibold">
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
  const heroTitle = locale === "ar" ? "خطوات صغيرة،" : "Little steps. Big";
  const heroAccent = locale === "ar" ? "ومهارات كبيرة." : "skills for life.";
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
      <section className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-card)] p-8 shadow-[var(--shadow-card)] sm:p-12 lg:p-16">
        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
              {fallbackStoreName}
            </div>
            <h1 className="text-4xl font-black leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl text-[var(--text-primary)]">
              {heroTitle}
              <br />
              <span className="text-[var(--primary)]">{heroAccent}</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
              {fallbackDescription}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/products">
                <Button size="lg" className="gap-2">
                  {t("browseCatalog")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/categories">
                <Button variant="outline" size="lg">
                  {t("viewCategories")}
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative flex items-center justify-center lg:col-span-5">
            <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)]">
              <Image
                src={fallbackImageUrl || "/placeholders/hero-placeholder.svg"}
                alt={fallbackStoreName}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 32rem"
                className="object-cover"
              />
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
      className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-card)] p-8 shadow-[var(--shadow-card)] sm:p-12 lg:p-16"
    >
      <div className="relative z-10 grid items-center gap-10 lg:grid-cols-12">
        {/* Slide Content */}
        <div className="space-y-6 lg:col-span-7">
          <div className="flex flex-wrap items-center gap-2.5">
            {getPromoTypeBadge(currentPromo.type)}
            {currentPromo.endsAt && (
              <Countdown endsAt={currentPromo.endsAt} size="sm" />
            )}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentPromo.id}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="space-y-4"
            >
              <h1 className="text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl text-[var(--text-primary)]">
                {currentPromo.name}
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
                {currentPromo.shortDescription}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href={`/offers/${currentPromo.slug}`}>
              <Button size="lg" className="gap-2">
                {t("claimOffer")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/offers">
              <Button variant="outline" size="lg">
                {t("viewAllOffers")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Slide Visual */}
        <div className="relative flex items-center justify-center lg:col-span-5">
          <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-md">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPromo.id}
                initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="relative h-full w-full"
              >
                <Image
                  src={promoImage}
                  alt={currentPromo.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 32rem"
                  className="object-cover"
                />
              </motion.div>
            </AnimatePresence>
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
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextSlide}
              aria-label={t("nextSlide")}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
