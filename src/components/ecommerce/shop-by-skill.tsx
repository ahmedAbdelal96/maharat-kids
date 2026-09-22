import { Link } from "@/i18n/navigation";
import { MessageSquare, Puzzle, Scissors, HeartHandshake, Palette, Calculator, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getLocale } from "next-intl/server";

interface TaxonomyEntry {
  id: string;
  nameAr: string;
  nameEn: string;
  slug?: string;
}

interface SkillPill {
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  icon: typeof MessageSquare;
  tagColor: string;
}

const DEFAULT_SKILLS: SkillPill[] = [
  {
    nameAr: "تنمية اللغة والمفردات",
    nameEn: "Language & Vocabulary",
    descAr: "حكايات تفاعلية وأنشطة نطق وتعبير",
    descEn: "Storytelling, vocabulary, early phonics & speech",
    icon: MessageSquare,
    tagColor: "bg-[#125B78]/10 text-[#125B78]",
  },
  {
    nameAr: "التفكير وحل المشكلات",
    nameEn: "Problem Solving & Logic",
    descAr: "ألعاب بازل وتركيب وتحديات ذهنية",
    descEn: "Puzzles, logic blocks, strategy & focus games",
    icon: Puzzle,
    tagColor: "bg-[#4E9B68]/10 text-[#3B7A51]",
  },
  {
    nameAr: "المهارات الحركية الدقيقة",
    nameEn: "Fine Motor & Coordination",
    descAr: "أدوات مسك القلم، والقص، والتشكيل",
    descEn: "Grip training, cutting, tracing & hand-eye coordination",
    icon: Scissors,
    tagColor: "bg-[#F3A928]/10 text-[#C47F08]",
  },
  {
    nameAr: "الذكاء العاطفي والتواصل",
    nameEn: "Social & Emotional Growth",
    descAr: "قصص المشاعر، والتعاطف، والتعاون",
    descEn: "Emotion identification, empathy & teamwork",
    icon: HeartHandshake,
    tagColor: "bg-[#E66A89]/10 text-[#B83E5D]",
  },
  {
    nameAr: "الفنون والخيال الإبداعي",
    nameEn: "Creativity & Art",
    descAr: "ألوان آمنة، دفاتر رسم وأشغال يدوية",
    descEn: "Safe coloring, open-ended crafts & pretend play",
    icon: Palette,
    tagColor: "bg-[#8B5CF6]/10 text-[#6D28D9]",
  },
  {
    nameAr: "الرياضيات والعلوم المبكرة",
    nameEn: "Early Math & STEM",
    descAr: "عد، ومطابقة، وأشكال، وتجارب استكشاف",
    descEn: "Counting, spatial shapes, STEM exploration & discovery",
    icon: Calculator,
    tagColor: "bg-[#0EA5E9]/10 text-[#0369A1]",
  },
];

const SKILL_STYLE_PRESETS = [
  {
    icon: MessageSquare,
    tagColor: "bg-[#125B78]/10 text-[#125B78]",
    descAr: "حكايات تفاعلية وأنشطة نطق وتعبير",
    descEn: "Storytelling, vocabulary, early phonics & speech",
  },
  {
    icon: Puzzle,
    tagColor: "bg-[#4E9B68]/10 text-[#3B7A51]",
    descAr: "ألعاب بازل وتركيب وتحديات ذهنية",
    descEn: "Puzzles, logic blocks, strategy & focus games",
  },
  {
    icon: Scissors,
    tagColor: "bg-[#F3A928]/10 text-[#C47F08]",
    descAr: "أدوات مسك القلم، والقص، والتشكيل",
    descEn: "Grip training, cutting, tracing & hand-eye coordination",
  },
  {
    icon: HeartHandshake,
    tagColor: "bg-[#E66A89]/10 text-[#B83E5D]",
    descAr: "قصص المشاعر، والتعاطف، والتعاون",
    descEn: "Emotion identification, empathy & teamwork",
  },
  {
    icon: Palette,
    tagColor: "bg-[#8B5CF6]/10 text-[#6D28D9]",
    descAr: "ألوان آمنة، دفاتر رسم وأشغال يدوية",
    descEn: "Creative coloring, open-ended crafts & pretend play",
  },
  {
    icon: Calculator,
    tagColor: "bg-[#0EA5E9]/10 text-[#0369A1]",
    descAr: "عد، ومطابقة، وأشكال، وتجارب استكشاف",
    descEn: "Counting, spatial shapes, STEM exploration & discovery",
  },
];

export async function ShopBySkill({ taxonomySkills }: { taxonomySkills?: TaxonomyEntry[] }) {
  const locale = await getLocale();
  const isAr = locale === "ar";

  const hasTaxonomy = taxonomySkills && taxonomySkills.length > 0;
  const items = hasTaxonomy
    ? taxonomySkills.slice(0, 6).map((tax, idx) => {
        const preset = SKILL_STYLE_PRESETS[idx % SKILL_STYLE_PRESETS.length];
        return {
          id: tax.id,
          name: isAr ? tax.nameAr : tax.nameEn,
          desc: isAr ? preset.descAr : preset.descEn,
          icon: preset.icon,
          tagColor: preset.tagColor,
          href: `/products?skill=${tax.id}`,
        };
      })
    : DEFAULT_SKILLS.map((item, idx) => {
        return {
          id: String(idx),
          name: isAr ? item.nameAr : item.nameEn,
          desc: isAr ? item.descAr : item.descEn,
          icon: item.icon,
          tagColor: item.tagColor,
          href: `/products`,
        };
      });

  return (
    <section className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-subtle)] p-6 sm:p-10 lg:p-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <Badge variant="skill" size="sm" className="mb-2 font-bold uppercase tracking-wider text-[10px]">
            {isAr ? "مجالات التطوير" : "Skill Areas"}
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            {isAr ? "اختر المهارة التي تريد تنميتها" : "Shop by Developmental Skill"}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {isAr
              ? "استكشف منتجاتنا حسب الهدف التعليمي والأثر الإيجابي على طفلك"
              : "Discover our educational picks organized by their developmental benefits"}
          </p>
        </div>

        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:underline"
        >
          <span>{isAr ? "كل المهارات" : "All skills"}</span>
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              className="group flex items-start gap-4 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-card)] p-4 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] hover:border-[var(--primary)]/30"
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.tagColor} transition-transform duration-300 group-hover:scale-105`}>
                <Icon className="h-6 w-6" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors leading-tight">
                  {item.name}
                </h3>
                <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                  {item.desc}
                </p>
              </div>

              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-all">
                <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
