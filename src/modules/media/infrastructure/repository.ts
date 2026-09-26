import "server-only";

import { PrismaClient, type Media as PrismaMedia } from "@prisma/client";
import { getPrismaClient } from "@/database/prisma";
import type { MediaAsset, MediaId } from "../types";
import { resolvePublicMediaUrl } from "../domain/public-url";

function toMedia(record: PrismaMedia): MediaAsset {
  return {
    id: record.id as MediaId,
    url: resolvePublicMediaUrl(record.url),
    filename: record.filename,
    mimeType: record.mimeType,
    size: record.size,
    width: record.width,
    height: record.height,
    createdAt: record.createdAt.toISOString(),
  };
}

export type MediaRecordForDeletion = MediaAsset & { path: string };

export interface MediaRepository {
  create(input: {
    url: string;
    path: string;
    filename: string;
    mimeType: string;
    size: number;
  }): Promise<MediaAsset>;
  findById(id: MediaId): Promise<MediaRecordForDeletion | null>;
  deleteIfUnused(id: MediaId): Promise<MediaRecordForDeletion | null>;
}

export class PrismaMediaRepository implements MediaRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async create(input: {
    url: string;
    path: string;
    filename: string;
    mimeType: string;
    size: number;
  }) {
    return toMedia(await this.db.media.create({ data: input }));
  }

  async findById(id: MediaId) {
    const record = await this.db.media.findUnique({ where: { id } });
    return record ? { ...toMedia(record), path: record.path } : null;
  }

  async deleteIfUnused(id: MediaId) {
    const record = await this.db.media.findUnique({
      where: { id },
      include: {
        _count: { select: { productImages: true, categoryImages: true } },
      },
    });

    if (!record || record._count.productImages > 0 || record._count.categoryImages > 0) {
      return null;
    }

    await this.db.media.delete({ where: { id } });
    return { ...toMedia(record), path: record.path };
  }
}
