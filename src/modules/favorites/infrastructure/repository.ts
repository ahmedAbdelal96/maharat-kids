import "server-only";

import { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "@/database/prisma";
import type { Favorite } from "../types";
import type { FavoriteProductInput } from "../schema";

function toFavorite(record: { id: string; userId: string; productId: string; createdAt: Date }): Favorite {
  return {
    id: record.id,
    userId: record.userId,
    productId: record.productId as Favorite["productId"],
    createdAt: record.createdAt.toISOString(),
  };
}

export interface FavoriteRepository {
  add(userId: string, input: FavoriteProductInput): Promise<Favorite>;
  remove(userId: string, productId: string): Promise<boolean>;
  findByUser(userId: string): Promise<Favorite[]>;
  findProductIds(userId: string): Promise<string[]>;
}

export class PrismaFavoriteRepository implements FavoriteRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async add(userId: string, input: FavoriteProductInput): Promise<Favorite> {
    const record = await this.db.favorite.upsert({
      where: { userId_productId: { userId, productId: input.productId } },
      update: {},
      create: { userId, productId: input.productId },
    });
    return toFavorite(record);
  }

  async remove(userId: string, productId: string): Promise<boolean> {
    const result = await this.db.favorite.deleteMany({ where: { userId, productId } });
    return result.count > 0;
  }

  async findByUser(userId: string): Promise<Favorite[]> {
    const records = await this.db.favorite.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    return records.map(toFavorite);
  }

  async findProductIds(userId: string): Promise<string[]> {
    const records = await this.db.favorite.findMany({ where: { userId }, select: { productId: true } });
    return records.map((record) => record.productId);
  }
}
