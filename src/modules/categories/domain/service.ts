import "server-only";

import { Prisma } from "@prisma/client";
import { generateUniqueSlug } from "@/lib/slug";
import { AppError, ForbiddenError, NotFoundError } from "@/core/errors";
import { failure, success, type Result } from "@/core/result";
import type { AuthorizationService } from "@/modules/identity/domain/services";
import type { UserId } from "@/modules/identity/types";
import type { MediaService } from "@/modules/media/domain/service";
import { mediaPermissions } from "@/modules/media/constants";
import type { CategoryRepository } from "../infrastructure/repository";
import type {
  Category,
  CategoryId,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../types";

function mapCategoryError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error && error.message === "SLUG_UNAVAILABLE") {
    return new AppError(
      "CATEGORY_SLUG_UNAVAILABLE",
      "A unique category URL could not be generated.",
    );
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return new AppError(
      "CATEGORY_SLUG_CONFLICT",
      "This category could not receive a unique URL. Please try a different name.",
    );
  }
  return new AppError("CATEGORY_OPERATION_FAILED", "Category operation failed.", {
    cause: error,
  });
}

export class CategoryService {
  constructor(
    private readonly repository: CategoryRepository,
    private readonly authorization: AuthorizationService,
    private readonly media?: MediaService,
  ) {}

  async findPublicCategories(): Promise<Result<Category[], AppError>> {
    try {
      return success(await this.repository.findAll(true));
    } catch (error) {
      return failure(
        new AppError("CATEGORY_QUERY_FAILED", "Categories are unavailable.", {
          cause: error,
        }),
      );
    }
  }

  async findPublicCategory(
    slug: string,
  ): Promise<Result<Category | null, AppError>> {
    try {
      return success(await this.repository.findBySlug(slug, true));
    } catch (error) {
      return failure(
        new AppError("CATEGORY_QUERY_FAILED", "Category is unavailable.", {
          cause: error,
        }),
      );
    }
  }

  async findAdminCategories(
    actorId: string,
  ): Promise<Result<Category[], AppError>> {
    const allowed = await this.authorization.requirePermission(
      actorId as UserId,
      "categories.view",
    );
    if (!allowed.success) return failure(allowed.error);

    try {
      return success(await this.repository.findAll(false));
    } catch (error) {
      return failure(
        new AppError("CATEGORY_QUERY_FAILED", "Categories are unavailable.", {
          cause: error,
        }),
      );
    }
  }

  private async validateParent(
    parentId: string | null | undefined,
    categoryId?: string,
  ) {
    if (!parentId) return;
    const parent = await this.repository.findById(parentId as CategoryId);
    if (!parent) {
      throw new NotFoundError("CATEGORY", "Parent category does not exist.");
    }
    if (
      categoryId &&
      (parentId === categoryId ||
        (await this.repository.parentChainContains(
          parentId as CategoryId,
          categoryId as CategoryId,
        )))
    ) {
      throw new ForbiddenError("A category cannot become its own ancestor.");
    }
  }

  private async generateSlug(name: string) {
    return generateUniqueSlug(name, (candidate) =>
      this.repository.slugExists(candidate),
    );
  }

  async create(
    actorId: string,
    input: CreateCategoryInput,
  ): Promise<Result<Category, AppError>> {
    const allowed = await this.authorization.requirePermission(
      actorId as UserId,
      "categories.create",
    );
    if (!allowed.success) return failure(allowed.error);

    try {
      const name = input.name.trim();
      await this.validateParent(input.parentId);
      const slug = await this.generateSlug(name);
      return success(
        await this.repository.create({ ...input, name, slug }),
      );
    } catch (error) {
      return failure(mapCategoryError(error));
    }
  }

  async update(
    actorId: string,
    input: UpdateCategoryInput,
  ): Promise<Result<Category, AppError>> {
    const allowed = await this.authorization.requirePermission(
      actorId as UserId,
      "categories.update",
    );
    if (!allowed.success) return failure(allowed.error);

    try {
      const current = await this.repository.findById(input.id as CategoryId);
      if (!current) {
        return failure(new NotFoundError("CATEGORY", "Category does not exist."));
      }
      await this.validateParent(input.parentId, input.id);
      const imageMediaId = input.imageMediaId ?? null;

      if (current.imageMediaId && current.imageMediaId !== imageMediaId) {
        const mediaAllowed = await this.authorization.requirePermission(
          actorId as UserId,
          mediaPermissions.delete,
        );
        if (!mediaAllowed.success) return failure(mediaAllowed.error);
      }

      const requestedSlug = input.slug?.trim();
      const slug = requestedSlug && requestedSlug !== current.slug
        ? await generateUniqueSlug(requestedSlug, (candidate) => this.repository.slugExists(candidate))
        : current.slug;
      const updated = await this.repository.update({
          ...input,
          name: input.name.trim(),
          imageMediaId,
          slug,
        });
      if (current.imageMediaId && current.imageMediaId !== imageMediaId) {
        await this.media?.cleanupUnused([current.imageMediaId]);
      }
      return success(updated);
    } catch (error) {
      return failure(mapCategoryError(error));
    }
  }

  async remove(
    actorId: string,
    id: string,
  ): Promise<Result<{ id: string; name: string }, AppError>> {
    const allowed = await this.authorization.requirePermission(
      actorId as UserId,
      "categories.update",
    );
    if (!allowed.success) return failure(allowed.error);

    try {
      const current = await this.repository.findById(id as CategoryId);
      if (!current) {
        return failure(new NotFoundError("CATEGORY", "Category does not exist."));
      }
      if (await this.repository.hasChildrenOrProducts(id as CategoryId)) {
        return failure(
          new ForbiddenError(
            "Categories with children or products cannot be deleted. Disable the category instead.",
          ),
        );
      }
      if (current.imageMediaId) {
        const mediaAllowed = await this.authorization.requirePermission(
          actorId as UserId,
          mediaPermissions.delete,
        );
        if (!mediaAllowed.success) return failure(mediaAllowed.error);
      }
      await this.repository.delete(id as CategoryId);
      if (current.imageMediaId) {
        await this.media?.cleanupUnused([current.imageMediaId]);
      }
      return success({ id: current.id, name: current.name });
    } catch (error) {
      return failure(mapCategoryError(error));
    }
  }
}
