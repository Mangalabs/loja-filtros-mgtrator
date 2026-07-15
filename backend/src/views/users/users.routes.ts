import { Router } from "express";
import { z } from "zod";
import {
  changeEmployeeStatus,
  indexUsers,
  replaceEmployee,
  resetEmployeePassword,
  storeUser,
} from "../../controllers/users/users.controller.js";
import { requireAdmin } from "../../shared/auth/authorization-middleware.js";
import { employeePermissionValues } from "../../shared/auth/permissions.js";
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
    branchId: z.uuid(),
    permissions: z.array(z.enum(employeePermissionValues)).default([]),
    password: z.string().min(12).max(128),
  })
  .strict();

const employeeParamsSchema = z.object({
  id: z.uuid(),
});

const replaceEmployeeSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    email: z
      .email()
      .max(160)
      .transform((email) => email.trim().toLowerCase()),
    phone: optionalText(32),
    branchId: z.uuid(),
    permissions: z.array(z.enum(employeePermissionValues)).default([]),
    password: z
      .union([z.string().min(12).max(128), z.literal("")])
      .transform((value) => value || undefined)
      .optional(),
  })
  .strict();

const updateEmployeeStatusSchema = z
  .object({
    active: z.boolean(),
  })
  .strict();

const resetEmployeePasswordSchema = z
  .object({
    password: z.string().min(12).max(128),
  })
  .strict();

usersRoutes.get("/users", requireAdmin, async (_request, response) => {
  response.status(200).json(await indexUsers());
});

usersRoutes.post("/users", requireAdmin, async (request, response) => {
  const body = validateBody(request, createUserSchema);
  const result = await storeUser(body);

  response.status(201).json(result);
});

usersRoutes.put("/users/:id", requireAdmin, async (request, response) => {
  const { id } = employeeParamsSchema.parse(request.params);
  const body = validateBody(request, replaceEmployeeSchema);
  const result = await replaceEmployee(id, body, {
    id: response.locals.authenticatedUser.id,
    email: response.locals.authenticatedUser.email,
  });

  response.status(200).json(result);
});

usersRoutes.patch(
  "/users/:id/status",
  requireAdmin,
  async (request, response) => {
    const { id } = employeeParamsSchema.parse(request.params);
    const body = validateBody(request, updateEmployeeStatusSchema);
    const result = await changeEmployeeStatus(id, body.active);

    response.status(200).json(result);
  },
);

usersRoutes.post(
  "/users/:id/password-reset",
  requireAdmin,
  async (request, response) => {
    const { id } = employeeParamsSchema.parse(request.params);
    const body = validateBody(request, resetEmployeePasswordSchema);
    const result = await resetEmployeePassword(id, body, {
      id: response.locals.authenticatedUser.id,
      email: response.locals.authenticatedUser.email,
    });

    response.status(200).json(result);
  },
);

function optionalText(max: number) {
  return z
    .union([z.string().trim().min(1).max(max), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional();
}
