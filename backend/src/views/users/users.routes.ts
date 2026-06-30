import { Router } from "express";
import { z } from "zod";
import { storeUser } from "../../controllers/users/users.controller.js";
import { requireAdmin } from "../../shared/auth/authorization-middleware.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const usersRoutes = Router();

const createUserSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    email: z
      .email()
      .max(160)
      .transform((email) => email.trim().toLowerCase()),
    phone: optionalText(32),
    role: z.enum(["ADMIN", "EMPLOYEE"]).default("EMPLOYEE"),
    branchId: z.uuid().nullable().optional(),
    password: z.string().min(12).max(128),
  })
  .strict();

usersRoutes.post("/users", requireAdmin, async (request, response) => {
  const body = validateBody(request, createUserSchema);
  const result = await storeUser(body);

  response.status(201).json(result);
});

function optionalText(max: number) {
  return z
    .union([z.string().trim().min(1).max(max), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional();
}
