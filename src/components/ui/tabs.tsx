"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      role="tablist"
      className={cn(
        "flex max-w-full flex-wrap items-center gap-1 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)] p-1",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative z-10 flex shrink-0 items-center gap-2 rounded-[var(--radius-md)] px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] sm:text-sm",
              isActive
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            {isActive && (
              shouldReduceMotion ? (
                <div className="absolute inset-0 z-[-1] rounded-[var(--radius-md)] bg-[var(--surface)] shadow-xs" />
              ) : (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 z-[-1] rounded-[var(--radius-md)] bg-[var(--surface)] shadow-xs"
                  transition={{ type: "spring", bounce: 0.12, duration: 0.38 }}
                />
              )
            )}
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-semibold transition-colors",
                  isActive
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "bg-[var(--surface)] text-[var(--text-muted)]",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
