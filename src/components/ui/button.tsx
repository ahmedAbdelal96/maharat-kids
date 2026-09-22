import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "destructive"
    | "accent"
    | "green"
    | "coral"
    | "soft-primary"
    | "soft-amber";
  size?: "sm" | "md" | "lg" | "xl" | "icon" | "icon-sm";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer active:scale-[0.98]";

    const variants = {
      primary:
        "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus-visible:ring-[var(--primary)] shadow-xs hover:shadow-md",
      secondary:
        "bg-[var(--surface-muted)] text-[var(--foreground)] hover:bg-[var(--border)] focus-visible:ring-[var(--primary)] border border-[var(--border)]",
      outline:
        "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] hover:border-[var(--primary)] focus-visible:ring-[var(--primary)] shadow-xs",
      ghost:
        "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-visible:ring-[var(--primary)]",
      destructive:
        "bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90 focus-visible:ring-[var(--destructive)] shadow-xs",
      accent:
        "bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] focus-visible:ring-[var(--accent)] shadow-xs hover:shadow-md font-bold",
      green:
        "bg-[var(--brand-green)] text-[var(--brand-green-foreground)] hover:bg-[var(--brand-green-hover)] focus-visible:ring-[var(--brand-green)] shadow-xs hover:shadow-md",
      coral:
        "bg-[var(--brand-pink)] text-[var(--brand-pink-foreground)] hover:bg-[var(--brand-pink-hover)] focus-visible:ring-[var(--brand-pink)] shadow-xs hover:shadow-md",
      "soft-primary":
        "bg-[var(--primary-soft)] text-[var(--primary)] hover:bg-[var(--primary-subtle)] focus-visible:ring-[var(--primary)] border border-[var(--primary)]/20",
      "soft-amber":
        "bg-[var(--accent-soft)] text-[#8c5600] hover:bg-[var(--accent-subtle)] focus-visible:ring-[var(--accent)] border border-[var(--accent)]/30",
    };

    const sizes = {
      sm: "h-8 px-3.5 text-xs rounded-full gap-1.5",
      md: "h-10 px-5 text-sm rounded-full gap-2",
      lg: "h-12 px-7 text-base rounded-full gap-2.5",
      xl: "h-14 px-8 text-lg rounded-full gap-3",
      icon: "h-10 w-10 p-0 rounded-full justify-center shrink-0",
      "icon-sm": "h-8 w-8 p-0 rounded-full justify-center shrink-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

