"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { logout } from "../server/actions";

export function CustomerAccountActions({ sessionId }: { sessionId: string }) {
  const router = useRouter();
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

  return <Button type="button" variant="outline" size="sm" onClick={handleLogout} className="text-xs">Sign Out</Button>;
}
