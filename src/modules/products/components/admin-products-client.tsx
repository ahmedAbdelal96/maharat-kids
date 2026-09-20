"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useMemo, useState, type FormEvent } from "react";
import {
  Archive,
  Boxes,
  Copy,
  ExternalLink,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  MediaUploader,
  type MediaSelection,
} from "@/modules/media/components/media-uploader";
import { deleteMedia } from "@/modules/media/server/actions";
import { saveProductTranslations } from "@/modules/catalog/server/translation-actions";
import { saveProductVariants } from "../server/variant-actions";
import {
  adjustProductStock,
  createProduct,
  deleteProduct,
  duplicateProduct,
  setProductStatus,
  updateProduct,
} from "../server/actions";
import type { Category } from "@/modules/categories/types";
import type { Product, ProductPage } from "../types";

type FormState = {
  id?: string;
  name: string;
  nameAr: string;
  nameEn: string;
  shortDescription: string;
  description: string;
  sku: string;
  saudiPrice: string;
  saudiCompareAtPrice: string;
  egyptPrice: string;
  egyptCompareAtPrice: string;
  status: Product["status"];
  isFeatured: boolean;
  categoryId: string;
  categoryIds: string[];
  minAgeMonths: string;
  maxAgeMonths: string;
  productLanguage: Product["productLanguage"];
  difficultyLevel: Exclude<Product["difficultyLevel"], null> | "";
  skillIds: string[];
  learningObjectiveIds: string[];
  productTypeIds: string[];
  useContextIds: string[];
  ageGroupIds: string[];
  trackInventory: boolean;
  stockQuantity: string;
  images: MediaSelection[];
  originalMediaIds?: string[];
};
type OptionDraft = { id?: string; nameAr: string; nameEn: string; values: Array<{ id?: string; labelAr: string; labelEn: string; isActive: boolean }> };
type VariantDraft = { id?: string; optionValueIds: string[]; sku: string; stockQuantity: string; active: boolean; saudiPrice: string; egyptPrice: string };
type Filters = {
  search: string;
  status: "ALL" | Product["status"];
  categoryId: string;
};
const emptyForm: FormState = {
  name: "",
  nameAr: "",
  nameEn: "",
  shortDescription: "",
  description: "",
  sku: "",
  saudiPrice: "",
  saudiCompareAtPrice: "",
  egyptPrice: "",
  egyptCompareAtPrice: "",
  status: "DRAFT",
  isFeatured: false,
  categoryId: "",
  categoryIds: [],
  minAgeMonths: "",
  maxAgeMonths: "",
  productLanguage: "LANGUAGE_INDEPENDENT",
  difficultyLevel: "",
  skillIds: [],
  learningObjectiveIds: [],
  productTypeIds: [],
  useContextIds: [],
  ageGroupIds: [],
  trackInventory: false,
  stockQuantity: "0",
  images: [],
};

function flatten(
  categories: Category[] = [],
  parentId: string | null = null,
  depth = 0,
): { category: Category; depth: number }[] {
  return categories
    .filter((category) => category.parentId === parentId)
    .flatMap((category) => [
      { category, depth },
      ...flatten(categories, category.id, depth + 1),
    ]);
}

function formatDate(value: string) {
  return value.slice(0, 10);
}

