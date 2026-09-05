"use client";

import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: ReactNode;
  showPasswordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, showPasswordToggle, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const isPasswordField = type === "password";
    const effectiveType = isPasswordField && showPassword ? "text" : type;
    const showToggle = isPasswordField && showPasswordToggle !== false;

    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
              {icon}
            </div>
          )}
          <input
            type={effectiveType}
            className={cn(
              "flex h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] transition-all",
              "focus-visible:outline-none focus-visible:border-[var(--border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              icon && "pl-10",
              showToggle && "pr-10",
              error && "border-[var(--destructive)] focus-visible:ring-[var(--destructive)]/20",
              className,
            )}
            ref={ref}
            {...props}
          />
          {showToggle && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors focus:outline-none"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-[var(--destructive)] font-medium">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
