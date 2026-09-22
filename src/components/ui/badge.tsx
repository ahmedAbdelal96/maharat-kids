import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "success"
    | "warning"
    | "destructive"
    | "accent"
    | "age"
    | "skill"
    | "digital"
    | "coral"
    | "teal";
  size?: "sm" | "md" | "lg";
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  ...props
}: BadgeProps) {
  const baseStyles =
    "inline-flex items-center font-medium transition-colors select-none";

  const variants = {
    default:
      "bg-[var(--primary)] text-[var(--primary-foreground)]",
    secondary:
      "bg-[var(--secondary)] text-[var(--secondary-foreground)]",
    outline:
      "border border-[var(--border)] text-[var(--text-secondary)] bg-[var(--surface)]",
    success:
      "bg-[var(--success-subtle)] text-[var(--brand-green)] border border-[var(--brand-green)]/20",
    warning:
      "bg-[var(--warning-subtle)] text-[var(--warning)] border border-[var(--warning)]/20",
    destructive:
      "bg-[var(--destructive-subtle)] text-[var(--destructive)] border border-[var(--destructive)]/20",
    accent:
      "bg-[var(--accent)] text-[var(--accent-foreground)]",
    age:
      "bg-[var(--accent-soft)] text-[#8c5600] border border-[var(--accent)]/30 font-semibold",
    skill:
      "bg-[var(--brand-green-soft)] text-[#1b6138] border border-[var(--brand-green)]/30 font-medium",
    digital:
      "bg-[var(--primary-soft)] text-[var(--primary)] border border-[var(--primary)]/25 font-semibold",
    coral:
      "bg-[var(--brand-pink-soft)] text-[#9d2443] border border-[var(--brand-pink)]/30 font-semibold",
    teal:
      "bg-[var(--primary-soft)] text-[var(--primary)] border border-[var(--primary)]/20",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[11px] rounded-full",
    md: "px-2.5 py-1 text-xs rounded-full",
    lg: "px-3.5 py-1.5 text-xs rounded-full",
  };

  return (
    <span
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

