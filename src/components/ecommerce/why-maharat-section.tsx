import { BookCheck, Sparkles, PackageOpen, HeartHandshake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getLocale } from "next-intl/server";

interface ValueProp {
  icon: typeof BookCheck;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  badgeAr: string;
  badgeEn: string;
  iconBg: string;
}

const VALUE_PROPS: ValueProp[] = [
  {
    icon: BookCheck,
    titleAr: "تسوق حسب العمر",
    titleEn: "Shop by Age",
    descAr: "تصفح الكتب والألعاب المصنفة بدقة حسب المرحلة العمرية المناسبة لطفلك.",
    descEn: "Browse books and toys accurately organized by appropriate age groups.",
    badgeAr: "مراحل النمو",
    badgeEn: "Age Groups",
    iconBg: "bg-[#125B78]/10 text-[#125B78]",
  },
  {
    icon: Sparkles,
    titleAr: "تسوق حسب المهارة",
    titleEn: "Shop by Developmental Skill",
    descAr: "استكشف المنتجات الموجهة لتنمية مهارات التخاطب والتركيز والحركة والتفكير.",
    descEn: "Discover products curated to nurture speech, focus, fine motor, and cognitive skills.",
    badgeAr: "تطوير المهارات",
    badgeEn: "Skills",
    iconBg: "bg-[#4E9B68]/10 text-[#3B7A51]",
  },
  {
    icon: PackageOpen,
    titleAr: "تحميل محمي للكتب الرقمية",
    titleEn: "Protected Digital Library Access",
    descAr: "أنشطة وكراسات رقمية بصيغة PDF متاحة في مكتبتك الرقمية بعد تأكيد الدفع.",
    descEn: "Digital workbooks and PDF activities available in your digital library after payment is confirmed.",
    badgeAr: "مكتبة رقمية",
    badgeEn: "Digital Access",
    iconBg: "bg-[#F3A928]/10 text-[#C47F08]",
  },
  {
    icon: HeartHandshake,
    titleAr: "دفع آمن ومرن",
    titleEn: "Secure Checkout",
    descAr: "خيارات دفع متنوعة وآمنة تناسب عملائنا في المملكة العربية السعودية وجمهورية مصر العربية.",
    descEn: "Safe and versatile checkout options configured for customers in Saudi Arabia and Egypt.",
    badgeAr: "دفع موثوق",
    badgeEn: "Secure Pay",
    iconBg: "bg-[#E66A89]/10 text-[#B83E5D]",
  },
];

export async function WhyMaharatSection() {
  const locale = await getLocale();
  const isAr = locale === "ar";

  return (
    <section className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface-card)] p-6 sm:p-10 lg:p-12 shadow-[var(--shadow-card)]">
      <div className="max-w-2xl mb-8">
        <Badge variant="secondary" size="sm" className="mb-2 font-bold uppercase tracking-wider text-[10px]">
          {isAr ? "لماذا مهارة طفل؟" : "Why Maharat Kids?"}
        </Badge>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
          {isAr ? "معايير نلتزم بها في كل منتج" : "Our Standards for Every Child"}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)] leading-relaxed">
          {isAr
            ? "نؤمن بأن الطفولة رحلة استكشاف مبهجة، ونحرص على تقديم أدوات تجمع بين المتعة والقيمة الحقيقية."
            : "We believe childhood is a journey of playful discovery, delivering toys and books that merge pure joy with lasting value."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {VALUE_PROPS.map((prop, idx) => {
          const Icon = prop.icon;
          return (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/70 p-5 transition-all duration-300 hover:bg-[var(--surface)] hover:border-[var(--primary)]/30 hover:shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${prop.iconBg}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--surface)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
                    {isAr ? prop.badgeAr : prop.badgeEn}
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] leading-snug">
                  {isAr ? prop.titleAr : prop.titleEn}
                </h3>
                <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                  {isAr ? prop.descAr : prop.descEn}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
