import { db } from "../../database/knex.js";

export type StockMovement = {
  id: string;
  type: "ENTRY" | "ADJUSTMENT";
  productId: string;
  productName: string;
  supplierName: string | null;
  quantity: string;
  unitCost: string | null;
  notes: string | null;
  createdAt: Date;
};

export async function listStockMovements(): Promise<StockMovement[]> {
  return db("stock_movements")
    .join("products", "products.id", "stock_movements.product_id")
    .leftJoin("suppliers", "suppliers.id", "stock_movements.supplier_id")
    .select([
      "stock_movements.id",
      "stock_movements.type",
      "stock_movements.product_id as productId",
      "products.name as productName",
      "suppliers.name as supplierName",
      "stock_movements.quantity",
      "stock_movements.unit_cost as unitCost",
      "stock_movements.notes",
      "stock_movements.created_at as createdAt",
    ])
    .orderBy("stock_movements.created_at", "desc")
    .orderBy("stock_movements.id", "desc");
}
