import type { Request } from "express";
import type { z } from "zod";
import { AppError } from "../errors/app-error.js";

export function validateBody<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): z.infer<TSchema> {
  const result = schema.safeParse(request.body);

  if (!result.success) {
    throw new AppError(result.error.issues[0]?.message ?? "Invalid request body", 422);
  }

  return result.data;
}
