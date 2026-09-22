import { Link } from "@/i18n/navigation";
import { Baby, Sparkles, BookOpen, GraduationCap, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getLocale } from "next-intl/server";

export interface AgeGroupRecord {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  minAgeMonths?: number;
  maxAgeMonths?: number;
}

const AGE_STYLE_PRESETS = [
  {
    icon: Baby,
    badgeAr: "السنوات الأولى",
    badgeEn: "Early Years",
    subAr: "استكشاف الحواس، كتب لمسية وألعاب ناعمة",
    subEn: "Sensory exploration, touch & feel books, soft toys",
    colorClass: "bg-[#F3A928]/10 text-[#C47F08]",
    borderHover: "hover:border-[#F3A928]",
  },
  {
    icon: Sparkles,
    badgeAr: "مرحلة الروضة",
    badgeEn: "Preschool",
    subAr: "قصص ملونة، تهيئة القراءة وأنشطة الحروف",
    subEn: "Picture books, pre-reading, early alphabet & fine motor",
    colorClass: "bg-[#4E9B68]/10 text-[#3B7A51]",
    borderHover: "hover:border-[#4E9B68]",
  },
  {
    icon: BookOpen,
    badgeAr: "المرحلة الابتدائية",
    badgeEn: "Primary",
    subAr: "قصص للمبتدئين، تفكير منطقي وألعاب تفاعلية",
    subEn: "Early chapter books, STEM puzzles, logic challenges",
    colorClass: "bg-[#125B78]/10 text-[#125B78]",
    borderHover: "hover:border-[#125B78]",
  },
  {
    icon: GraduationCap,
    badgeAr: "مستكشفون مستقلون",
    badgeEn: "Independent",
    subAr: "روايات فتيان، علوم وتجارب ومشاريع بناء",
    subEn: "Young reader novels, science experiments, builders",
    colorClass: "bg-[#E66A89]/10 text-[#B83E5D]",
    borderHover: "hover:border-[#E66A89]",
  },
];

const FALLBACK_BANDS = [
  {
    id: "0-2",
    slug: "0-2",
    nameAr: "من ٠ إلى ٢ سنة",
    nameEn: "0 to 2 Years",
    minAgeMonths: 24,
    maxAgeMonths: 24,
  },
  {
    id: "3-5",
    slug: "3-5",
    nameAr: "من ٣ إلى ٥ سنوات",
    nameEn: "3 to 5 Years",
    minAgeMonths: 48,
    maxAgeMonths: 48,
  },
  {
    id: "6-8",
    slug: "6-8",
    nameAr: "من ٦ إلى ٨ سنوات",
    nameEn: "6 to 8 Years",
    minAgeMonths: 72,
    maxAgeMonths: 72,
  },
  {
    id: "9-12",
    slug: "9-12",
    nameAr: "من ٩ إلى ١٢ سنة",
    nameEn: "9 to 12 Years",
    minAgeMonths: 108,
    maxAgeMonths: 108,
  },
];

export async function ShopByAge({ ageGroups }: { ageGroups?: AgeGroupRecord[] }) {
  const locale = await getLocale();
  const isAr = locale === "ar";

  const displayGroups = ageGroups && ageGroups.length > 0 ? ageGroups : FALLBACK_BANDS;

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <Badge variant="age" size="sm" className="mb-2 font-bold uppercase tracking-wider text-[10px]">
            {isAr ? "مراحل النمو" : "Growth Stages"}
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            {isAr ? "تسوق حسب العمر" : "Shop by Age"}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {isAr
              ? "كتب وألعاب مختارة بدقة لتناسب كل مرحلة تطور فكري وحركي"
              : "Carefully curated books & toys calibrated to every developmental milestone"}
          </p>
        </div>

        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:underline"
        >
          <span>{isAr ? "عرض كل الأعمار" : "View all ages"}</span>
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {displayGroups.map((group, idx) => {
          const preset = AGE_STYLE_PRESETS[idx % AGE_STYLE_PRESETS.length];
          const Icon = preset.icon;
          const targetAge = group.minAgeMonths ?? 24;

          return (
            <Link
              key={group.id}
              href={`/products?age=${targetAge}`}
              className={`group relative flex flex-col justify-between rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-card)] p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] ${preset.borderHover}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${preset.colorClass} transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-bold text-[var(--text-muted)] bg-[var(--surface-muted)] px-2.5 py-1 rounded-full border border-[var(--border-subtle)]">
                    {isAr ? preset.badgeAr : preset.badgeEn}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                  {isAr ? group.nameAr : group.nameEn}
                </h3>
                <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                  {isAr ? preset.subAr : preset.subEn}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-bold text-[var(--primary)]">
                <span>{isAr ? "اكتشف المنتجات" : "Explore products"}</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
