import { listStockMovements } from "../../models/stock-movements/stock-movements.model.js";

export async function indexStockMovements() {
  const movements = await listStockMovements();

  return {
    code: 200,
    status: "success",
    data: movements,
  };
}
