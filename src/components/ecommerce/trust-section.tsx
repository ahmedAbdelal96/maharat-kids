import { Truck, ShieldCheck, RefreshCw, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";

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
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-12 border-y border-[var(--border)]",
        className,
      )}
    >
      {items.map((item, index) => {
        const Icon = item.icon;
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
                {item.title}
              </h4>
              <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                {item.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
