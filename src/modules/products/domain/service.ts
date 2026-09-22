import "server-only";

import { Prisma } from "@prisma/client";
import { generateUniqueSlug } from "@/lib/slug";
import { AppError, ForbiddenError, NotFoundError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import type { AuthorizationService } from "@/modules/identity/domain/services";
import type { UserId } from "@/modules/identity/types";
import type { AuditMutationContext } from "@/modules/audit/types";
import type { MediaService } from "@/modules/media/domain/service";
import { mediaPermissions } from "@/modules/media/constants";
import { normalizeSearchQuery } from "@/modules/search/domain/normalization";
import type {
  Product,
  ProductId,
  CreateProductInput,
  ProductPage,
  ProductQuery,
  UpdateProductInput,
} from "../types";
import type { ProductRepository } from "../infrastructure/repository";
import { domainRules } from "./rules";

function mapProductError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error && error.message === "SLUG_UNAVAILABLE") {
    return new AppError(
      "PRODUCT_SLUG_UNAVAILABLE",
      "A unique product URL could not be generated.",
    );
  }
  if (error instanceof Error && error.message === "SKU_UNAVAILABLE") {
    return new AppError("PRODUCT_SKU_UNAVAILABLE", "A unique SKU could not be generated.");
  }
  if (error instanceof Error && error.message === "STOCK_INVALID") {
    return new AppError("PRODUCT_STOCK_INVALID", "Stock quantity must be a whole number.");
  }
  if (error instanceof Error && error.message === "PRICE_INVALID") {
    return new AppError("PRODUCT_PRICE_INVALID", "Price must be zero or greater.");
  }
  if (error instanceof Error && error.message === "COMPARE_PRICE_INVALID") {
    return new AppError("PRODUCT_COMPARE_PRICE_INVALID", "Compare-at price must be greater than price.");
  }
  if (error instanceof Error && error.message === "AGE_RANGE_INVALID") {
    return new AppError("PRODUCT_AGE_RANGE_INVALID", "Maximum age must be greater than or equal to minimum age.");
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : String(error.meta?.target ?? "");
    if (target.includes("sku")) {
      return new AppError(
        "PRODUCT_SKU_CONFLICT",
        "This SKU is already assigned to another product.",
      );
    }
    return new AppError(
      "PRODUCT_SLUG_CONFLICT",
      "This product could not receive a unique URL. Please try a different name.",
    );
  }
  return new AppError("PRODUCT_OPERATION_FAILED", "Product operation failed.", {
    cause: error,
  });
}

export class ProductService {
  constructor(
    private readonly repository: ProductRepository,
    private readonly authorization: AuthorizationService,
    private readonly media?: MediaService,
  ) {}

  async findPublic(
    input: ProductQuery,
  ): Promise<Result<ProductPage, AppError>> {
    try {
      const normalizedInput = input.search === undefined
        ? input
        : { ...input, search: normalizeSearchQuery(input.search) };
      return success(await this.repository.findPublic(normalizedInput));
    } catch (error) {
      return failure(
        new AppError("PRODUCT_QUERY_FAILED", "Products are unavailable.", {
          cause: error,
        }),
      );
    }
  }

  async findPublicBySlug(
    slug: string,
  ): Promise<Result<Product | null, AppError>> {
    try {
      return success(await this.repository.findBySlug(slug, true));
    } catch (error) {
      return failure(
        new AppError("PRODUCT_QUERY_FAILED", "Product is unavailable.", {
          cause: error,
        }),
      );
    }
  }

  async findAdmin(
    actorId: string,
    input: ProductQuery,
  ): Promise<Result<ProductPage, AppError>> {
    const allowed = await this.authorization.requirePermission(
      actorId as UserId,
      "products.view",
    );
    if (!allowed.success) return failure(allowed.error);

    try {
      return success(await this.repository.findAdmin(input));
    } catch (error) {
      return failure(
        new AppError("PRODUCT_QUERY_FAILED", "Products are unavailable.", {
          cause: error,
        }),
      );
    }
  }

