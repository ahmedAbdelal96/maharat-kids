import "server-only";

import { Prisma, PrismaClient, type StoreSetting as PrismaStoreSetting } from "@prisma/client";

import { getPrismaClient } from "@/database/prisma";

import type { JsonValue, StoreSetting } from "../types";

export interface StoreSettingRepository {
  findByKey(key: string): Promise<StoreSetting | null>;
  findAll(): Promise<StoreSetting[]>;
  update(key: string, value: JsonValue): Promise<StoreSetting>;
  bulkUpdate(input: Array<{ key: string; value: JsonValue }>): Promise<StoreSetting[]>;
}

function toSetting(record: PrismaStoreSetting): StoreSetting {
  return {
    ...record,
    value: record.value as JsonValue,
  };
}

function toJsonInput(value: JsonValue): Prisma.InputJsonValue | Prisma.NullTypes.JsonNull {
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

export class PrismaStoreSettingRepository implements StoreSettingRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findByKey(key: string): Promise<StoreSetting | null> {
    const record = await this.db.storeSetting.findUnique({ where: { key } });
    return record ? toSetting(record) : null;
  }

  async findAll(): Promise<StoreSetting[]> {
    const records = await this.db.storeSetting.findMany({ orderBy: { key: "asc" } });
    return records.map(toSetting);
  }

  async update(key: string, value: JsonValue): Promise<StoreSetting> {
    const record = await this.db.storeSetting.update({
      where: { key },
      data: { value: toJsonInput(value) },
    });

    return toSetting(record);
  }

  async bulkUpdate(input: Array<{ key: string; value: JsonValue }>): Promise<StoreSetting[]> {
    const records = await this.db.$transaction(
      input.map(({ key, value }) =>
        this.db.storeSetting.update({
          where: { key },
          data: { value: toJsonInput(value) },
        }),
      ),
    );

    return records.map(toSetting);
  }
}
