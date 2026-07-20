import { listStockMovements } from "../../models/stock-movements/stock-movements.model.js";

export async function indexStockMovements(filters: { branchId: string }) {
  const movements = await listStockMovements(filters);

  return {
    code: 200,
    status: "success",
    data: movements,
  };
}