  private async prepare(input: CreateProductInput) {
    domainRules.validatePricing(input);
    if (input.minAgeMonths != null && input.maxAgeMonths != null && input.minAgeMonths > input.maxAgeMonths) throw new Error("AGE_RANGE_INVALID");
    if (
      input.trackInventory &&
      !Number.isInteger(input.stockQuantity ?? 0)
    ) {
      throw new Error("STOCK_INVALID");
    }
    const categoryIds = [...new Set([...(input.categoryIds ?? []), ...(input.categoryId ? [input.categoryId] : []), ...(input.primaryCategoryId ? [input.primaryCategoryId] : [])])];
    for (const categoryId of categoryIds) if (!(await this.repository.categoryExists(categoryId))) throw new NotFoundError("CATEGORY", "Selected category does not exist.");

    return {
      ...input,
      name: input.name.trim(),
      sku: await this.generateSku(input.sku),
      stockQuantity: input.stockQuantity ?? 0,
    };
  }

  private async generateSku(input?: string | null): Promise<string> {
    const manual = domainRules.normalizeSku(input);
    if (manual) return manual;
    const highest = await this.repository.getHighestGeneratedSkuNumber();
    for (let offset = 1; offset <= 1000; offset += 1) {
      const candidate = `PRODUCT-${String(highest + offset).padStart(6, "0")}`;
      if (!(await this.repository.skuExists(candidate))) return candidate;
    }
    throw new Error("SKU_UNAVAILABLE");
  }

  async create(
    actorId: string,
    input: CreateProductInput,
  ): Promise<Result<Product, AppError>> {
    const allowed = await this.authorization.requirePermission(
      actorId as UserId,
      "products.create",
    );
    if (!allowed.success) return failure(allowed.error);

    try {
      const prepared = await this.prepare(input);
      const slug = await generateUniqueSlug(prepared.name, (candidate) =>
        this.repository.slugExists(candidate),
      );
      const created = await this.repository.create({ ...prepared, slug });
      return success(input.fulfillmentType ? await this.repository.setFulfillmentType(created.id as ProductId, input.fulfillmentType) : created);
    } catch (error) {
      return failure(mapProductError(error));
    }
  }

  async update(
    actorId: string,
    input: UpdateProductInput,
  ): Promise<Result<Product, AppError>> {
    const allowed = await this.authorization.requirePermission(
      actorId as UserId,
      "products.update",
    );
    if (!allowed.success) return failure(allowed.error);

    try {
      const current = await this.repository.findById(input.id as ProductId);
      if (!current) {
        return failure(new NotFoundError("PRODUCT", "Product does not exist."));
      }
      const prepared = await this.prepare(input);
      const previousMediaIds = current.images
        .map((image) => image.mediaId)
        .filter((mediaId): mediaId is string => Boolean(mediaId));
      const nextMediaIds = new Set(
        (input.images ?? []).map((image) => image.mediaId),
      );
      const removedMediaIds = previousMediaIds.filter(
        (mediaId) => !nextMediaIds.has(mediaId),
      );
      if (removedMediaIds.length > 0) {
        const mediaAllowed = await this.authorization.requirePermission(
          actorId as UserId,
          mediaPermissions.delete,
        );
        if (!mediaAllowed.success) return failure(mediaAllowed.error);
      }
      let updated = await this.repository.update({
          ...prepared,
          id: input.id,
          slug: current.slug,
        });
      if (input.fulfillmentType && input.fulfillmentType !== updated.fulfillmentType) {
        updated = await this.repository.setFulfillmentType(input.id as ProductId, input.fulfillmentType);
      }
      if (removedMediaIds.length > 0) {
        await this.media?.cleanupUnused(removedMediaIds);
      }
      return success(updated);
    } catch (error) {
      return failure(mapProductError(error));
    }
  }

