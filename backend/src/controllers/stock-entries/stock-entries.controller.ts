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

export async function indexStockEntries(filters: { branchId: string }) {
  const entries = await listStockEntries(filters);

  return {
    code: 200,
    status: "success",
    data: entries,
  };
}

export async function storeStockEntry(
  input: StockEntryInput,
  createdByUserId: string,
  branchId: string,
) {
  const entry = await db.transaction(async (transaction) => {
    if (!(await lockProduct(transaction, input.productId, branchId))) {
      throw new AppError("Produto informado nao pertence a filial ativa.", 422);
    }

    if (!(await supplierExists(transaction, input.supplierId, branchId))) {
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
