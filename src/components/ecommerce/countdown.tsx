"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

const emptySubscribe = () => () => {};

function calculateTimeLeft(endsAt: string): TimeLeft {
  const target = new Date(endsAt).getTime();
  const now = new Date().getTime();
  const diff = target - now;

  if (isNaN(target) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds, isExpired: false };
}

export function Countdown({
  endsAt,
  size = "md",
  className = "",
}: {
  endsAt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const t = useTranslations("time");
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(endsAt));

  useEffect(() => {
    const interval = setInterval(() => {
      const next = calculateTimeLeft(endsAt);
      setTimeLeft(next);
      if (next.isExpired) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endsAt]);

  // Before mounting, render placeholder with same layout to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] ${className}`}>
        <Clock className="h-3.5 w-3.5 opacity-60" />
        <span>{t("limited")}</span>
      </div>
    );
  }

  if (timeLeft.isExpired) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-medium ${className}`}>
        <Clock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
        <span>{t("ended")}</span>
      </div>
    );
  }

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (size === "sm") {
    return (
      <div
        role="timer"
        aria-live="polite"
        className={`inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)] ${className}`}
      >
        <Clock className="h-3 w-3 text-[var(--primary)] shrink-0" />
        <span>
          {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}
          {pad(timeLeft.hours)}h {pad(timeLeft.minutes)}m {pad(timeLeft.seconds)}s
        </span>
      </div>
    );
  }

  if (size === "lg") {
    return (
      <div
        role="timer"
        aria-live="polite"
        aria-label={`Time remaining: ${timeLeft.days} days, ${timeLeft.hours} hours, ${timeLeft.minutes} minutes, ${timeLeft.seconds} seconds`}
        className={`flex items-center gap-2 ${className}`}
      >
        {timeLeft.days > 0 && (
          <div className="flex flex-col items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)]/80 px-3 py-2 text-center min-w-[3.5rem]">
            <span className="text-xl font-bold font-mono tracking-tight text-[var(--text-primary)]">
              {timeLeft.days}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
              {t("days")}
            </span>
          </div>
        )}
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)]/80 px-3 py-2 text-center min-w-[3.5rem]">
          <span className="text-xl font-bold font-mono tracking-tight text-[var(--text-primary)]">
            {pad(timeLeft.hours)}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
            {t("hours")}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)]/80 px-3 py-2 text-center min-w-[3.5rem]">
          <span className="text-xl font-bold font-mono tracking-tight text-[var(--text-primary)]">
            {pad(timeLeft.minutes)}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
            {t("minutes")}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)]/80 px-3 py-2 text-center min-w-[3.5rem]">
          <span className="text-xl font-bold font-mono tracking-tight text-[var(--primary)]">
            {pad(timeLeft.seconds)}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
            {t("seconds")}
          </span>
        </div>
      </div>
    );
  }

  // Default "md" size
  return (
    <div
      role="timer"
      aria-live="polite"
      className={`inline-flex items-center gap-2 rounded-[var(--radius-full)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs ${className}`}
    >
      <Clock className="h-3.5 w-3.5 text-[var(--primary)] shrink-0" />
      <span className="font-mono font-semibold text-[var(--text-primary)]">
        {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{t("left")}</span>
    </div>
  );
}
