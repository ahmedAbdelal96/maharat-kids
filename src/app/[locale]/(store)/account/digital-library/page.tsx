import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { DownloadCloud, BookOpen, ShieldCheck, Printer, ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPrismaClient } from "@/database/prisma";
import { requireCustomer } from "@/modules/auth/server/queries";

export const dynamic = "force-dynamic";

export default async function DigitalLibraryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const actor = await requireCustomer();
  if (!actor.success) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}/account/digital-library`)}`);
  }

  const entitlements = await getPrismaClient().digitalEntitlement.findMany({
    where: { userId: actor.data.user.id, status: "ACTIVE", digitalAsset: { status: "ACTIVE" } },
    include: {
      digitalAsset: {
        include: {
          product: { select: { name: true, slug: true, images: true } },
          variant: { select: { sku: true } },
        },
      },
      order: { select: { orderNumber: true, createdAt: true } },
    },
    orderBy: { grantedAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="digital" size="sm" className="gap-1.5 font-bold uppercase tracking-wider text-[10px]">
              <DownloadCloud className="h-3.5 w-3.5" />
              <span>{isAr ? "المكتبة الرقمية" : "Digital Library"}</span>
            </Badge>
            <span className="text-xs font-semibold text-[var(--text-muted)]">•</span>
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              {entitlements.length} {isAr ? "كتاب رقمي متاح" : "Active Workbooks"}
            </span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            {isAr ? "مكتبتي الرقمية وأوراق العمل" : "My Digital Library & Workbooks"}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {isAr
              ? "جميع كتبك وأوراق العمل التفاعلية المشتراة متاحة للتحميل والطباعة الفورية في أي وقت."
              : "All your purchased interactive workbooks and printable PDFs ready for instant download."}
          </p>
        </div>

        <Link href="/products">
          <Button variant="outline" size="sm" className="gap-2 font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span>{isAr ? "استكشف المزيد من الأنشطة" : "Explore More Workbooks"}</span>
          </Button>
        </Link>
      </div>

      {/* Security and Printing Note */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-[#125B78]/30 bg-[#125B78]/10 p-4 text-xs font-medium text-[#125B78]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>
            {isAr
              ? `الملفات مؤمنة ومرخصة لحسابك (${actor.data.user.email}). جاهزة للطباعة المنزلية بجودة فائقة.`
              : `Files are licensed to your account (${actor.data.user.email}). Ready for high-res home printing.`}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#125B78] shrink-0">
          <Printer className="h-3.5 w-3.5" />
          <span>{isAr ? "طباعة غير محدودة للاستخدام المنزلي" : "Unlimited personal printing"}</span>
        </div>
      </div>

      {/* Entitlements Grid / Bookshelf */}
      {entitlements.length === 0 ? (
        <div className="rounded-[var(--radius-2xl)] border border-dashed border-[var(--border)] bg-[var(--surface-card)] p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)] mb-4">
            <BookOpen className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {isAr ? "لم تشترِ أي كتب أو أوراق عمل رقمية بعد" : "No digital purchases available yet"}
          </h2>
          <p className="mt-1.5 text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
            {isAr
              ? "استكشف مجموعتنا من كتب التدريب وأوراق العمل التفاعلية القابلة للطباعة الفورية."
              : "Discover our collection of printable exercise workbooks and interactive activity sets."}
          </p>
          <div className="mt-6">
            <Link href="/products">
              <Button size="sm" className="gap-2 font-bold">
                <span>{isAr ? "تصفح الكتب والأنشطة الرقمية" : "Browse Digital Catalog"}</span>
                <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {entitlements.map((entitlement) => {
            const asset = entitlement.digitalAsset;
            const title = isAr ? asset.displayNameAr : asset.displayNameEn;
            const subtitle = isAr ? asset.displayNameEn : asset.displayNameAr;
            const sizeMb = (asset.sizeBytes / (1024 * 1024)).toFixed(1);

            return (
              <article
                key={entitlement.id}
                className="flex flex-col justify-between rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-card)] p-5 transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] hover:border-[var(--primary)]/30"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#125B78]/10 px-2 py-0.5 text-[10px] font-bold text-[#125B78]">
                      <BookOpen className="h-3 w-3" />
                      <span>PDF Document</span>
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      {sizeMb} MB • v{asset.version}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-[var(--text-primary)] leading-snug">
                    {title}
                  </h3>
                  {subtitle && (
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {subtitle}
                    </p>
                  )}

                  <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] space-y-1">
                    <p>
                      <span className="font-semibold text-[var(--text-secondary)]">{isAr ? "رقم الطلب:" : "Order:"}</span>{" "}
                      <span className="font-mono">{entitlement.order.orderNumber}</span>
                    </p>
                    {asset.variant?.sku && (
                      <p>
                        <span className="font-semibold text-[var(--text-secondary)]">{isAr ? "الرمز:" : "SKU:"}</span>{" "}
                        <span className="font-mono">{asset.variant.sku}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-3">
                  <a
                    href={`/api/digital-assets/${asset.id}/download`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2.5 text-xs font-bold text-[var(--primary-foreground)] shadow-xs transition-all hover:bg-[var(--primary-hover)] active:scale-[0.98] cursor-pointer"
                  >
                    <DownloadCloud className="h-4 w-4" />
                    <span>{isAr ? "تحميل الملف (PDF)" : "Download PDF"}</span>
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
