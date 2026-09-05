import { Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterSection() {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-[var(--surface-muted)] border border-[var(--border)] p-8 sm:p-12 text-center my-12">
      <div className="max-w-xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)] border border-[var(--border)]">
          <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span>Newsletter</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Stay informed on latest releases
        </h2>

        <p className="text-sm text-[var(--text-secondary)]">
          Subscribe to receive store announcements, new arrivals, and updates.
        </p>

        <form
          onSubmit={undefined}
          className="mt-6 flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto"
        >
          <div className="flex-1">
            <Input
              type="email"
              placeholder="Enter your email address..."
              icon={<Mail className="h-4 w-4" />}
              className="bg-[var(--surface)]"
            />
          </div>
          <Button type="submit" variant="primary" className="shrink-0">
            Subscribe
          </Button>
        </form>

        <p className="text-[11px] text-[var(--text-muted)] pt-2">
          We respect your privacy. You can unsubscribe at any time.
        </p>
      </div>
    </div>
  );
}
