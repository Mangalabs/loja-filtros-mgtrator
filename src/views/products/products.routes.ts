import { Router } from "express";
import { z } from "zod";
import {
  indexProducts,
  storeProduct,
} from "../../controllers/products/products.controller.js";
import { AppError } from "../../shared/errors/app-error.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const productsRoutes = Router();

const createProductSchema = z.object({
  name: z.string().trim().min(1),
  internalCode: z.string().trim().min(1).optional(),
  barcode: z.string().trim().min(1).optional(),
  brandId: z.uuid().optional(),
  groupId: z.uuid().optional(),
  unit: z.string().trim().min(1).max(16).optional(),
  costPrice: z.coerce.number().min(0).optional(),
  salePrice: z.coerce.number().min(0).optional(),
  minimumStock: z.coerce.number().min(0).optional(),
  ncm: z.string().trim().min(1).max(16).optional(),
  cest: z.string().trim().min(1).max(16).optional(),
  origin: z.string().trim().min(1).max(2).optional(),
  description: z.string().trim().min(1).optional(),
  active: z.boolean().optional(),
});

productsRoutes.get("/products", async (request, response) => {
  const page = Number(request.query.page ?? 1);
  const limit = Number(request.query.limit ?? 20);
  const active = parseActiveFilter(request.query.active);

  if (!Number.isInteger(page) || page < 1) {
    throw new AppError("Invalid page parameter");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError("Invalid limit parameter");
  }

  const result = await indexProducts({
    page,
    limit,
    active,
    search: parseStringFilter(request.query.search),
  });

  response.status(200).json(result);
});

productsRoutes.post("/products", async (request, response) => {
  const body = validateBody(request, createProductSchema);
  const result = await storeProduct(body);

  response.status(201).json(result);
});

function parseStringFilter(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseActiveFilter(value: unknown): boolean | undefined {
  if (value === "true" || value === "1") {
    return true;
  }

  if (value === "false" || value === "0") {
    return false;
  }

  return undefined;
}
