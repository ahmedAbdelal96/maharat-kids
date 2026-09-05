import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function StoreNotFound() {
  return <div className="mx-auto max-w-xl py-20 text-center"><p className="text-sm font-semibold uppercase tracking-wider text-[var(--primary)]">404</p><h1 className="mt-3 text-3xl font-black tracking-tight">We could not find that page</h1><p className="mt-3 text-sm text-[var(--text-secondary)]">The catalog link may be outdated or the item may no longer be available.</p><div className="mt-7 flex justify-center gap-3"><Link href="/products"><Button>Browse Products</Button></Link><Link href="/"><Button variant="outline">Back Home</Button></Link></div></div>;
}
