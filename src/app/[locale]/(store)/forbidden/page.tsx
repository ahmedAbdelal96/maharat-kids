import { Link } from "@/i18n/navigation";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--destructive-subtle)] text-[var(--destructive)] mb-4">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
        Access Restricted
      </h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-md">
        You do not have the required permissions to view this administrative resource. Contact your store owner if you believe this is an error.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/">
          <Button variant="outline" size="sm">
            Return to Store
          </Button>
        </Link>
        <Link href="/login">
          <Button size="sm">
            Sign In with Another Account
          </Button>
        </Link>
      </div>
    </div>
  );
}
