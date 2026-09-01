import { db } from "../../database/knex.js";
import type { Knex } from "knex";
import {
  createProduct,
  getProductById,
  listLowStockProducts,
  listProducts,
  listProductsPage,
  updateProduct,
  updateProductReplenishmentMonitor,
  updateProductStatus,
  type ProductCreateInput,
  type ProductListFilters,
  type ProductUpdateInput,
} from "../../models/products/products.model.js";
import {
  applyStockAdjustment,
  insertStockAdjustment,
  lockProductStock,
} from "../../models/stock-adjustments/stock-adjustments.model.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function indexProducts(
  filters: ProductListFilters,
  options: { includeMeta?: boolean } = {},
) {
  const products = options.includeMeta
    ? await listProductsPage(filters)
    : await listProducts(filters);

  return {
    code: 200,
    status: "success",
    data: products,
  };
}

export async function storeProduct(
  input: ProductCreateInput,
  createdByUserId: string,
) {
  const product = await db.transaction(async (transaction) => {
    const created = await createProduct(input, transaction);
    const currentStock = Number(input.currentStock ?? 0);

    if (currentStock === 0) {
      return created;
    }

    const stockAdjustment = {
      productId: created.id,
      quantity: currentStock,
      reason: "Estoque atual informado no cadastro do produto.",
    };

    await insertStockAdjustment(transaction, stockAdjustment, createdByUserId);
    await applyStockAdjustment(transaction, stockAdjustment);

    const updated = await getProductById(created.id, transaction);

    if (!updated) {
      throw new Error("Product was not found after current stock adjustment");
    }

    return updated;
  });

  return {
    code: 201,
    status: "success",
    data: product,
  };
}

export async function indexLowStockProducts(filters: {
  branchId?: string | null;
}) {
  const products = await listLowStockProducts(filters);

  return {
    code: 200,
    status: "success",
    data: products,
  };
}

export async function showProduct(id: string) {
  const product = await getProductById(id);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return {
    code: 200,
    status: "success",
    data: product,
  };
}

export async function replaceProduct(
  id: string,
  input: ProductUpdateInput,
  updatedByUserId: string,
  branchId: string,
) {
  const product = await db.transaction(async (transaction) => {
    if (typeof input.currentStock === "number") {
      await updateCurrentStock(
        id,
        input.currentStock,
        updatedByUserId,
        branchId,
        transaction,
      );
    }

    return updateProduct(id, input, transaction);
  });

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return {
    code: 200,
    status: "success",
    data: product,
  };
}

async function updateCurrentStock(
  productId: string,
  targetCurrentStock: number,
  updatedByUserId: string,
  branchId: string,
  transaction: Knex.Transaction,
) {
  const product = await lockProductStock(transaction, productId, branchId);

  if (!product) {
    throw new AppError("Produto informado nao pertence a filial ativa.", 422);
  }

  const currentStock = Number(product.currentStock);
  const reservedStock = Number(product.reservedStock);
  const quantity = Number((targetCurrentStock - currentStock).toFixed(3));

  if (quantity === 0) {
    return;
  }

  if (targetCurrentStock < reservedStock) {
    throw new AppError(
      "Estoque atual nao pode ficar abaixo da quantidade reservada.",
      422,
    );
  }

  const stockAdjustment = {
    productId,
    quantity,
    reason: "Estoque atual corrigido na edicao do produto.",
  };

  await insertStockAdjustment(transaction, stockAdjustment, updatedByUserId);
  await applyStockAdjustment(transaction, stockAdjustment);
}

export async function changeProductStatus(id: string, active: boolean) {
  const product = await updateProductStatus(id, active);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return {
    code: 200,
    status: "success",
    data: product,
  };
}

export async function changeProductReplenishmentMonitor(
  id: string,
  branchId: string,
  enabled: boolean,
) {
  const product = await updateProductReplenishmentMonitor(id, branchId, enabled);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return {
    code: 200,
    status: "success",
    data: product,
  };
}
