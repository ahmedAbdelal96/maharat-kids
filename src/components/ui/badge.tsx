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
    | "accent";
  size?: "sm" | "md";
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
      "border border-[var(--border)] text-[var(--text-secondary)] bg-transparent",
    success:
      "bg-[var(--success-subtle)] text-[var(--success)] border border-[var(--success)]/20",
    warning:
      "bg-[var(--warning-subtle)] text-[var(--warning)] border border-[var(--warning)]/20",
    destructive:
      "bg-[var(--destructive-subtle)] text-[var(--destructive)] border border-[var(--destructive)]/20",
    accent:
      "bg-[var(--accent)] text-[var(--accent-foreground)]",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[11px] rounded-[var(--radius-sm)]",
    md: "px-2.5 py-1 text-xs rounded-[var(--radius-md)]",
  };

  return (
    <span
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
