import { Router } from "express";
import { z } from "zod";
import {
  indexStockEntries,
  storeStockEntry,
} from "../../controllers/stock-entries/stock-entries.controller.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const stockEntriesRoutes = Router();

const createStockEntrySchema = z.object({
  productId: z.uuid(),
  supplierId: z.uuid(),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().min(0),
  notes: z
    .union([z.string().trim().min(1).max(500), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional(),
});

stockEntriesRoutes.get("/stock-entries", async (_request, response) => {
  const result = await indexStockEntries();

  response.status(200).json(result);
});

stockEntriesRoutes.post("/stock-entries", async (request, response) => {
  const body = validateBody(request, createStockEntrySchema);
  const result = await storeStockEntry(body);

  response.status(201).json(result);
});
