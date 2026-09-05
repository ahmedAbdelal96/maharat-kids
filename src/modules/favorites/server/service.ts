import "server-only";

import { FavoritesService } from "../domain/service";
import { PrismaFavoriteRepository } from "../infrastructure/repository";
import { PrismaProductRepository } from "@/modules/products/infrastructure/repository";

export function createFavoritesService(): FavoritesService {
  return new FavoritesService(new PrismaFavoriteRepository(), new PrismaProductRepository());
}
