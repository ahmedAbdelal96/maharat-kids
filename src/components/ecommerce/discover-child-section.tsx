import { Link } from "@/i18n/navigation";
import { Baby, Sparkles, BookOpen, GraduationCap, ArrowRight, MessageSquare, Puzzle, Scissors, HeartHandshake, Palette, Calculator } from "lucide-react";
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

export interface SkillRecord {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
}

const AGE_STYLE_PRESETS = [
  {
    icon: Baby,
    badgeAr: "السنوات الأولى",
    badgeEn: "Early Years",
    subAr: "استكشاف ولعب حسي ناعم",
    subEn: "Sensory & soft toys",
    colorClass: "bg-[#F3A928]/10 text-[#C47F08]",
  },
  {
    icon: Sparkles,
    badgeAr: "مرحلة الروضة",
    badgeEn: "Preschool",
    subAr: "قصص وتهيئة ما قبل الكتابة",
    subEn: "Pre-reading & tracing",
    colorClass: "bg-[#4E9B68]/10 text-[#3B7A51]",
  },
  {
    icon: BookOpen,
    badgeAr: "المرحلة الابتدائية",
    badgeEn: "Primary",
    subAr: "تفكير ومنطق وتحديات STEM",
    subEn: "Logic & STEM puzzles",
    colorClass: "bg-[#125B78]/10 text-[#125B78]",
  },
  {
    icon: GraduationCap,
    badgeAr: "مستكشفون مستقلون",
    badgeEn: "Independent",
    subAr: "روايات فتيان ومشاريع بناء",
    subEn: "Novels & building kits",
    colorClass: "bg-[#E66A89]/10 text-[#B83E5D]",
  },
];

const SKILL_STYLE_PRESETS = [
  {
    icon: MessageSquare,
    tagColor: "bg-[#125B78]/10 text-[#125B78]",
    descAr: "نطق وحصيلة لغوية",
    descEn: "Speech & vocabulary",
  },
  {
    icon: Puzzle,
    tagColor: "bg-[#4E9B68]/10 text-[#3B7A51]",
    descAr: "بازل وتفكير منطقي",
    descEn: "Logic & puzzles",
  },
  {
    icon: Scissors,
    tagColor: "bg-[#F3A928]/10 text-[#C47F08]",
    descAr: "مسك القلم والتشكيل",
    descEn: "Fine motor & grip",
  },
  {
    icon: HeartHandshake,
    tagColor: "bg-[#E66A89]/10 text-[#B83E5D]",
    descAr: "مشاعر وتفاعل اجتماعي",
    descEn: "Social & emotions",
  },
  {
    icon: Palette,
    tagColor: "bg-[#8B5CF6]/10 text-[#6D28D9]",
    descAr: "تلوين وأشغال يدوية",
    descEn: "Art & creative play",
  },
  {
    icon: Calculator,
    tagColor: "bg-[#0EA5E9]/10 text-[#0369A1]",
    descAr: "أرقام وتجارب استكشاف",
    descEn: "Early math & STEM",
  },
];

const FALLBACK_AGE_GROUPS: AgeGroupRecord[] = [
  { id: "0-2", slug: "0-2", nameAr: "من ٠ إلى ٢ سنة", nameEn: "0 to 2 Years", minAgeMonths: 24 },
  { id: "3-5", slug: "3-5", nameAr: "من ٣ إلى ٥ سنوات", nameEn: "3 to 5 Years", minAgeMonths: 48 },
  { id: "6-8", slug: "6-8", nameAr: "من ٦ إلى ٨ سنوات", nameEn: "6 to 8 Years", minAgeMonths: 72 },
];

