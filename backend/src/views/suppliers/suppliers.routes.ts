import { Router } from "express";
import { z } from "zod";
import {
  indexSuppliers,
  storeSupplier,
} from "../../controllers/suppliers/suppliers.controller.js";
import {
  parseBooleanFilter,
  parseStringFilter,
} from "../../shared/http/query-params.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const suppliersRoutes = Router();

const createSupplierSchema = z.object({
  name: z.string().trim().min(1).max(160),
  document: optionalText(32),
  email: z.union([z.email().max(160), z.literal("")]).optional(),
  phone: optionalText(32),
  active: z.boolean().optional(),
});

function optionalText(max: number) {
  return z.union([z.string().trim().min(1).max(max), z.literal("")]).optional();
}

suppliersRoutes.get("/suppliers", async (request, response) => {
  const result = await indexSuppliers({
    active: parseBooleanFilter(request.query.active),
    search: parseStringFilter(request.query.search),
  });

  response.status(200).json(result);
});

suppliersRoutes.post("/suppliers", async (request, response) => {
  const body = validateBody(request, createSupplierSchema);
  const result = await storeSupplier(body);

  response.status(201).json(result);
});
