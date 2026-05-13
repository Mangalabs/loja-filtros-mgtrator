import { Router } from "express";
import { z } from "zod";
import {
  indexProductGroups,
  storeProductGroup,
} from "../../controllers/product-groups/product-groups.controller.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const productGroupsRoutes = Router();

const createProductGroupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  active: z.boolean().optional(),
});

productGroupsRoutes.get("/product-groups", async (request, response) => {
  const result = await indexProductGroups({
    active: parseActiveFilter(request.query.active),
  });

  response.status(200).json(result);
});

productGroupsRoutes.post("/product-groups", async (request, response) => {
  const body = validateBody(request, createProductGroupSchema);
  const result = await storeProductGroup(body);

  response.status(201).json(result);
});

function parseActiveFilter(value: unknown): boolean | undefined {
  if (value === "true" || value === "1") {
    return true;
  }

  if (value === "false" || value === "0") {
    return false;
  }

  return undefined;
}
