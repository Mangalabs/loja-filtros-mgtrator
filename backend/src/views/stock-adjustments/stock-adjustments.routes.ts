import { Router } from "express";
import { z } from "zod";
import {
  indexStockAdjustments,
  storeStockAdjustment,
} from "../../controllers/stock-adjustments/stock-adjustments.controller.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const stockAdjustmentsRoutes = Router();

const createStockAdjustmentSchema = z.object({
  productId: z.uuid(),
  quantity: z.coerce.number().refine((value) => value !== 0, {
    message: "Quantidade do ajuste deve ser diferente de zero.",
  }),
  reason: z.string().trim().min(1).max(500),
});

stockAdjustmentsRoutes.get("/stock-adjustments", async (_request, response) => {
  const result = await indexStockAdjustments();

  response.status(200).json(result);
});

stockAdjustmentsRoutes.post("/stock-adjustments", async (request, response) => {
  const body = validateBody(request, createStockAdjustmentSchema);
  const userId = response.locals.authenticatedUser.id as string;
  const result = await storeStockAdjustment(body, userId);

  response.status(201).json(result);
});
