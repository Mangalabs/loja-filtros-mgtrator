import { Router } from "express";
import { indexProducts } from "../../controllers/products/products.controller.js";
import { AppError } from "../../shared/errors/app-error.js";

export const productsRoutes = Router();

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