export function AdminProductsClient({
  initialPage,
  categories,
  taxonomy,
  initialFilters,
}: {
  initialPage: ProductPage;
  categories: Category[];
  taxonomy: { skills: Array<{ id: string; nameAr: string; nameEn: string }>; objectives: Array<{ id: string; nameAr: string; nameEn: string }>; productTypes: Array<{ id: string; nameAr: string; nameEn: string }>; useContexts: Array<{ id: string; nameAr: string; nameEn: string }>; ageGroups: Array<{ id: string; nameAr: string; nameEn: string }> };
  initialFilters: Filters;
}) {
  const router = useRouter();
  const routeKey = `${initialPage.page}:${initialPage.total}:${initialFilters.search}:${initialFilters.status}:${initialFilters.categoryId}`;
  const [localPage, setLocalPage] = useState<{
    key: string;
    value: ProductPage;
  } | null>(null);
  const page = localPage?.key === routeKey ? localPage.value : initialPage;
  const [filters, setFilters] = useState(initialFilters);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [open, setOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockAmount, setStockAmount] = useState("1");
  const [stockDirection, setStockDirection] = useState<"increase" | "decrease">(
    "increase",
  );
  const [saving, setSaving] = useState(false);
  const [stockSaving, setStockSaving] = useState(false);
  const [error, setError] = useState("");
  const [variantOptions, setVariantOptions] = useState<OptionDraft[]>([]);
  const [variantRows, setVariantRows] = useState<VariantDraft[]>([]);
  const [stockError, setStockError] = useState("");
  const categoryOptions = useMemo(() => flatten(categories), [categories]);

  function updatePage(updater: (current: ProductPage) => ProductPage) {
    setLocalPage({ key: routeKey, value: updater(page) });
  }
  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function navigate(next: Partial<Filters> & { page?: number } = {}) {
    const nextFilters = { ...filters, ...next };
    const params = new URLSearchParams();
    if (nextFilters.search.trim()) params.set("q", nextFilters.search.trim());
    if (nextFilters.status !== "ALL") params.set("status", nextFilters.status);
    if (nextFilters.categoryId !== "ALL")
      params.set("categoryId", nextFilters.categoryId);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    const query = params.toString();
    router.push(query ? `/admin/products?${query}` : "/admin/products");
  }
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate({ page: 1 });
  }
  function startCreate() {
    setForm({ ...emptyForm });
    setVariantOptions([]);
    setVariantRows([]);
    setError("");
    setOpen(true);
  }
  function startEdit(product: Product) {
    setForm({
      id: product.id,
      name: product.name,
      nameAr: product.name,
      nameEn: product.name,
      shortDescription: product.shortDescription ?? "",
      description: product.description ?? "",
      sku: product.sku ?? "",
      saudiPrice: product.marketPrices.saudiPrice,
      saudiCompareAtPrice: product.marketPrices.saudiCompareAtPrice ?? "",
      egyptPrice: product.marketPrices.egyptPrice,
      egyptCompareAtPrice: product.marketPrices.egyptCompareAtPrice ?? "",
      status: product.status,
      isFeatured: product.isFeatured,
      categoryId: product.categoryId ?? "",
      categoryIds: product.categoryIds,
      minAgeMonths: product.minAgeMonths == null ? "" : String(product.minAgeMonths),
      maxAgeMonths: product.maxAgeMonths == null ? "" : String(product.maxAgeMonths),
      productLanguage: product.productLanguage,
      difficultyLevel: product.difficultyLevel ?? "",
      skillIds: product.skillIds,
      learningObjectiveIds: product.learningObjectiveIds,
      productTypeIds: product.productTypeIds,
      useContextIds: product.useContextIds,
      ageGroupIds: product.ageGroupIds,
      trackInventory: product.trackInventory,
      stockQuantity: String(product.stockQuantity),
      images: product.images
        .filter((image): image is typeof image & { mediaId: string } =>
          Boolean(image.mediaId),
        )
        .map((image, index) => ({
          mediaId: image.mediaId,
          url: image.url,
          sortOrder: index,
          isPrimary: image.isPrimary,
        })),
      originalMediaIds: product.images
        .map((image) => image.mediaId)
        .filter((mediaId): mediaId is string => Boolean(mediaId)),
    });
    setVariantOptions((product.options ?? []).map((option) => ({ id: option.id, nameAr: option.nameAr, nameEn: option.nameEn, values: option.values.map((value) => ({ id: value.id, labelAr: value.labelAr, labelEn: value.labelEn, isActive: value.isActive })) })));
    setVariantRows((product.variants ?? []).map((variant) => ({ id: variant.id, optionValueIds: variant.options.map((value) => value.valueId), sku: variant.sku, stockQuantity: String(variant.stockQuantity), active: variant.active, saudiPrice: variant.marketPrices.find((price) => price.market === "SAUDI_ARABIA")?.price ?? "", egyptPrice: variant.marketPrices.find((price) => price.market === "EGYPT")?.price ?? "" })));
    setError("");
    setOpen(true);
  }
  function closeForm() {
    const original = new Set(form.originalMediaIds ?? []);
    for (const image of form.images.filter(
      (image) => !original.has(image.mediaId),
    ))
      void deleteMedia({ id: image.mediaId });
    setOpen(false);
  }
  async function cleanupPendingMedia() {
    const original = new Set(form.originalMediaIds ?? []);
    await Promise.all(
      form.images
        .filter((image) => !original.has(image.mediaId))
        .map((image) => deleteMedia({ id: image.mediaId })),
    );
  }
  async function save() {
    setSaving(true);
    setError("");
    const input = {
      ...form,
      marketPrices: {
        saudiPrice: form.saudiPrice,
        saudiCompareAtPrice: form.saudiCompareAtPrice || null,
        egyptPrice: form.egyptPrice,
        egyptCompareAtPrice: form.egyptCompareAtPrice || null,
      },
      shortDescription: form.shortDescription || null,
      description: form.description || null,
      sku: form.sku || null,
      price: form.saudiPrice,
      compareAtPrice: form.saudiCompareAtPrice || null,
      categoryId: form.categoryId || null,
      categoryIds: form.categoryIds.length ? form.categoryIds : (form.categoryId ? [form.categoryId] : []),
      primaryCategoryId: form.categoryId || null,
      minAgeMonths: form.minAgeMonths ? Number(form.minAgeMonths) : null,
      maxAgeMonths: form.maxAgeMonths ? Number(form.maxAgeMonths) : null,
      productLanguage: form.productLanguage,
      difficultyLevel: form.difficultyLevel || null,
      stockQuantity: Number(form.stockQuantity) || 0,
      images: form.images.map((image, index) => ({
        mediaId: image.mediaId,
        sortOrder: index,
        isPrimary: image.isPrimary,
      })),
    };
    const result = form.id
      ? await updateProduct({ ...input, id: form.id })
      : await createProduct(input);
    if (!result.success) {
      setError(result.error.message);
      await cleanupPendingMedia();
    } else {
      const translations = await saveProductTranslations({ productId: result.data.id, nameAr: form.nameAr || form.name, nameEn: form.nameEn || form.name });
      if (!translations.success) { setError(translations.error.message); setSaving(false); return; }
      if (variantOptions.length > 0) {
        const variants = await saveProductVariants({ productId: result.data.id, options: variantOptions.map((option, optionIndex) => ({ ...option, sortOrder: optionIndex, values: option.values.map((value, valueIndex) => ({ ...value, sortOrder: valueIndex })) })), variants: variantRows.map((variant, index) => ({ ...variant, sortOrder: index, stockQuantity: Number(variant.stockQuantity) || 0, saudiPrice: variant.saudiPrice || null, egyptPrice: variant.egyptPrice || null })), generateMissing: true });
        if (!variants.success) { setError(variants.error.message); setSaving(false); return; }
      }
      updatePage((current) => ({
        ...current,
        items: form.id
          ? current.items.map((item) =>
              item.id === result.data.id ? result.data : item,
            )
          : [result.data, ...current.items].slice(0, current.pageSize),
        total: form.id ? current.total : current.total + 1,
      }));
      setOpen(false);
    }
    setSaving(false);
  }
  function addVariantOption() { const id = crypto.randomUUID(); setVariantOptions((current) => [...current, { id, nameAr: "", nameEn: "", values: [{ id: crypto.randomUUID(), labelAr: "", labelEn: "", isActive: true }] }]); }
  function addVariantValue(optionIndex: number) { setVariantOptions((current) => current.map((option, index) => index === optionIndex ? { ...option, values: [...option.values, { id: crypto.randomUUID(), labelAr: "", labelEn: "", isActive: true }] } : option)); }
  function generateVariantRows() { const options = variantOptions.filter((option) => option.values.some((value) => value.labelEn.trim())); const combinations = options.reduce<Array<string[]>>((rows, option) => rows.flatMap((row) => option.values.filter((value) => value.labelEn.trim()).map((value) => [...row, value.id ?? `${options.indexOf(option)}-${option.values.indexOf(value)}`])), [[]]); setVariantRows(combinations.map((optionValueIds, index) => variantRows.find((row) => row.optionValueIds.join("|") === optionValueIds.join("|")) ?? { optionValueIds, sku: form.sku ? `${form.sku}-V${String(index + 1).padStart(2, "0")}` : `VARIANT-${index + 1}`, stockQuantity: "0", active: true, saudiPrice: "", egyptPrice: "" })); }
  async function changeStatus(product: Product, status: "ACTIVE" | "ARCHIVED") {
    setError("");
    const result = await setProductStatus({ id: product.id, status });
    if (!result.success) setError(result.error.message);
    else
      updatePage((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.id === product.id ? result.data : item,
        ),
      }));
  }
  async function duplicate(product: Product) {
    setError("");
    const result = await duplicateProduct({ id: product.id });
    if (!result.success) setError(result.error.message);
    else
      updatePage((current) => ({
        ...current,
        items: [result.data, ...current.items].slice(0, current.pageSize),
        total: current.total + 1,
      }));
  }
  async function remove(product: Product) {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`))
      return;
    setError("");
    const result = await deleteProduct({ id: product.id });
    if (!result.success) setError(result.error.message);
    else
      updatePage((current) => ({
        ...current,
        items: current.items.filter((item) => item.id !== product.id),
        total: Math.max(0, current.total - 1),
      }));
  }
  function openStock(product: Product) {
    setStockProduct(product);
    setStockAmount("1");
    setStockDirection("increase");
    setStockError("");
  }
  async function saveStock() {
    if (!stockProduct) return;
    const amount = Number(stockAmount);
    if (!Number.isInteger(amount) || amount < 1) {
      setStockError("Enter a whole number greater than zero.");
      return;
    }
    setStockSaving(true);
    setStockError("");
    const result = await adjustProductStock({
      id: stockProduct.id,
      quantityDelta: stockDirection === "increase" ? amount : -amount,
    });
    if (!result.success) setStockError(result.error.message);
    else {
      updatePage((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.id === result.data.id ? result.data : item,
        ),
      }));
      setStockProduct(null);
    }
    setStockSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Products ({page.total})</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Manage catalog products, pricing, images, visibility, and stock.
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={startCreate}>
          <Plus className="h-4 w-4" />
          New Product
        </Button>
      </div>
      <form
        onSubmit={submitSearch}
        className="flex flex-col gap-3 lg:flex-row lg:items-center"
      >
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
          <Input
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                search: event.target.value,
              }))
            }
            placeholder="Search products or SKU..."
            className="pl-9"
          />
        </div>
        <select
          value={filters.status}
          onChange={(event) => {
            const status = event.target.value as Filters["status"];
            setFilters((current) => ({ ...current, status }));
            navigate({ status, page: 1 });
          }}
          aria-label="Filter products by status"
          className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-xs"
        >
          <option value="ALL">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select
          value={filters.categoryId}
          onChange={(event) => {
            const categoryId = event.target.value;
            setFilters((current) => ({ ...current, categoryId }));
            navigate({ categoryId, page: 1 });
          }}
          aria-label="Filter products by category"
          className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-xs"
        >
          <option value="ALL">All categories</option>
          {categoryOptions.map(({ category, depth }) => (
            <option
              key={category.id}
              value={category.id}
            >{`${"— ".repeat(depth)}${category.name}`}</option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
      </form>
      {error && (
        <p
          role="alert"
          className="rounded-md bg-[var(--destructive-subtle)] px-3 py-2 text-xs text-[var(--destructive)]"
        >
          {error}
        </p>
      )}
      <div className="overflow-x-auto rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-card)]">
        <table className="w-full min-w-[1080px] text-left">
          <thead className="border-b border-[var(--border)] text-xs text-[var(--text-secondary)]">
            <tr>
              <th className="px-5 py-3">Image</th>
              <th className="px-5 py-3">Product</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Price</th>
              <th className="px-5 py-3">Stock</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Created</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {page.items.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-12 text-center text-sm text-[var(--text-secondary)]"
                >
                  No products found.
                </td>
              </tr>
            ) : (
              page.items.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-[var(--border-subtle)] last:border-0"
                >
                  <td className="px-5 py-3">
                    {product.images[0]?.url ? (
                      <Image
                        src={product.images[0].url}
                        alt=""
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[var(--surface-muted)]">
                        <Package className="h-5 w-5 text-[var(--text-secondary)]" />
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-sm font-semibold">{product.name}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {product.sku ?? "No SKU"}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-xs text-[var(--text-secondary)]">
                    {product.categoryName ?? "Uncategorized"}
                  </td>
                  <td className="px-5 py-3 text-sm font-bold">
                    {product.price}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {product.trackInventory
                      ? `${product.stockQuantity} available`
                      : "Not tracked"}
                  </td>
                  <td className="px-5 py-3">
                    <Badge
                      size="sm"
                      variant={
                        product.status === "ACTIVE"
                          ? "success"
                          : product.status === "ARCHIVED"
                            ? "secondary"
                            : "warning"
                      }
                    >
                      {product.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-xs text-[var(--text-secondary)]">
                    {formatDate(product.createdAt)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${product.name}`}
                        onClick={() => startEdit(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Duplicate ${product.name}`}
                        onClick={() => void duplicate(product)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Adjust stock for ${product.name}`}
                        onClick={() => openStock(product)}
                      >
                        <Boxes className="h-4 w-4" />
                      </Button>
                      <Link
                        href={`/products/${product.slug}`}
                        target="_blank"
                        aria-label={`View ${product.name} storefront`}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      {product.status === "ARCHIVED" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void changeStatus(product, "ACTIVE")}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restore
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void changeStatus(product, "ARCHIVED")}
                        >
                          <Archive className="h-3.5 w-3.5" />
                          Archive
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${product.name}`}
                        onClick={() => void remove(product)}
                      >
                        <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {page.totalPages > 1 && (
        <nav
          aria-label="Product pagination"
          className="flex items-center justify-center gap-3"
        >
          <Button
            variant="outline"
            size="sm"
            disabled={page.page <= 1}
            onClick={() => navigate({ page: page.page - 1 })}
          >
            Previous
          </Button>
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            Page {page.page} of {page.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page.page >= page.totalPages}
            onClick={() => navigate({ page: page.page + 1 })}
          >
            Next
          </Button>
        </nav>
      )}
      <Modal
        isOpen={open}
        onClose={() => !saving && closeForm()}
        title={form.id ? "Edit product" : "Create product"}
        description="Manage the product record and its Media images."
        maxWidth="2xl"
      >
        <div className="max-h-[72vh] space-y-5 overflow-y-auto pr-1">
          <section className="space-y-3">
            <h3 className="text-sm font-bold">Basic Information</h3>
            <label className="block text-xs font-semibold">
              Name
              <Input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-semibold">Arabic name<Input value={form.nameAr} onChange={(event) => updateField("nameAr", event.target.value)} /></label><label className="block text-xs font-semibold">English name<Input value={form.nameEn} onChange={(event) => updateField("nameEn", event.target.value)} /></label></div>
            <label className="block text-xs font-semibold">
              SKU
              <Input
                value={form.sku}
                onChange={(event) => updateField("sku", event.target.value)}
                placeholder="Leave empty to generate automatically"
              />
            </label>
            <label className="block text-xs font-semibold">
              Short description
              <Input
                value={form.shortDescription}
                onChange={(event) =>
                  updateField("shortDescription", event.target.value)
                }
              />
            </label>
            <label className="block text-xs font-semibold">
              Description
              <textarea
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                className="mt-1 min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
            </label>
          </section>
          <section className="space-y-3 border-t border-[var(--border)] pt-4">
            <h3 className="text-sm font-bold">Market pricing</h3>
            <div className="grid gap-5 lg:grid-cols-2">
              <fieldset className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3"><legend className="px-1 text-xs font-bold">Saudi Arabia (SAR)</legend>
              <label className="block text-xs font-semibold">
                Price
                <Input
                  value={form.saudiPrice}
                  onChange={(event) => updateField("saudiPrice", event.target.value)}
                  inputMode="decimal"
                />
              </label>
              <label className="block text-xs font-semibold">
                Compare-at price
                <Input
                  value={form.saudiCompareAtPrice}
                  onChange={(event) =>
                    updateField("saudiCompareAtPrice", event.target.value)
                  }
                  inputMode="decimal"
                />
              </label>
              </fieldset>
              <fieldset className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3"><legend className="px-1 text-xs font-bold">Egypt (EGP)</legend>
              <label className="block text-xs font-semibold">Price<Input value={form.egyptPrice} onChange={(event) => updateField("egyptPrice", event.target.value)} inputMode="decimal" /></label>
              <label className="block text-xs font-semibold">Compare-at price<Input value={form.egyptCompareAtPrice} onChange={(event) => updateField("egyptCompareAtPrice", event.target.value)} inputMode="decimal" /></label>
              </fieldset>
            </div>
            <label className="block text-xs font-semibold">
              Category
              <select
                value={form.categoryId}
                onChange={(event) =>
                  updateField("categoryId", event.target.value)
                }
                className="mt-1 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              >
                <option value="">Uncategorized</option>
                {categoryOptions.map(({ category, depth }) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >{`${"— ".repeat(depth)}${category.name}`}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold">Additional categories<select multiple value={form.categoryIds} onChange={(event) => updateField("categoryIds", Array.from(event.target.selectedOptions, (option) => option.value))} className="mt-1 min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">{categoryOptions.map(({ category, depth }) => <option key={category.id} value={category.id}>{`${"— ".repeat(depth)}${category.name}`}</option>)}</select></label>
            <section className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-semibold">Minimum age (months)<Input type="number" min={0} value={form.minAgeMonths} onChange={(event) => updateField("minAgeMonths", event.target.value)} /></label><label className="block text-xs font-semibold">Maximum age (months)<Input type="number" min={0} value={form.maxAgeMonths} onChange={(event) => updateField("maxAgeMonths", event.target.value)} /></label><label className="block text-xs font-semibold">Product language<select value={form.productLanguage} onChange={(event) => updateField("productLanguage", event.target.value as Product["productLanguage"])} className="mt-1 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"><option value="ARABIC">Arabic</option><option value="ENGLISH">English</option><option value="BILINGUAL">Bilingual</option><option value="LANGUAGE_INDEPENDENT">Language independent</option></select></label><label className="block text-xs font-semibold">Difficulty<select value={form.difficultyLevel} onChange={(event) => updateField("difficultyLevel", event.target.value as FormState["difficultyLevel"])} className="mt-1 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"><option value="">Not set</option><option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option></select></label></section>
            <div className="grid gap-3 sm:grid-cols-2">{([{ key: "skillIds", label: "Skills", options: taxonomy.skills }, { key: "learningObjectiveIds", label: "Learning objectives", options: taxonomy.objectives }, { key: "productTypeIds", label: "Product types", options: taxonomy.productTypes }, { key: "useContextIds", label: "Use contexts", options: taxonomy.useContexts }, { key: "ageGroupIds", label: "Age groups", options: taxonomy.ageGroups }] as const).map((facet) => <label key={facet.key} className="block text-xs font-semibold">{facet.label}<select multiple value={form[facet.key]} onChange={(event) => updateField(facet.key, Array.from(event.target.selectedOptions, (option) => option.value))} className="mt-1 min-h-24 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">{facet.options.map((option) => <option key={option.id} value={option.id}>{option.nameAr} / {option.nameEn}</option>)}</select></label>)}</div>
          </section>
          <section className="space-y-4 border-t border-[var(--border)] pt-4" aria-label="Variants and options">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-bold">Variants and options</h3><p className="mt-1 text-xs text-[var(--text-secondary)]">Define product-specific options, then generate only the missing combinations.</p></div><div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={addVariantOption}>Add option</Button>{variantOptions.length > 0 && <Button type="button" size="sm" onClick={generateVariantRows}>Generate combinations</Button>}</div></div>
            {variantOptions.length > 0 && <div className="space-y-3">{variantOptions.map((option, optionIndex) => <div key={option.id ?? optionIndex} className="rounded-[var(--radius-md)] border border-[var(--border)] p-3"><div className="grid gap-2 sm:grid-cols-2"><Input aria-label={`Option ${optionIndex + 1} Arabic name`} placeholder="Option name Arabic" value={option.nameAr} onChange={(event) => setVariantOptions((current) => current.map((item, index) => index === optionIndex ? { ...item, nameAr: event.target.value } : item))} /><Input aria-label={`Option ${optionIndex + 1} English name`} placeholder="Option name English" value={option.nameEn} onChange={(event) => setVariantOptions((current) => current.map((item, index) => index === optionIndex ? { ...item, nameEn: event.target.value } : item))} /></div><div className="mt-3 space-y-2">{option.values.map((value, valueIndex) => <div key={value.id ?? valueIndex} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><Input aria-label={`Option ${optionIndex + 1} value ${valueIndex + 1} Arabic`} placeholder="Value Arabic" value={value.labelAr} onChange={(event) => setVariantOptions((current) => current.map((item, index) => index === optionIndex ? { ...item, values: item.values.map((entry, entryIndex) => entryIndex === valueIndex ? { ...entry, labelAr: event.target.value } : entry) } : item))} /><Input aria-label={`Option ${optionIndex + 1} value ${valueIndex + 1} English`} placeholder="Value English" value={value.labelEn} onChange={(event) => setVariantOptions((current) => current.map((item, index) => index === optionIndex ? { ...item, values: item.values.map((entry, entryIndex) => entryIndex === valueIndex ? { ...entry, labelEn: event.target.value } : entry) } : item))} /><span className="self-center text-[11px] text-[var(--text-muted)]">Value {valueIndex + 1}</span></div>)}</div><Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => addVariantValue(optionIndex)}>Add value</Button></div>)}</div>}
            {variantRows.length > 0 && <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border)]"><table className="w-full min-w-[720px] text-left text-xs"><thead className="border-b border-[var(--border)] text-[var(--text-secondary)]"><tr><th className="p-2">Combination</th><th className="p-2">SKU</th><th className="p-2">Stock</th><th className="p-2">Saudi override</th><th className="p-2">Egypt override</th><th className="p-2">Active</th></tr></thead><tbody>{variantRows.map((row, rowIndex) => <tr key={row.id ?? rowIndex} className="border-b border-[var(--border-subtle)]"><td className="p-2 font-semibold">{row.optionValueIds.map((valueId) => variantOptions.flatMap((option) => option.values).find((value) => value.id === valueId)?.labelEn).filter(Boolean).join(" / ") || `Variant ${rowIndex + 1}`}</td><td className="p-2"><Input value={row.sku} onChange={(event) => setVariantRows((current) => current.map((item, index) => index === rowIndex ? { ...item, sku: event.target.value } : item))} /></td><td className="p-2"><Input type="number" min={0} value={row.stockQuantity} onChange={(event) => setVariantRows((current) => current.map((item, index) => index === rowIndex ? { ...item, stockQuantity: event.target.value } : item))} /></td><td className="p-2"><Input placeholder="Uses product price" value={row.saudiPrice} onChange={(event) => setVariantRows((current) => current.map((item, index) => index === rowIndex ? { ...item, saudiPrice: event.target.value } : item))} /></td><td className="p-2"><Input placeholder="Uses product price" value={row.egyptPrice} onChange={(event) => setVariantRows((current) => current.map((item, index) => index === rowIndex ? { ...item, egyptPrice: event.target.value } : item))} /></td><td className="p-2 text-center"><input type="checkbox" checked={row.active} onChange={(event) => setVariantRows((current) => current.map((item, index) => index === rowIndex ? { ...item, active: event.target.checked } : item))} aria-label={`Active ${rowIndex + 1}`} /></td></tr>)}</tbody></table></div>}
          </section>
          <section className="space-y-3 border-t border-[var(--border)] pt-4">
            <h3 className="text-sm font-bold">Inventory</h3>
            <label className="flex items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={form.trackInventory}
                onChange={(event) =>
                  updateField("trackInventory", event.target.checked)
                }
              />
              Track inventory
            </label>
            <label className="block max-w-xs text-xs font-semibold">
              Stock quantity
              <Input
                type="number"
                min={0}
                value={form.stockQuantity}
                onChange={(event) =>
                  updateField("stockQuantity", event.target.value)
                }
                disabled={!form.trackInventory}
              />
            </label>
          </section>
          <section className="space-y-3 border-t border-[var(--border)] pt-4">
            <h3 className="text-sm font-bold">Images</h3>
            <MediaUploader
              kind="products"
              multiple
              images={form.images}
              onChange={(images: MediaSelection[]) =>
                updateField("images", images)
              }
            />
          </section>
          <section className="space-y-3 border-t border-[var(--border)] pt-4">
            <h3 className="text-sm font-bold">Visibility</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold">
                Status
                <select
                  value={form.status}
                  onChange={(event) =>
                    updateField(
                      "status",
                      event.target.value as FormState["status"],
                    )
                  }
                  className="mt-1 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                >
                  <option>DRAFT</option>
                  <option>ACTIVE</option>
                  <option>ARCHIVED</option>
                </select>
              </label>
              <label className="flex items-center gap-2 pt-7 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(event) =>
                    updateField("isFeatured", event.target.checked)
                  }
                />
                Featured product
              </label>
            </div>
          </section>
          {error && (
            <p
              role="alert"
              className="rounded-md bg-[var(--destructive-subtle)] px-3 py-2 text-xs text-[var(--destructive)]"
            >
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
            <Button variant="outline" onClick={closeForm}>
              Cancel
            </Button>
            <Button
              isLoading={saving}
              onClick={() => void save()}
              disabled={!form.name.trim() || !form.saudiPrice || !form.egyptPrice}
            >
              Save Product
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={Boolean(stockProduct)}
        onClose={() => !stockSaving && setStockProduct(null)}
        title="Adjust stock"
        description={
          stockProduct
            ? `${stockProduct.name} currently has ${stockProduct.stockQuantity} units.`
            : undefined
        }
        maxWidth="sm"
      >
        <div className="space-y-4">
          <label className="block text-xs font-semibold">
            Action
            <select
              value={stockDirection}
              onChange={(event) =>
                setStockDirection(event.target.value as typeof stockDirection)
              }
              className="mt-1 h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
            >
              <option value="increase">Increase quantity</option>
              <option value="decrease">Decrease quantity</option>
            </select>
          </label>
          <label className="block text-xs font-semibold">
            Quantity
            <Input
              type="number"
              min={1}
              step={1}
              value={stockAmount}
              onChange={(event) => setStockAmount(event.target.value)}
            />
          </label>
          {stockError && (
            <p role="alert" className="text-xs text-[var(--destructive)]">
              {stockError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStockProduct(null)}>
              Cancel
            </Button>
            <Button isLoading={stockSaving} onClick={() => void saveStock()}>
              Save stock
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
