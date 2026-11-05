import { listStockMovements } from "../../models/stock-movements/stock-movements.model.js";
import { listProductChanges } from "../../models/product-change-history/product-change-history.model.js";

export async function indexStockMovements(filters: { branchId: string }) {
  const [stockMovements, productChanges] = await Promise.all([
    listStockMovements(filters),
    listProductChanges(filters),
  ]);
  const movements = [
    ...stockMovements.map((movement) => ({
      ...movement,
      changes: null,
    })),
    ...productChanges.map((change) => ({
      id: change.id,
      type: change.type,
      productId: change.productId,
      productName: change.productName,
      supplierName: null,
      saleId: null,
      saleNumber: null,
      createdByUserId: change.createdByUserId,
      createdByUserName: change.createdByUserName,
      quantity: null,
      unitCost: null,
      notes: change.description,
      changes: change.changes,
      createdAt: change.createdAt,
    })),
  ].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

  return {
    code: 200,
    status: "success",
    data: movements,
  };
}
