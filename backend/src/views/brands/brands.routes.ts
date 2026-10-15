import { Router } from "express";
import { z } from "zod";
import {
  destroyBrand,
  indexBrands,
  replaceBrand,
  storeBrand,
} from "../../controllers/brands/brands.controller.js";
import { parseBooleanFilter } from "../../shared/http/query-params.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const brandsRoutes = Router();

const createBrandSchema = z.object({
  name: z.string().trim().min(1).max(120),
  active: z.boolean().optional(),
});
const updateBrandSchema = createBrandSchema.extend({ active: z.boolean() });

const brandParamsSchema = z.object({ id: z.uuid() });

brandsRoutes.get("/brands", async (request, response) => {
  const result = await indexBrands({
    active: parseBooleanFilter(request.query.active),
  });

  response.status(200).json(result);
});

brandsRoutes.post("/brands", async (request, response) => {
  const body = validateBody(request, createBrandSchema);
  const result = await storeBrand(body);

  response.status(201).json(result);
});

brandsRoutes.put("/brands/:id", async (request, response) => {
  const { id } = brandParamsSchema.parse(request.params);
  const body = validateBody(request, updateBrandSchema);

  response.status(200).json(await replaceBrand(id, body));
});

brandsRoutes.delete("/brands/:id", async (request, response) => {
  const { id } = brandParamsSchema.parse(request.params);

  response.status(200).json(await destroyBrand(id));
});
