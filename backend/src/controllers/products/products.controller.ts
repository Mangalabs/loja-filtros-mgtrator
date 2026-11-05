import { db } from "../../database/knex.js";
import type { Knex } from "knex";
import {
  createProduct,
  deleteProduct,
  findProductIdentifierDuplicates,
  getProductById,
  listLowStockProducts,
  listProducts,
  listProductsPage,
  lockProductForUpdate,
  updateProduct,
  updateProductReplenishmentMonitor,
  updateProductStatus,
  type ProductCreateInput,
  type ProductListItem,
  type ProductListFilters,
  type ProductUpdateInput,
} from "../../models/products/products.model.js";
import {
  insertProductChange,
  type ProductFieldChange,
  type ProductChangeType,
} from "../../models/product-change-history/product-change-history.model.js";
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
    let storedProduct = created;

    if (currentStock !== 0) {
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

      storedProduct = updated;
    }

    await insertProductChange(transaction, {
      productId: created.id,
      branchId: requireProductBranchId(created),
      createdByUserId,
      type: "PRODUCT_CREATED",
      description: "Produto cadastrado.",
    });

    return storedProduct;
  });

  return {
    code: 201,
    status: "success",
    data: product,
  };
}

export async function checkProductIdentifierDuplicates(input: {
  branchId: string;
  internalCode?: string;
  barcode?: string;
  excludeId?: string;
}) {
  return {
    code: 200,
    status: "success",
    data: await findProductIdentifierDuplicates(input),
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
    await lockProductForUpdateOrThrow(id, branchId, transaction);
    const before = await getProductById(id, transaction);

    if (!before) {
      throw new AppError("Product not found", 404);
    }

    if (typeof input.currentStock === "number") {
      await updateCurrentStock(
        id,
        input.currentStock,
        updatedByUserId,
        branchId,
        transaction,
      );
    }

    const updated = await updateProduct(id, branchId, input, transaction);

    if (!updated) {
      throw new AppError("Product not found", 404);
    }

    await recordProductChanges(transaction, {
      before,
      after: updated,
      branchId,
      createdByUserId: updatedByUserId,
      type: "PRODUCT_UPDATED",
    });

    return updated;
  });

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

export async function changeProductStatus(
  id: string,
  branchId: string,
  active: boolean,
  updatedByUserId: string,
) {
  const product = await updateProductWithHistory({
    id,
    branchId,
    updatedByUserId,
    type: "PRODUCT_STATUS_CHANGED",
    update: (transaction) =>
      updateProductStatus(id, branchId, active, transaction),
  });

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
  updatedByUserId: string,
) {
  const product = await updateProductWithHistory({
    id,
    branchId,
    updatedByUserId,
    type: "PRODUCT_REPLENISHMENT_CHANGED",
    update: (transaction) =>
      updateProductReplenishmentMonitor(id, branchId, enabled, transaction),
  });

  return {
    code: 200,
    status: "success",
    data: product,
  };
}

export async function destroyProduct(
  id: string,
  branchId: string,
  deletedByUserId: string,
) {
  const product = await db.transaction(async (transaction) => {
    await lockProductForUpdateOrThrow(id, branchId, transaction);
    const deleted = await deleteProduct(id, branchId, transaction);

    if (!deleted) {
      throw new AppError("Product not found", 404);
    }

    await insertProductChange(transaction, {
      productId: deleted.id,
      branchId,
      createdByUserId: deletedByUserId,
      type: "PRODUCT_DELETED",
      description: "Produto removido da lista de produtos.",
      changes: {
        active: { before: deleted.active, after: false },
      },
    });

    return deleted;
  });

  return {
    code: 200,
    status: "success",
    data: product,
  };
}

