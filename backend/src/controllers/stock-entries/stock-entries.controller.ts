import { db } from "../../database/knex.js";
import {
  applyStockEntryToProduct,
  insertStockEntry,
  listStockEntries,
  lockProduct,
  saveLastSupplierCost,
  supplierExists,
  type StockEntryInput,
} from "../../models/stock-entries/stock-entries.model.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function indexStockEntries() {
  const entries = await listStockEntries();

  return {
    code: 200,
    status: "success",
    data: entries,
  };
}

export async function storeStockEntry(
  input: StockEntryInput,
  createdByUserId: string,
) {
  const entry = await db.transaction(async (transaction) => {
    if (!(await lockProduct(transaction, input.productId))) {
      throw new AppError("Produto informado nao encontrado.", 422);
    }

    if (!(await supplierExists(transaction, input.supplierId))) {
      throw new AppError("Fornecedor informado nao encontrado.", 422);
    }

    const created = await insertStockEntry(transaction, input, createdByUserId);
    await applyStockEntryToProduct(transaction, input);
    await saveLastSupplierCost(transaction, input);

    return created;
  });

  return {
    code: 201,
    status: "success",
    data: entry,
  };
}
