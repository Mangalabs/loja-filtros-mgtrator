import type { Request } from "express";
import type { z } from "zod";
import { AppError } from "../errors/app-error.js";

export function validateBody<TSchema extends z.ZodType>(
  request: Request,
  schema: TSchema,
): z.infer<TSchema> {
  const result = schema.safeParse(request.body);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join(".") || undefined,
      message: issue.message,
    }));

    throw new AppError("Dados invalidos.", 422, details);
  }

  return result.data;
}
