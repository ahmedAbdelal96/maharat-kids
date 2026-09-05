"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="mx-auto max-w-xl py-20 text-center"><p className="text-sm font-semibold uppercase tracking-wider text-[var(--destructive)]">Something went wrong</p><h1 className="mt-3 text-3xl font-black tracking-tight">This page could not load</h1><p className="mt-3 text-sm text-[var(--text-secondary)]">Please try again or return to the catalog.</p><div className="mt-7 flex justify-center gap-3"><Button onClick={() => reset()}>Try Again</Button><Link href="/"><Button variant="outline">Back Home</Button></Link></div></div>;
}
