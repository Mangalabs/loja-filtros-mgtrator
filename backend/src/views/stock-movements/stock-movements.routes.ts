import { Router } from "express";
import { indexStockMovements } from "../../controllers/stock-movements/stock-movements.controller.js";
import { requireActiveBranchId } from "../../shared/auth/branch-context.js";

export const stockMovementsRoutes = Router();

stockMovementsRoutes.get("/stock-movements", async (_request, response) => {
  const result = await indexStockMovements({
    branchId: requireActiveBranchId(response.locals),
  });

  response.status(200).json(result);
});
