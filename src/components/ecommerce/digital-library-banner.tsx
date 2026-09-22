import { Link } from "@/i18n/navigation";
import { DownloadCloud, Printer, Sparkles, ShieldCheck, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLocale } from "next-intl/server";

export async function DigitalLibraryBanner() {
  const locale = await getLocale();
  const isAr = locale === "ar";

  return (
    <section className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-gradient-to-br from-[#125B78]/10 via-[var(--surface-card)] to-[#4E9B68]/10 p-5 sm:p-7 lg:p-8 shadow-[var(--shadow-card)]">
      {/* Subtle background decorative shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-[#125B78]/5 blur-2xl" />
        <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-[#4E9B68]/5 blur-2xl" />
      </div>

      <div className="relative z-10 grid gap-6 lg:grid-cols-12 lg:items-center">
        <div className="space-y-3 lg:col-span-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="digital" size="sm" className="gap-1.5 font-bold uppercase tracking-wider text-[10px]">
              <DownloadCloud className="h-3 w-3" />
              {isAr ? "تحميل فوري وطباعة" : "Instant PDF & Print"}
            </Badge>
            <Badge variant="secondary" size="sm" className="font-semibold text-[10px]">
              {isAr ? "وصول دائم لحسابك" : "Permanent Account Access"}
            </Badge>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)] leading-tight">
            {isAr
              ? "مكتبة أوراق العمل والكتب الرقمية التفاعلية"
              : "Interactive Digital Workbooks & Printable Activities"}
          </h2>

          <p className="max-w-lg text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-2">
            {isAr
              ? "أنشطة هادفة وكراسات تدريب بصيغة PDF عالية الجودة. حمّلها واطبعها مباشرة دون انتظار الشحن."
              : "Engaging worksheets and activity workbooks in high-resolution PDF. Download and print immediately without shipping delays."}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              <Printer className="h-3.5 w-3.5 text-[#4E9B68]" />
              <span>{isAr ? "جاهزة للطباعة المنزلية" : "Home-print ready"}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              <Sparkles className="h-3.5 w-3.5 text-[#F3A928]" />
              <span>{isAr ? "أنشطة متجددة وممتعة" : "Fun engaging exercises"}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#125B78]" />
              <span>{isAr ? "حفظ دائم في حسابك" : "Stored in your library"}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2">
            <Link href="/products">
              <Button size="md" className="gap-2 shadow-xs text-xs h-9 px-4 font-bold">
                <span>{isAr ? "استكشف المنتجات الرقمية" : "Browse digital library"}</span>
                <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
              </Button>
            </Link>
            <Link href="/account/digital-library">
              <Button variant="outline" size="md" className="text-xs h-9 px-4 font-semibold">
                {isAr ? "مكتبتي الرقمية" : "My digital library"}
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative flex items-center justify-center lg:col-span-5">
          <div className="relative w-full max-w-xs rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-card)] p-4 shadow-md">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-[#E66A89]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#F3A928]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#4E9B68]" />
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">PDF Document</span>
            </div>

            <div className="space-y-2.5 pt-3">
              <div className="flex items-start gap-2.5 rounded-lg bg-[var(--surface-muted)]/70 p-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#125B78] text-white">
                  <DownloadCloud className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {isAr ? "كراسة أنشطة ما قبل الكتابة" : "Pre-writing Activity Workbook"}
                  </h4>
                  <p className="text-[10px] text-[var(--text-secondary)]">PDF • 32 Pages • Print Ready</p>
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-card)] p-2.5 text-center">
                <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                  {isAr ? "متاح في مكتبتك الرقمية بعد تأكيد الدفع" : "Available in your digital library after payment is confirmed."}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
