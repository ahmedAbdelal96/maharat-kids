"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/formatters";
import { markAllCustomerNotificationsRead, markCustomerNotificationRead } from "../server/actions";
import type { CustomerNotification } from "../types";

function notificationTime(value: string) {
  return formatDate(value, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function CustomerNotificationsSection({ initialNotifications, initialUnreadCount }: { initialNotifications: CustomerNotification[]; initialUnreadCount: number }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isPending, startTransition] = useTransition();
  const visible = filter === "unread" ? notifications.filter((notification) => !notification.readAt) : notifications;

  function openNotification(notification: CustomerNotification) {
    startTransition(async () => {
      if (!notification.readAt) {
        const result = await markCustomerNotificationRead({ notificationId: notification.id });
        if (result.success) {
          setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item));
          setUnreadCount((current) => Math.max(0, current - 1));
        }
      }
      if (notification.href) router.push(notification.href);
    });
  }

  function markAll() {
    startTransition(async () => {
      const result = await markAllCustomerNotificationsRead();
      if (result.success) {
        const now = new Date().toISOString();
        setNotifications((current) => current.map((item) => item.readAt ? item : { ...item, readAt: now }));
        setUnreadCount(0);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-card)] p-3">
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant={filter === "all" ? "secondary" : "ghost"} onClick={() => setFilter("all")}>All</Button>
          <Button type="button" size="sm" variant={filter === "unread" ? "secondary" : "ghost"} onClick={() => setFilter("unread")}>Unread{unreadCount > 0 && <Badge variant="accent" size="sm">{unreadCount}</Badge>}</Button>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={isPending || unreadCount === 0} onClick={markAll} className="gap-1.5"><CheckCheck className="h-3.5 w-3.5" />Mark all read</Button>
      </div>

      {visible.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center px-6 py-14 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]"><Bell className="h-5 w-5" /></div><h3 className="mt-4 text-base font-bold">{filter === "unread" ? "You are all caught up" : "No notifications yet"}</h3><p className="mt-1 max-w-sm text-sm text-[var(--text-secondary)]">Order and payment updates will appear here when something needs your attention.</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {visible.map((notification) => (
            <button key={notification.id} type="button" onClick={() => openNotification(notification)} disabled={isPending} className="group flex w-full items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-card)] p-4 text-left transition-colors hover:border-[var(--primary)]/45 hover:bg-[var(--surface-muted)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${notification.readAt ? "bg-[var(--surface-muted)] text-[var(--text-muted)]" : "bg-[var(--primary-soft)] text-[var(--primary)]"}`}><Bell className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-sm font-bold text-[var(--text-primary)]">{notification.title}</span>{!notification.readAt && <Badge variant="accent" size="sm">New</Badge>}</span><span className="mt-1 block text-sm leading-6 text-[var(--text-secondary)]">{notification.message}</span><span className="mt-2 block text-[11px] text-[var(--text-muted)]">{notificationTime(notification.createdAt)}</span></span>
              <span className="shrink-0 text-[var(--text-muted)] transition-colors group-hover:text-[var(--primary)]">{notification.href ? <ExternalLink className="h-4 w-4" /> : <Check className="h-4 w-4" />}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
