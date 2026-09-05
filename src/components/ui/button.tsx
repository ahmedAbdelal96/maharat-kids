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
    | "accent";
  size?: "sm" | "md" | "lg" | "icon";
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
      "inline-flex items-center justify-center font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer active:scale-[0.98]";

    const variants = {
      primary:
        "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus-visible:ring-[var(--primary)] shadow-sm",
      secondary:
        "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--secondary-hover)] focus-visible:ring-[var(--secondary-foreground)]",
      outline:
        "border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-muted)] hover:border-[var(--text-muted)] focus-visible:ring-[var(--primary)]",
      ghost:
        "bg-transparent text-[var(--foreground)] hover:bg-[var(--surface-muted)] focus-visible:ring-[var(--primary)]",
      destructive:
        "bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90 focus-visible:ring-[var(--destructive)] shadow-sm",
      accent:
        "bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] focus-visible:ring-[var(--accent)] shadow-sm",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs rounded-[var(--radius-sm)] gap-1.5",
      md: "h-10 px-4 text-sm rounded-[var(--radius-md)] gap-2",
      lg: "h-12 px-6 text-base rounded-[var(--radius-lg)] gap-2.5",
      icon: "h-10 w-10 p-0 rounded-[var(--radius-md)] justify-center",
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
