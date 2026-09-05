import { z } from "zod";
import { mediaKinds } from "./constants";

export const mediaIdSchema = z.string().trim().min(1);
export const mediaKindSchema = z.enum(mediaKinds);

export const deleteMediaSchema = z.object({
  id: mediaIdSchema,
});
