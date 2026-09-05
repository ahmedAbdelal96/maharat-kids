"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/formatters";
import { markCustomerNotificationRead } from "../server/actions";
import type { CustomerNotification } from "../types";

export function NotificationBell({ notifications, unreadCount }: { notifications: CustomerNotification[]; unreadCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function openNotification(notification: CustomerNotification) {
    startTransition(async () => {
      if (!notification.readAt) await markCustomerNotificationRead({ notificationId: notification.id });
      setOpen(false);
      if (notification.href) router.push(notification.href);
    });
  }

  return (
    <div className="relative hidden sm:block">
      <Button type="button" variant="ghost" size="icon" aria-label={unreadCount ? `Notifications (${unreadCount} unread)` : "Notifications"} aria-expanded={open} onClick={() => setOpen((current) => !current)} className="relative h-9 w-9 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-bold text-[var(--accent-foreground)]">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </Button>
      {open && <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-dropdown)]"><div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3"><div><p className="text-sm font-bold text-[var(--text-primary)]">Notifications</p><p className="text-[11px] text-[var(--text-muted)]">{unreadCount ? `${unreadCount} unread` : "All caught up"}</p></div><Check className="h-4 w-4 text-[var(--success)]" /></div>{notifications.length === 0 ? <p className="px-4 py-8 text-center text-xs text-[var(--text-secondary)]">No notifications yet.</p> : <div className="max-h-80 overflow-y-auto p-1.5">{notifications.map((notification) => <button key={notification.id} type="button" disabled={isPending} onClick={() => openNotification(notification)} className="flex w-full items-start gap-2.5 rounded-[var(--radius-md)] p-2.5 text-left transition-colors hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.readAt ? "bg-[var(--border)]" : "bg-[var(--accent)]"}`} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-[var(--text-primary)]">{notification.title}</span><span className="mt-0.5 block text-xs leading-5 text-[var(--text-secondary)]">{notification.message}</span><span className="mt-1 block text-[10px] text-[var(--text-muted)]">{formatDate(notification.createdAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span></span>{notification.href && <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />}</button>)}</div>}<a href="/account/notifications" onClick={() => setOpen(false)} className="flex items-center justify-center border-t border-[var(--border)] px-4 py-3 text-xs font-bold text-[var(--primary)] hover:bg-[var(--surface-muted)]">View all</a></div>}
    </div>
  );
}
