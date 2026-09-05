"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteMedia, uploadMedia } from "../server/actions";
import type { MediaKind } from "../constants";

export type MediaSelection = {
  mediaId: string;
  url: string;
  altText?: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export function MediaUploader({
  kind,
  images,
  multiple = false,
  onChange,
}: {
  kind: MediaKind;
  images: MediaSelection[];
  multiple?: boolean;
  onChange: (images: MediaSelection[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    const selected = multiple ? Array.from(files) : [files[0]];
    const next = [...images];

    for (const file of selected) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);
      const result = await uploadMedia(formData);

      if (!result.success) {
        setError(result.error.message);
        continue;
      }

      next.push({
        mediaId: result.data.id,
        url: result.data.url,
        sortOrder: next.length,
        isPrimary: next.length === 0,
      });
    }

    onChange(next.map((image, index) => ({ ...image, sortOrder: index })));
    setUploading(false);
  }

  async function remove(index: number) {
    if (!window.confirm("Delete this image permanently?")) return;

    setError("");
    const image = images[index];
    const result = await deleteMedia({ id: image.mediaId });
    const next = images.filter((_, imageIndex) => imageIndex !== index);
    onChange(
      next.map((item, itemIndex) => ({
        ...item,
        sortOrder: itemIndex,
        isPrimary: itemIndex === 0 ? true : item.isPrimary,
      })),
    );
    if (
      !result.success &&
      result.error.message !== "This image is still in use and cannot be deleted."
    ) {
      setError(result.error.message);
    }
  }

  function setPrimary(index: number) {
    onChange(images.map((image, imageIndex) => ({ ...image, isPrimary: index === imageIndex })));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((image, imageIndex) => ({ ...image, sortOrder: imageIndex })));
  }

  return (
    <div className="space-y-3">
      <label className="relative inline-flex cursor-pointer items-center gap-2 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-xs font-semibold hover:bg-[var(--surface-muted)]">
        <ImagePlus className="h-4 w-4" />
        {uploading ? "Uploading..." : multiple ? "Choose Images" : "Upload Image"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple={multiple}
          disabled={uploading}
          onChange={(event) => {
            void uploadFiles(event.target.files);
            event.currentTarget.value = "";
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image, index) => (
            <div key={image.mediaId} className="space-y-2 rounded-md border border-[var(--border)] p-2">
              <Image src={image.url} alt={image.altText ?? "Uploaded image"} width={160} height={120} className="h-24 w-full rounded object-cover" />
              <div className="flex items-center justify-between gap-1">
                <button type="button" className="text-[11px] font-semibold text-[var(--primary)]" onClick={() => setPrimary(index)}>
                  {image.isPrimary ? "Primary" : "Set primary"}
                </button>
                <button type="button" aria-label="Remove image" className="text-[var(--destructive)]" onClick={() => void remove(index)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {multiple && (
                <div className="flex justify-end gap-1">
                  <button type="button" aria-label="Move image up" disabled={index === 0} onClick={() => move(index, -1)} className="rounded p-1 hover:bg-[var(--surface-muted)] disabled:opacity-40">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" aria-label="Move image down" disabled={index === images.length - 1} onClick={() => move(index, 1)} className="rounded p-1 hover:bg-[var(--surface-muted)] disabled:opacity-40">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <p role="alert" className="text-xs text-[var(--destructive)]">{error}</p>}
    </div>
  );
}
