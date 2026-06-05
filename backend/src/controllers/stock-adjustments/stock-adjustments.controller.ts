import { db } from "../../database/knex.js";
import {
  applyStockAdjustment,
  insertStockAdjustment,
  listStockAdjustments,
  lockProductStock,
  type StockAdjustmentInput,
} from "../../models/stock-adjustments/stock-adjustments.model.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function indexStockAdjustments() {
  const adjustments = await listStockAdjustments();

  return {
    code: 200,
    status: "success",
    data: adjustments,
  };
}

export async function storeStockAdjustment(
  input: StockAdjustmentInput,
  createdByUserId: string,
) {
  const adjustment = await db.transaction(async (transaction) => {
    const product = await lockProductStock(transaction, input.productId);

    if (!product) {
      throw new AppError("Produto informado nao encontrado.", 422);
    }

    if (Number(product.currentStock) + input.quantity < 0) {
      throw new AppError("Ajuste nao pode resultar em estoque negativo.", 422);
    }

    if (
      Number(product.currentStock) + input.quantity <
      Number(product.reservedStock)
    ) {
      throw new AppError(
        "Ajuste nao pode retirar quantidade reservada para separacao.",
        422,
      );
    }

    const created = await insertStockAdjustment(
      transaction,
      input,
      createdByUserId,
    );
    await applyStockAdjustment(transaction, input);

    return created;
  });

  return {
    code: 201,
    status: "success",
    data: adjustment,
  };
}
