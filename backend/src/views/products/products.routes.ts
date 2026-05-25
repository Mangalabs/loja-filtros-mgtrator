import { Router } from "express";
import { z } from "zod";
import {
  changeProductStatus,
  indexProducts,
  replaceProduct,
  showProduct,
  storeProduct,
} from "../../controllers/products/products.controller.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  parseBooleanFilter,
  parseStringFilter,
} from "../../shared/http/query-params.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const productsRoutes = Router();

const createProductSchema = z.object({
  name: z.string().trim().min(1),
  internalCode: optionalText(80),
  barcode: optionalText(80),
  brandId: optionalUuid(),
  groupId: optionalUuid(),
  unit: z.enum(["UN", "KIT", "CJ"]).optional(),
  location: optionalText(80),
  costPrice: z.coerce.number().min(0).optional(),
  salePrice: z.coerce.number().min(0).optional(),
  minimumStock: z.coerce.number().min(0).optional(),
  ncm: optionalText(16),
  cest: optionalText(16),
  origin: optionalText(2),
  description: optionalText(1000),
  active: z.boolean().optional(),
});

const updateProductSchema = createProductSchema.partial().refine((value) => {
  return Object.keys(value).length > 0;
});

const updateProductStatusSchema = z.object({
  active: z.boolean(),
});

const productParamsSchema = z.object({
  id: z.uuid(),
});

productsRoutes.get("/products", async (request, response) => {
  const page = Number(request.query.page ?? 1);
  const limit = Number(request.query.limit ?? 20);
  const active = parseBooleanFilter(request.query.active);

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

productsRoutes.get("/products/:id", async (request, response) => {
  const { id } = productParamsSchema.parse(request.params);
  const result = await showProduct(id);

  response.status(200).json(result);
});

productsRoutes.post("/products", async (request, response) => {
  const body = validateBody(request, createProductSchema);
  const result = await storeProduct(body);

  response.status(201).json(result);
});

productsRoutes.put("/products/:id", async (request, response) => {
  const { id } = productParamsSchema.parse(request.params);
  const body = validateBody(request, updateProductSchema);
  const result = await replaceProduct(id, body);

  response.status(200).json(result);
});

productsRoutes.patch("/products/:id/status", async (request, response) => {
  const { id } = productParamsSchema.parse(request.params);
  const body = validateBody(request, updateProductStatusSchema);
  const result = await changeProductStatus(id, body.active);

  response.status(200).json(result);
});

function optionalText(max: number) {
  return z
    .union([z.string().trim().min(1).max(max), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional();
}

function optionalUuid() {
  return z
    .union([z.uuid(), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional();
}
