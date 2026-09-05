import slugifyPackage from "slugify";

const MAX_SLUG_ATTEMPTS = 100;

export function slugify(value: string): string {
  return (
    slugifyPackage(value, {
      lower: true,
      strict: true,
      trim: true,
    }) || "item"
  );
}

export async function generateUniqueSlug(
  name: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(name);

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    if (!(await isTaken(candidate))) return candidate;
  }

  throw new Error("SLUG_UNAVAILABLE");
}
