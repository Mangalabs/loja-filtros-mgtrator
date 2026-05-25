import type { Knex } from "knex";
import { db } from "../../database/knex.js";

export type StockAdjustmentInput = {
  productId: string;
  quantity: number;
  reason: string;
};

export type StockAdjustment = {
  id: string;
  productId: string;
  productName: string;
  quantity: string;
  reason: string;
  createdAt: Date;
};

export type LockedProductStock = {
  id: string;
  currentStock: string;
};

export async function listStockAdjustments(): Promise<StockAdjustment[]> {
  return db("stock_movements")
    .join("products", "products.id", "stock_movements.product_id")
    .where("stock_movements.type", "ADJUSTMENT")
    .select([
      "stock_movements.id",
      "stock_movements.product_id as productId",
      "products.name as productName",
      "stock_movements.quantity",
      "stock_movements.notes as reason",
      "stock_movements.created_at as createdAt",
    ])
    .orderBy("stock_movements.created_at", "desc");
}

export async function lockProductStock(
  transaction: Knex.Transaction,
  productId: string,
): Promise<LockedProductStock | undefined> {
  return transaction("products")
    .select(["id", "current_stock as currentStock"])
    .where("id", productId)
    .forUpdate()
    .first();
}

export async function insertStockAdjustment(
  transaction: Knex.Transaction,
  input: StockAdjustmentInput,
): Promise<StockAdjustment> {
  const [created] = await transaction("stock_movements")
    .insert({
      product_id: input.productId,
      type: "ADJUSTMENT",
      quantity: input.quantity,
      notes: input.reason,
    })
    .returning("id");

  const adjustment = await findStockAdjustmentById(transaction, created.id);

  if (!adjustment) {
    throw new Error("Stock adjustment was not found after creation");
  }

  return adjustment;
}

export async function applyStockAdjustment(
  transaction: Knex.Transaction,
  input: StockAdjustmentInput,
): Promise<void> {
  await transaction("products")
    .where("id", input.productId)
    .update({
      current_stock: transaction.raw("current_stock + ?", [input.quantity]),
      updated_at: transaction.fn.now(),
    });
}

async function findStockAdjustmentById(
  transaction: Knex.Transaction,
  id: string,
): Promise<StockAdjustment | undefined> {
  return transaction("stock_movements")
    .join("products", "products.id", "stock_movements.product_id")
    .select([
      "stock_movements.id",
      "stock_movements.product_id as productId",
      "products.name as productName",
      "stock_movements.quantity",
      "stock_movements.notes as reason",
      "stock_movements.created_at as createdAt",
    ])
    .where("stock_movements.id", id)
    .first();
}
