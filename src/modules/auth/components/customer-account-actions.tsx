"use client";

import { useRouter } from "@/i18n/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { logout } from "../server/actions";
import { useTranslations } from "next-intl";

export function CustomerAccountActions({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const t = useTranslations("auth");
  const [, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      const result = await logout(sessionId);
      if (result.success) {
        router.replace("/login");
        router.refresh();
      }
    });
  }

  return <Button type="button" variant="outline" size="sm" onClick={handleLogout} className="text-xs">{t("signOut")}</Button>;
}
