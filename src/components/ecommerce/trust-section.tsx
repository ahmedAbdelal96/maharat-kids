import { Truck, ShieldCheck, RefreshCw, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";

export interface TrustItem {
  icon: typeof Truck;
  title: string;
  description: string;
}

export const DEFAULT_TRUST_ITEMS: TrustItem[] = [
  {
    icon: Truck,
    title: "Reliable Shipping",
    description: "Tracked delivery straight to your doorstep.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Checkout",
    description: "Encrypted transactions and secure payment processing.",
  },
  {
    icon: RefreshCw,
    title: "Easy Returns",
    description: "Simple return policy for your peace of mind.",
  },
  {
    icon: Headphones,
    title: "Customer Support",
    description: "Responsive support team to assist with inquiries.",
  },
];

export function TrustSection({
  items = DEFAULT_TRUST_ITEMS,
  className,
}: {
  items?: TrustItem[];
  className?: string;
}) {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const translatedItems = [
    { title: isArabic ? "توصيل بعناية" : "Careful delivery", description: isArabic ? "خدمة موثوقة من رفوفنا إلى بابك." : "Thoughtful service from our shelves to your door." },
    { title: isArabic ? "دفع آمن وواضح" : "A safe checkout", description: isArabic ? "طريقة سهلة وآمنة لإتمام طلبك." : "A clear, secure way to complete your order." },
    { title: isArabic ? "إرجاع بسيط" : "Simple returns", description: isArabic ? "مساعدة مباشرة عندما تتغير الخطط." : "Straightforward help when plans change." },
    { title: isArabic ? "نحن هنا لمساعدتك" : "Here to help", description: isArabic ? "دعم ودود لكل سؤال." : "Friendly support for every question." },
  ];
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-12 border-y border-[var(--border)]",
        className,
      )}
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        const copy = translatedItems[index] ?? item;
        return (
          <div
            key={index}
            className="flex items-start gap-4 p-4 rounded-[var(--radius-lg)] transition-colors hover:bg-[var(--surface-muted)]/50"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--primary)] border border-[var(--border)]">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                {copy.title}
              </h4>
              <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                {copy.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