async function updateProductWithHistory(input: {
  id: string;
  branchId: string;
  updatedByUserId: string;
  type: ProductChangeType;
  update: (
    transaction: Knex.Transaction,
  ) => Promise<ProductListItem | undefined>;
}) {
  return db.transaction(async (transaction) => {
    await lockProductForUpdateOrThrow(input.id, input.branchId, transaction);
    const before = await getProductById(input.id, transaction);

    if (!before) {
      throw new AppError("Product not found", 404);
    }

    const updated = await input.update(transaction);

    if (!updated) {
      throw new AppError("Product not found", 404);
    }

    await recordProductChanges(transaction, {
      before,
      after: updated,
      branchId: input.branchId,
      createdByUserId: input.updatedByUserId,
      type: input.type,
    });

    return updated;
  });
}

async function lockProductForUpdateOrThrow(
  id: string,
  branchId: string,
  transaction: Knex.Transaction,
) {
  const product = await lockProductForUpdate(id, branchId, transaction);

  if (!product) {
    throw new AppError("Product not found", 404);
  }
}

async function recordProductChanges(
  transaction: Knex.Transaction,
  input: {
    before: ProductListItem;
    after: ProductListItem;
    branchId: string;
    createdByUserId: string;
    type: ProductChangeType;
  },
) {
  const changes = productFieldChanges(input.before, input.after);

  if (Object.keys(changes).length === 0) {
    return;
  }

  await insertProductChange(transaction, {
    productId: input.after.id,
    branchId: input.branchId,
    createdByUserId: input.createdByUserId,
    type: input.type,
    description: productChangeDescription(changes),
    changes,
  });
}

const productAuditFields: Array<{
  key: keyof ProductListItem;
  label: string;
}> = [
  { key: "name", label: "Nome" },
  { key: "internalCode", label: "Codigo interno" },
  { key: "barcode", label: "Codigo de barras" },
  { key: "brandName", label: "Fabricante" },
  { key: "groupName", label: "Grupo" },
  { key: "unit", label: "Unidade" },
  { key: "location", label: "Locacao" },
  { key: "costPrice", label: "Valor de custo" },
  { key: "accessoryExpenses", label: "Despesas acessorias" },
  { key: "otherExpenses", label: "Outras despesas" },
  { key: "salePrice", label: "Valor de venda" },
  { key: "profitMarginPercentage", label: "Margem de lucro" },
  { key: "minimumStock", label: "Estoque minimo" },
  { key: "replenishmentMonitorEnabled", label: "Monitor de reposicao" },
  { key: "ncm", label: "NCM" },
  { key: "cest", label: "CEST" },
  { key: "cfop", label: "CFOP" },
  { key: "icmsCst", label: "CST ICMS" },
  { key: "pisCst", label: "CST PIS" },
  { key: "cofinsCst", label: "CST COFINS" },
  { key: "origin", label: "Origem" },
  { key: "description", label: "Descricao comercial" },
  { key: "internalNotes", label: "Observacoes internas" },
  { key: "active", label: "Status" },
];

function productFieldChanges(
  before: ProductListItem,
  after: ProductListItem,
): Record<string, ProductFieldChange> {
  return Object.fromEntries(
    productAuditFields.flatMap(({ key, label }) => {
      const beforeValue = before[key] ?? null;
      const afterValue = after[key] ?? null;

      return Object.is(beforeValue, afterValue)
        ? []
        : [[label, { before: beforeValue, after: afterValue }]];
    }),
  );
}

function productChangeDescription(
  changes: Record<string, ProductFieldChange>,
) {
  return Object.entries(changes)
    .map(
      ([label, change]) =>
        `${label}: ${auditValue(change.before)} -> ${auditValue(change.after)}`,
    )
    .join("; ");
}

function auditValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "nao informado";
  }

  if (typeof value === "boolean") {
    return value ? "sim" : "nao";
  }

  const text = String(value);

  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

function requireProductBranchId(product: ProductListItem) {
  if (!product.branchId) {
    throw new Error("Product branch was not found after persistence");
  }

  return product.branchId;
}
