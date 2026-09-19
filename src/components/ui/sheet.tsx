"use client";

import { useEffect, useRef, useId, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  side?: "right" | "left" | "bottom";
  children: ReactNode;
  className?: string;
}

export function Sheet({
  isOpen,
  onClose,
  title,
  description,
  side = "right",
  children,
  className,
}: SheetProps) {
  const titleId = useId();
  const descriptionId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const t = useTranslations("common.actions");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      sheetRef.current?.focus();
    } else {
      document.body.style.overflow = "unset";
      previousActiveElement.current?.focus?.();
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const slideVariants = {
    right: {
      initial: { x: "100%" },
      animate: { x: 0 },
      exit: { x: "100%" },
      position: "fixed inset-y-0 right-0 w-full max-w-md border-l",
    },
    left: {
      initial: { x: "-100%" },
      animate: { x: 0 },
      exit: { x: "-100%" },
      position: "fixed inset-y-0 left-0 w-full max-w-md border-r",
    },
    bottom: {
      initial: { y: "100%" },
      animate: { y: 0 },
      exit: { y: "100%" },
      position: "fixed inset-x-0 bottom-0 max-h-[85vh] border-t rounded-t-[var(--radius-xl)]",
    },
  };

  const selected = slideVariants[side];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : undefined}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 bg-[var(--foreground)]/60 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Body */}
          <motion.div
            ref={sheetRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descriptionId : undefined}
            initial={selected.initial}
            animate={selected.animate}
            exit={selected.exit}
            transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", damping: 30, stiffness: 180 }}
            className={cn(
              "z-10 flex flex-col bg-[var(--surface)] border-[var(--border)] shadow-[var(--shadow-elevated)] focus:outline-none",
              selected.position,
              className,
            )}
          >
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <div>
                {title && (
                  <h3
                    id={titleId}
                    className="text-base font-semibold text-[var(--text-primary)]"
                  >
                    {title}
                  </h3>
                )}
                {description && (
                  <p
                    id={descriptionId}
                    className="text-xs text-[var(--text-secondary)] mt-0.5"
                  >
                    {description}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="rounded-[var(--radius-sm)] p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] transition-colors"
                aria-label={t("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
