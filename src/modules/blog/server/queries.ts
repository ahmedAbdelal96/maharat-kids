import "server-only";
import { BlogRepository } from "../infrastructure/repository";
import { failure } from "@/core/result";
import { requireAuthenticatedUser } from "@/modules/auth/server/queries";
import { AuthorizationService } from "@/modules/identity/domain/services";
import { PrismaPermissionRepository, PrismaUserRepository } from "@/modules/identity/infrastructure/repository";

const repo = () => new BlogRepository();
const auth = () => new AuthorizationService(new PrismaPermissionRepository(), new PrismaUserRepository());
export async function getPublicBlogPosts(categorySlug?: string, page = 1) { try { return { success: true as const, data: await repo().findPublicPosts(categorySlug, page) }; } catch (error) { return failure(new Error(error instanceof Error ? error.message : "BLOG_QUERY_FAILED")); } }
export async function getPublicBlogPost(slug: string) { try { return { success: true as const, data: await repo().findPublicBySlug(slug) }; } catch (error) { return failure(new Error(error instanceof Error ? error.message : "BLOG_QUERY_FAILED")); } }
export async function getPublicBlogCategories() { try { return { success: true as const, data: await repo().findCategories(true) }; } catch (error) { return failure(new Error(error instanceof Error ? error.message : "BLOG_QUERY_FAILED")); } }
export async function getAdminBlogPosts() { const actor = await requireAuthenticatedUser(); if (!actor.success) return failure(actor.error); const allowed = await auth().requirePermission(actor.data.user.id as never, "blog.view"); if (!allowed.success) return failure(allowed.error); return { success: true as const, data: await repo().findAdminPosts() }; }
export async function getAdminBlogCategories() { const actor = await requireAuthenticatedUser(); if (!actor.success) return failure(actor.error); const allowed = await auth().requirePermission(actor.data.user.id as never, "blog.categories"); if (!allowed.success) return failure(allowed.error); return { success: true as const, data: await repo().findCategories() }; }
