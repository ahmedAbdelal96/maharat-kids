import "server-only";

import { env } from "@/config/env";
import { AppError, ForbiddenError, ValidationError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import type { AuthorizationService } from "@/modules/identity/domain/services";
import type { UserId } from "@/modules/identity/types";
import {
  allowedMediaTypes,
  mediaPermissions,
  type AllowedMediaType,
} from "../constants";
import type { MediaRepository } from "../infrastructure/repository";
import type { MediaStorageProvider } from "../infrastructure/storage-provider";
import type { MediaAsset, MediaId, MediaUploadInput } from "../types";

function detectImageType(bytes: Uint8Array): AllowedMediaType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

function mapMediaError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error && error.message === "STORAGE_UNAVAILABLE") {
    return new ValidationError("Storage service is not configured.");
  }
  return new AppError("MEDIA_OPERATION_FAILED", "Media operation failed.", {
    cause: error,
  });
}

export class MediaService {
  constructor(
    private readonly repository: MediaRepository,
    private readonly storage: MediaStorageProvider,
    private readonly authorization: AuthorizationService,
  ) {}

  async upload(
    actorId: string,
    input: MediaUploadInput,
  ): Promise<Result<MediaAsset, AppError>> {
    const allowed = await this.authorization.requirePermission(
      actorId as UserId,
      mediaPermissions.upload,
    );
    if (!allowed.success) return failure(allowed.error);

    try {
      if (input.bytes.byteLength === 0 || input.bytes.byteLength > env.UPLOAD_MAX_BYTES) {
        return failure(new ValidationError("Images must be 5 MB or smaller."));
      }
      if (!(input.mimeType in allowedMediaTypes)) {
        return failure(new ValidationError("Only JPEG, PNG, and WebP images are allowed."));
      }

      const detected = detectImageType(input.bytes);
      if (detected !== input.mimeType) {
        return failure(new ValidationError("The uploaded file is not a valid supported image."));
      }

      const stored = await this.storage.upload({
        bytes: input.bytes,
        mimeType: input.mimeType as AllowedMediaType,
        kind: input.kind,
      });

      try {
        return success(
          await this.repository.create({
            url: stored.url,
            path: stored.path,
            filename: stored.filename,
            mimeType: input.mimeType,
            size: input.bytes.byteLength,
          }),
        );
      } catch (error) {
        await this.storage.delete(stored.path);
        throw error;
      }
    } catch (error) {
      return failure(mapMediaError(error));
    }
  }

  async delete(actorId: string, mediaId: string): Promise<Result<true, AppError>> {
    const allowed = await this.authorization.requirePermission(
      actorId as UserId,
      mediaPermissions.delete,
    );
    if (!allowed.success) return failure(allowed.error);

    try {
      const removed = await this.repository.deleteIfUnused(mediaId as MediaId);
      if (!removed) {
        return failure(
          new ForbiddenError("This image is still in use and cannot be deleted."),
        );
      }
      await this.storage.delete(removed.path);
      return success(true);
    } catch (error) {
      return failure(mapMediaError(error));
    }
  }

  async cleanupUnused(mediaIds: string[]): Promise<void> {
    for (const mediaId of mediaIds) {
      const removed = await this.repository.deleteIfUnused(mediaId as MediaId);
      if (removed) await this.storage.delete(removed.path);
    }
  }
}

export function getDetectedImageType(bytes: Uint8Array): AllowedMediaType | null {
  return detectImageType(bytes);
}
