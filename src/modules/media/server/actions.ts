"use server";

import "server-only";

import { ValidationError } from "@/core/errors";
import { failure } from "@/core/result";
import { env } from "@/config/env";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { mediaKindSchema } from "../schema";
import { deleteMediaSchema } from "../schema";
import { getDetectedImageType } from "../domain/service";
import { createMediaService } from "./service";

export async function uploadMedia(input: FormData) {
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);

  const file = input.get("file");
  const kind = mediaKindSchema.safeParse(input.get("kind"));
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function" || !kind.success) {
    return failure(new ValidationError("Please select a valid image file."));
  }
  if (file.size > env.UPLOAD_MAX_BYTES) {
    return failure(new ValidationError("Images must be 5 MB or smaller."));
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = getDetectedImageType(bytes);
  if (!mimeType || (file.type && file.type !== mimeType)) {
    return failure(new ValidationError("Only valid JPEG, PNG, and WebP images are allowed."));
  }

  return createMediaService().upload(actor.data.user.id, {
    bytes,
    mimeType,
    kind: kind.data,
  });
}

export async function deleteMedia(input: unknown) {
  const parsed = deleteMediaSchema.safeParse(input);
  if (!parsed.success) return failure(new ValidationError("Please select a valid image."));
  const actor = await requireAuthenticatedUser();
  if (!actor.success) return failure(actor.error);
  return createMediaService().delete(actor.data.user.id, parsed.data.id);
}
