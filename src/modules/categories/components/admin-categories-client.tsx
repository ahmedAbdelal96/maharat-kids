"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { deleteMedia } from "@/modules/media/server/actions";
import { MediaUploader, type MediaSelection } from "@/modules/media/components/media-uploader";
import { createCategory, deleteCategory, updateCategory } from "../server/actions";
import type { Category } from "../types";

type FormState = {
  id?: string;
  originalImageMediaId?: string | null;
  originalImageUrl?: string;
  name: string;
  parentId: string;
  description: string;
  imageMediaId: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: string;
};

type FlatCategory = {
  category: Category;
  depth: number;
  path: string;
};

const emptyForm: FormState = {
  name: "",
  parentId: "",
  description: "",
  imageMediaId: "",
  imageUrl: "",
  isActive: true,
  sortOrder: "0",
};

function flatten(
  categories: Category[],
  parentId: string | null = null,
  depth = 0,
  parentPath = "",
): FlatCategory[] {
  return categories
    .filter((category) => category.parentId === parentId)
    .flatMap((category) => {
      const path = parentPath ? parentPath + " > " + category.name : category.name;
      return [
        { category, depth, path },
        ...flatten(categories, category.id, depth + 1, path),
      ];
    });
}

function isDescendant(
  categories: Category[],
  candidateId: string,
  ancestorId: string,
): boolean {
  let current = categories.find((category) => category.id === candidateId);

  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    current = categories.find((category) => category.id === current?.parentId);
  }

  return false;
}

