import { getTranslations } from "next-intl/server";

export default async function LocaleNotFound() {
  const t = await getTranslations("common");
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold text-[var(--primary)]">404</p>
      <h1 className="mt-2 text-3xl font-extrabold">{t("notFound.title")}</h1>
      <p className="mt-3 text-sm text-[var(--text-secondary)]">{t("notFound.description")}</p>
    </main>
  );
}
