import { Router } from "express";
import { z } from "zod";
import {
  destroySupplier,
  indexSuppliers,
  replaceSupplier,
  storeSupplier,
} from "../../controllers/suppliers/suppliers.controller.js";
import {
  parseBooleanFilter,
  parseStringFilter,
} from "../../shared/http/query-params.js";
import { requireActiveBranchId } from "../../shared/auth/branch-context.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const suppliersRoutes = Router();

const createSupplierSchema = z.object({
  name: z.string().trim().min(1).max(160),
  document: optionalText(32),
  email: z
    .union([z.email().max(160), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional(),
  phone: optionalText(32),
  active: z.boolean().optional(),
});
const updateSupplierSchema = createSupplierSchema.extend({
  active: z.boolean(),
});

const supplierParamsSchema = z.object({ id: z.uuid() });

function optionalText(max: number) {
  return z
    .union([z.string().trim().min(1).max(max), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional();
}

suppliersRoutes.get("/suppliers", async (request, response) => {
  const result = await indexSuppliers({
    branchId: requireActiveBranchId(response.locals),
    active: parseBooleanFilter(request.query.active),
    search: parseStringFilter(request.query.search),
  });

  response.status(200).json(result);
});

suppliersRoutes.post("/suppliers", async (request, response) => {
  const body = validateBody(request, createSupplierSchema);
  const result = await storeSupplier(
    body,
    requireActiveBranchId(response.locals),
  );

  response.status(201).json(result);
});

suppliersRoutes.put("/suppliers/:id", async (request, response) => {
  const { id } = supplierParamsSchema.parse(request.params);
  const body = validateBody(request, updateSupplierSchema);
  const result = await replaceSupplier(
    id,
    body,
    requireActiveBranchId(response.locals),
  );

  response.status(200).json(result);
});

suppliersRoutes.delete("/suppliers/:id", async (request, response) => {
  const { id } = supplierParamsSchema.parse(request.params);
  const result = await destroySupplier(
    id,
    requireActiveBranchId(response.locals),
  );

  response.status(200).json(result);
});
