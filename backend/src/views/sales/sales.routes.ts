import { Router } from "express";
import { z } from "zod";
import { indexSales, storeSale } from "../../controllers/sales/sales.controller.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const salesRoutes = Router();

const createSaleSchema = z
  .object({
    productId: z.uuid(),
    quantity: z.coerce.number().positive(),
    paymentMethodId: z.uuid(),
    clientId: z
      .union([z.uuid(), z.literal(""), z.null()])
      .transform((value) => value || null)
      .optional(),
  })
  .strict();

salesRoutes.get("/sales", async (_request, response) => {
  response.status(200).json(await indexSales());
});

salesRoutes.post("/sales", async (request, response) => {
  const body = validateBody(request, createSaleSchema);
  const userId = response.locals.authenticatedUser.id as string;

  response.status(201).json(await storeSale(body, userId));
});