  async setStatus(
    actorId: string,
    id: string,
    status: "ACTIVE" | "ARCHIVED",
  ): Promise<Result<Product, AppError>> {
    const allowed = await this.authorization.requirePermission(
      actorId as UserId,
      "products.archive",
    );
    if (!allowed.success) return failure(allowed.error);

    try {
      return success(await this.repository.setStatus(id as ProductId, status));
    } catch (error) {
      return failure(
        new AppError(
          "PRODUCT_OPERATION_FAILED",
          "Product status could not be updated.",
          { cause: error },
        ),
      );
    }
  }

  async remove(
    actorId: string,
    id: string,
  ): Promise<Result<{ id: string; name: string }, AppError>> {
    const allowed = await this.authorization.requirePermission(
      actorId as UserId,
      "products.delete",
    );
    if (!allowed.success) return failure(allowed.error);

    try {
      const product = await this.repository.findById(id as ProductId);
      if (!product) {
        return failure(new NotFoundError("PRODUCT", "Product does not exist."));
      }
      if (await this.repository.hasOrderHistory(id as ProductId)) {
        return failure(
          new ForbiddenError(
            "Products with order history cannot be deleted. Archive them instead.",
          ),
        );
      }
      const mediaIds = product.images
        .map((image) => image.mediaId)
        .filter((mediaId): mediaId is string => Boolean(mediaId));
      if (mediaIds.length > 0) {
        const mediaAllowed = await this.authorization.requirePermission(
          actorId as UserId,
          mediaPermissions.delete,
        );
        if (!mediaAllowed.success) return failure(mediaAllowed.error);
      }
      await this.repository.delete(id as ProductId);
      await this.media?.cleanupUnused(mediaIds);
      return success({ id: product.id, name: product.name });
    } catch (error) {
      return failure(
        new AppError("PRODUCT_OPERATION_FAILED", "Product could not be deleted.", {
          cause: error,
        }),
      );
    }
  }

  async duplicate(actorId: string, id: string): Promise<Result<Product, AppError>> {
    const allowed = await this.authorization.requirePermission(actorId as UserId, "products.create");
    if (!allowed.success) return failure(allowed.error);

    try {
      const current = await this.repository.findById(id as ProductId);
      if (!current) return failure(new NotFoundError("PRODUCT", "Product does not exist."));
      const input: CreateProductInput = {
        name: `${current.name} Copy`,
        shortDescription: current.shortDescription,
        description: current.description,
        sku: null,
        price: current.price,
        compareAtPrice: current.compareAtPrice,
        marketPrices: current.marketPrices,
        status: "DRAFT",
        isFeatured: false,
        categoryId: current.categoryId,
        trackInventory: current.trackInventory,
        stockQuantity: current.stockQuantity,
        images: current.images.filter((image): image is typeof image & { mediaId: string } => Boolean(image.mediaId)).map((image, index) => ({ mediaId: image.mediaId, altText: image.altText, sortOrder: index, isPrimary: index === 0 })),
      };
      const prepared = await this.prepare(input);
      const slug = await generateUniqueSlug(prepared.name, (candidate) => this.repository.slugExists(candidate));
      return success(await this.repository.create({ ...prepared, slug }));
    } catch (error) {
      return failure(mapProductError(error));
    }
  }

  async adjustStock(actorId: string, id: string, quantityDelta: number, audit?: AuditMutationContext): Promise<Result<Product, AppError>> {
    const allowed = await this.authorization.requirePermission(actorId as UserId, "inventory.update");
    if (!allowed.success) return failure(allowed.error);
    try {
      return success(await this.repository.adjustStock(id as ProductId, quantityDelta, audit));
    } catch (error) {
      if (error instanceof Error && error.message === "STOCK_NEGATIVE") return failure(new ForbiddenError("Stock quantity cannot become negative."));
      return failure(new AppError("PRODUCT_STOCK_UPDATE_FAILED", "Stock could not be updated.", { cause: error }));
    }
  }
}