export function AdminCategoriesClient({
  initialCategories,
}: {
  initialCategories: Category[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const rows = useMemo(() => flatten(categories), [categories]);
  const visibleRows = useMemo(() => {
    function isHidden(category: Category) {
      let parentId = category.parentId;

      while (parentId) {
        if (collapsedIds.has(parentId)) return true;
        parentId = categories.find((item) => item.id === parentId)?.parentId ?? null;
      }

      return false;
    }

    return rows.filter(({ category }) => !isHidden(category));
  }, [categories, collapsedIds, rows]);
  const parentOptions = rows.filter(
    ({ category }) =>
      !form.id ||
      (category.id !== form.id &&
        !isDescendant(categories, category.id, form.id)),
  );

  function startCreate(parentId = "") {
    setForm({ ...emptyForm, parentId });
    setError("");
    setOpen(true);
  }

  function startEdit(category: Category) {
    setForm({
      id: category.id,
      originalImageMediaId: category.imageMediaId,
      originalImageUrl: category.imageUrl ?? "",
      name: category.name,
      parentId: category.parentId ?? "",
      description: category.description ?? "",
      imageMediaId: category.imageMediaId ?? "",
      imageUrl: category.imageUrl ?? "",
      isActive: category.isActive,
      sortOrder: String(category.sortOrder),
    });
    setError("");
    setOpen(true);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function closeForm() {
    if (
      form.imageMediaId &&
      form.imageMediaId !== form.originalImageMediaId
    ) {
      void deleteMedia({ id: form.imageMediaId });
    }
    setOpen(false);
  }

  async function cleanupPendingMedia() {
    const original = form.originalImageMediaId;
    if (!form.imageMediaId || form.imageMediaId === original) return;
    await deleteMedia({ id: form.imageMediaId });
    setForm((current) => ({
      ...current,
      imageMediaId: original ?? "",
      imageUrl: current.originalImageUrl ?? "",
    }));
  }

  function toggleCollapsed(categoryId: string) {
    setCollapsedIds((current) => {
      const next = new Set(current);

      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);

      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError("");

    const input = {
      ...form,
      parentId: form.parentId || null,
      description: form.description || null,
      imageMediaId: form.imageMediaId || null,
      sortOrder: Number(form.sortOrder) || 0,
    };
    const result = form.id
      ? await updateCategory({ ...input, id: form.id })
      : await createCategory(input);

    if (!result.success) {
      setError(result.error.message);
      await cleanupPendingMedia();
    } else {
      setCategories((current) =>
        form.id
          ? current.map((item) =>
              item.id === result.data.id ? result.data : item,
            )
          : [...current, result.data],
      );
      setOpen(false);
    }

    setSaving(false);
  }

  async function toggleActive(category: Category) {
    setError("");
    const result = await updateCategory({
      id: category.id,
      name: category.name,
      parentId: category.parentId,
      description: category.description,
      imageMediaId: category.imageMediaId,
      isActive: !category.isActive,
      sortOrder: category.sortOrder,
    });

    if (!result.success) {
      setError(result.error.message);
    } else {
      setCategories((current) =>
        current.map((item) => (item.id === result.data.id ? result.data : item)),
      );
    }
  }

  async function remove(category: Category) {
    if (!window.confirm("Delete " + category.name + "?")) return;
    const result = await deleteCategory({ id: category.id });

    if (!result.success) {
      setError(result.error.message);
    } else {
      setCategories((current) =>
        current.filter((item) => item.id !== category.id),
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Catalog
          </p>
          <h1 className="mt-1 text-2xl font-bold">
            Categories ({categories.length})
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Manage root categories and subcategories in one visual tree.
          </p>
        </div>
        <Button
          size="sm"
          aria-label="Add Category"
          onClick={() => startCreate()}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-[var(--destructive-subtle)] px-3 py-2 text-xs text-[var(--destructive)]"
        >
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-card)]">
        <div className="grid grid-cols-[minmax(0,1fr)_80px_minmax(240px,auto)] gap-3 border-b border-[var(--border)] px-5 py-3 text-xs font-semibold text-[var(--text-secondary)]">
          <span>Category tree</span>
          <span>Products</span>
          <span className="text-right">Actions</span>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-[var(--text-secondary)]">
            No categories yet. Add your first root category to start the catalog
            tree.
          </div>
        ) : (
          visibleRows.map(({ category, depth }) => (
            <div
              key={category.id}
              className="grid grid-cols-[minmax(0,1fr)_80px_minmax(240px,auto)] items-center gap-3 border-b border-[var(--border-subtle)] px-5 py-3 last:border-0"
            >
              <div style={{ paddingInlineStart: depth * 24 }}>
                <div className="flex items-center gap-2">
                  {categories.some((item) => item.parentId === category.id) ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      aria-label={
                        collapsedIds.has(category.id)
                          ? "Expand " + category.name
                          : "Collapse " + category.name
                      }
                      aria-expanded={!collapsedIds.has(category.id)}
                      onClick={() => toggleCollapsed(category.id)}
                      title={
                        collapsedIds.has(category.id)
                          ? "Expand subcategories"
                          : "Collapse subcategories"
                      }
                    >
                      {collapsedIds.has(category.id) ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  ) : (
                    <span aria-hidden="true" className="h-7 w-7 shrink-0" />
                  )}
                  <span aria-hidden="true" className="text-[var(--text-muted)]">
                    {depth > 0 ? "└─" : ""}
                  </span>
                  <span className="font-semibold">{category.name}</span>
                  <Badge
                    variant={category.isActive ? "success" : "secondary"}
                    size="sm"
                  >
                    {category.isActive ? "Active" : "Disabled"}
                  </Badge>
                  {category.childCount > 0 && (
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {category.childCount} {category.childCount === 1 ? "child" : "children"}
                    </span>
                  )}
                </div>
              </div>

              <span className="text-xs text-[var(--text-secondary)]">
                {category.productCount}
              </span>

              <div className="flex flex-wrap justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 px-2"
                  aria-label={"Add Subcategory to " + category.name}
                  onClick={() => startCreate(category.id)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Subcategory</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 px-2"
                  aria-label={"Edit " + category.name}
                  onClick={() => startEdit(category)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2"
                  aria-label={
                    category.isActive
                      ? "Disable " + category.name
                      : "Enable " + category.name
                  }
                  onClick={() => void toggleActive(category)}
                >
                  {category.isActive ? "Disable" : "Enable"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={"Delete " + category.name}
                  onClick={() => void remove(category)}
                >
                  <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={open}
        onClose={() => !saving && closeForm()}
        title={form.id ? "Edit category" : "Create category"}
        description="Keep the category structure clear for customers."
        maxWidth="lg"
      >
        <div className="space-y-4">
          <label className="block text-xs font-semibold">
            Name
            <Input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Electronics"
            />
          </label>
          <label className="block text-xs font-semibold">
            Parent Category
            <select
              aria-label="Parent Category"
              value={form.parentId}
              onChange={(event) => updateField("parentId", event.target.value)}
              className="mt-1 h-10 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
            >
              <option value="">None (root category)</option>
              {parentOptions.map(({ category, path }) => (
                <option key={category.id} value={category.id}>
                  {path}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold">
            Description
            <textarea
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              className="mt-1 min-h-24 w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
            />
          </label>
          <div className="space-y-2 text-xs font-semibold">
            <span>Category Image</span>
            {form.imageUrl && !form.imageMediaId && (
              <Image src={form.imageUrl} alt="Existing category" width={96} height={96} className="h-24 w-24 rounded-md object-cover" />
            )}
            <MediaUploader
              kind="categories"
              images={form.imageMediaId ? [{ mediaId: form.imageMediaId, url: form.imageUrl, sortOrder: 0, isPrimary: true }] : []}
              onChange={(images: MediaSelection[]) => {
                setForm((current) => ({
                  ...current,
                  imageMediaId: images[0]?.mediaId ?? "",
                  imageUrl: images[0]?.url ?? "",
                }));
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  updateField("isActive", event.target.checked)
                }
              />
              Active
            </label>
            <label className="block text-xs font-semibold">
              Sort order
              <Input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(event) =>
                  updateField("sortOrder", event.target.value)
                }
              />
            </label>
          </div>
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
              disabled={!form.name.trim()}
            >
              {form.id ? "Save Changes" : "Create Category"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