const FALLBACK_SKILLS: SkillRecord[] = [
  { id: "s1", slug: "language", nameAr: "تنمية اللغة والتخاطب", nameEn: "Language & Speech" },
  { id: "s2", slug: "logic", nameAr: "التفكير وحل المشكلات", nameEn: "Problem Solving" },
  { id: "s3", slug: "fine-motor", nameAr: "المهارات الحركية الدقيقة", nameEn: "Fine Motor Skills" },
  { id: "s4", slug: "emotions", nameAr: "الذكاء العاطفي والتواصل", nameEn: "Social & Emotional" },
  { id: "s5", slug: "creativity", nameAr: "الفنون والخيال الإبداعي", nameEn: "Creativity & Art" },
  { id: "s6", slug: "math-stem", nameAr: "الرياضيات والعلوم المبكرة", nameEn: "Early Math & STEM" },
];

export async function DiscoverChildSection({
  ageGroups,
  skills,
}: {
  ageGroups?: AgeGroupRecord[];
  skills?: SkillRecord[];
}) {
  const locale = await getLocale();
  const isAr = locale === "ar";

  const displayAges = ageGroups && ageGroups.length > 0 ? ageGroups.slice(0, 3) : FALLBACK_AGE_GROUPS;
  const displaySkills = skills && skills.length > 0 ? skills.slice(0, 6) : FALLBACK_SKILLS;

  return (
    <section className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-subtle)] p-5 sm:p-7 shadow-[var(--shadow-card)]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5 pb-3.5 border-b border-[var(--border-subtle)]">
        <div>
          <Badge variant="default" size="sm" className="mb-1.5 font-bold uppercase tracking-wider text-[10px]">
            {isAr ? "اكتشف لطفلك" : "Targeted Discovery"}
          </Badge>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
            {isAr ? "اختر لطفلك بسهولة حسب العمر أو المهارة" : "Discover by Age & Developmental Skill"}
          </h2>
        </div>

        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:underline shrink-0"
        >
          <span>{isAr ? "عرض كل المنتجات" : "Browse all products"}</span>
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: Shop by Age (3 compact cards) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Baby className="h-3.5 w-3.5 text-[var(--primary)]" />
              {isAr ? "تسوق حسب المرحلة العمرية" : "Shop by Growth Stage"}
            </span>
            <Link href="/products" className="text-[11px] font-semibold text-[var(--primary)] hover:underline">
              {isAr ? "كل الأعمار" : "All ages"}
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2.5 flex-1">
            {displayAges.map((group, idx) => {
              const preset = AGE_STYLE_PRESETS[idx % AGE_STYLE_PRESETS.length];
              const Icon = preset.icon;
              const targetAge = group.minAgeMonths ?? 24;

              return (
                <Link
                  key={group.id}
                  href={`/products?age=${targetAge}`}
                  className="group flex items-center justify-between rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-card)] p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${preset.colorClass} transition-transform group-hover:scale-105`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors truncate">
                        {isAr ? group.nameAr : group.nameEn}
                      </h4>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate">
                        {isAr ? preset.badgeAr : preset.badgeEn} • {isAr ? preset.subAr : preset.subEn}
                      </p>
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-all shrink-0 ms-2" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right Column: Shop by Skill (6 compact grid items) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[var(--brand-green)]" />
              {isAr ? "اختر المهارة المستهدفة" : "Shop by Skill Area"}
            </span>
            <Link href="/products" className="text-[11px] font-semibold text-[var(--brand-green)] hover:underline">
              {isAr ? "كل المهارات" : "All skills"}
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 flex-1">
            {displaySkills.map((skill, idx) => {
              const preset = SKILL_STYLE_PRESETS[idx % SKILL_STYLE_PRESETS.length];
              const Icon = preset.icon;

              return (
                <Link
                  key={skill.id}
                  href={`/products?skill=${skill.id}`}
                  className="group flex flex-col justify-between rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-card)] p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--brand-green)] hover:shadow-xs"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${preset.tagColor} transition-transform group-hover:scale-105`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <ArrowRight className="h-3 w-3 text-[var(--text-muted)] group-hover:text-[var(--brand-green)] group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-all" />
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-green)] transition-colors line-clamp-1 leading-snug">
                      {isAr ? skill.nameAr : skill.nameEn}
                    </h4>
                    <p className="text-[10px] text-[var(--text-secondary)] line-clamp-1 mt-0.5">
                      {isAr ? preset.descAr : preset.descEn}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}