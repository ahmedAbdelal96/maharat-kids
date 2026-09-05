"use client";

import { useMemo, useState } from "react";
import { Check, Save } from "lucide-react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { updateStoreSettings } from "../server/actions";
import { supportedCurrencies, supportedLocales } from "../schema";
import type { StoreSettings } from "../types";

type SettingsField = keyof StoreSettings;

function fieldLabel(field: SettingsField): string {
  return field === "seoTitle"
    ? "SEO Meta Title"
    : field === "seoDescription"
      ? "SEO Meta Description"
      : field.charAt(0).toUpperCase() + field.slice(1);
}

export function AdminSettingsForm({ initialValues }: { initialValues: StoreSettings }) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [savedValues, setSavedValues] = useState(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isDirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(savedValues),
    [savedValues, values],
  );

  function updateField(field: SettingsField, value: string | boolean | number) {
    setValues((current) => ({ ...current, [field]: value }));
    setSaved(false);
    setErrorMessage(null);
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSaved(false);
    setErrorMessage(null);

    try {
      const result = await updateStoreSettings(values);

      if (!result.success) {
        setErrorMessage(result.error.message);
        return;
      }

      setSavedValues(values);
      setSaved(true);
      router.refresh();
    } catch {
      setErrorMessage("The store settings service is unavailable.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Store Settings
        </h1>
        <p className="mt-0.5 text-xs text-[var(--text-secondary)] sm:text-sm">
          Manage general store parameters, contact information, and SEO defaults.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="store-name" className="mb-1 block text-xs font-semibold text-[var(--text-primary)]">
                Store Name (store.name)
              </label>
              <Input id="store-name" required value={values.name} onChange={(event) => updateField("name", event.target.value)} className="text-xs" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="store-email" className="mb-1 block text-xs font-semibold text-[var(--text-primary)]">
                  Contact Email (store.email)
                </label>
                <Input id="store-email" type="email" value={values.email} onChange={(event) => updateField("email", event.target.value)} className="text-xs" />
              </div>

              <div>
                <label htmlFor="store-phone" className="mb-1 block text-xs font-semibold text-[var(--text-primary)]">
                  Contact Phone (store.phone)
                </label>
                <Input id="store-phone" type="tel" value={values.phone} onChange={(event) => updateField("phone", event.target.value)} className="text-xs" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Authentication</CardTitle>
          </CardHeader>
          <CardContent>
            <label htmlFor="auth-google-enabled" className="flex cursor-pointer items-start justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)]/30 p-4">
              <span>
                <span className="block text-sm font-semibold text-[var(--text-primary)]">Google Sign-In</span>
                <span className="mt-1 block text-xs text-[var(--text-secondary)]">
                  Allow customers to sign in or create an account with Google.
                </span>
                <span className="mt-1 block text-[10px] text-[var(--text-muted)]">auth.google.enabled</span>
              </span>
              <input
                id="auth-google-enabled"
                type="checkbox"
                checked={values.googleEnabled}
                onChange={(event) => updateField("googleEnabled", event.currentTarget.checked)}
                className="mt-1 h-4 w-4 accent-[var(--primary)]"
              />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Currency &amp; Localization</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="store-currency" className="mb-1 block text-xs font-semibold text-[var(--text-primary)]">
                Base Currency (store.currency)
              </label>
              <select id="store-currency" value={values.currency} onChange={(event) => updateField("currency", event.target.value)} className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]">
                {supportedCurrencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.label}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="store-language" className="mb-1 block text-xs font-semibold text-[var(--text-primary)]">
                Default Language (store.language)
              </label>
              <select id="store-language" value={values.language} onChange={(event) => updateField("language", event.target.value)} className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]">
                {supportedLocales.map((locale) => <option key={locale} value={locale}>{locale}</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Promotions &amp; Hero Campaigns</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="promotions-max-active" className="mb-1 block text-xs font-semibold text-[var(--text-primary)]">
                Maximum Enabled Offers (promotions.maxActiveOffers)
              </label>
              <Input
                id="promotions-max-active"
                type="number"
                min={1}
                max={100}
                value={values.maxActiveOffers}
                onChange={(event) => updateField("maxActiveOffers", Number(event.target.value) || 1)}
                className="text-xs"
              />
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">Maximum number of active commercial offers allowed simultaneously (1–100).</p>
            </div>

            <div>
              <label htmlFor="promotions-max-hero" className="mb-1 block text-xs font-semibold text-[var(--text-primary)]">
                Maximum Homepage Hero Offers (promotions.maxHeroOffers)
              </label>
              <Input
                id="promotions-max-hero"
                type="number"
                min={1}
                max={10}
                value={values.maxHeroOffers}
                onChange={(event) => updateField("maxHeroOffers", Number(event.target.value) || 1)}
                className="text-xs"
              />
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">Maximum number of campaigns displayed in the homepage hero carousel (1–10).</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">SEO Defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(["seoTitle", "seoDescription"] as const).map((field) => (
              <div key={field}>
                <label htmlFor={field} className="mb-1 block text-xs font-semibold text-[var(--text-primary)]">
                  {fieldLabel(field)} ({field === "seoTitle" ? "seo.title" : "seo.description"})
                </label>
                <Input id={field} value={values[field]} onChange={(event) => updateField(field, event.target.value)} className="text-xs" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer Returns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label htmlFor="returns-enabled" className="flex cursor-pointer items-start justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)]/30 p-4">
              <span>
                <span className="block text-sm font-semibold text-[var(--text-primary)]">Allow customer return requests</span>
                <span className="mt-1 block text-xs text-[var(--text-secondary)]">Customers can request returns for delivered orders within the configured window.</span>
              </span>
              <input id="returns-enabled" type="checkbox" checked={values.returnsEnabled} onChange={(event) => updateField("returnsEnabled", event.currentTarget.checked)} className="mt-1 h-4 w-4 accent-[var(--primary)]" />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="returns-window-days" className="mb-1 block text-xs font-semibold text-[var(--text-primary)]">Return window (days)</label>
                <Input id="returns-window-days" type="number" min={1} max={365} value={values.returnsWindowDays} onChange={(event) => updateField("returnsWindowDays", Number(event.target.value) || 1)} className="text-xs" />
              </div>
              <div>
                <label htmlFor="returns-policy-text" className="mb-1 block text-xs font-semibold text-[var(--text-primary)]">Customer policy text</label>
                <Input id="returns-policy-text" value={values.returnsPolicyText} onChange={(event) => updateField("returnsPolicyText", event.target.value)} placeholder="Optional return policy" className="text-xs" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-2">
          {errorMessage && <span role="alert" className="text-xs font-medium text-[var(--destructive)]">{errorMessage}</span>}
          {saved && (
            <span role="status" className="flex items-center gap-1 text-xs font-medium text-[var(--success)]">
              <Check className="h-4 w-4" /> Settings updated
            </span>
          )}
          <Button type="submit" size="md" className="gap-2 text-xs" disabled={!isDirty || isSubmitting} isLoading={isSubmitting}>
            <Save className="h-4 w-4" />
            <span>Save Settings</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
