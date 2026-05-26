import { Router } from "express";
import { indexStockMovements } from "../../controllers/stock-movements/stock-movements.controller.js";

export const stockMovementsRoutes = Router();

stockMovementsRoutes.get("/stock-movements", async (_request, response) => {
  const result = await indexStockMovements();

  response.status(200).json(result);
});
