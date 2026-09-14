import { db } from "../../database/knex.js";
import type { Knex } from "knex";

export type ProductListFilters = {
  search?: string;
  active?: boolean;
  stockStatus?: "ALL" | "LOW" | "NEGATIVE" | "AVAILABLE" | "OUT_OF_STOCK";
  branchId?: string | null;
  page: number;
  limit: number;
};

export type ProductListPage = {
  items: ProductListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ProductListItem = {
  id: string;
  name: string;
  internalCode: string | null;
  barcode: string | null;
  branchId: string | null;
  branchName: string | null;
  brandId: string | null;
  brandName: string | null;
  groupName: string | null;
  unit: string;
  location: string | null;
  costPrice: string;
  accessoryExpenses: string;
  otherExpenses: string;
  salePrice: string;
  profitMarginPercentage: string | null;
  minimumStock: string;
  currentStock: string;
  reservedStock: string;
  availableStock: string;
  replenishmentMonitorEnabled: boolean;
  ncm: string | null;
  cest: string | null;
  cfop: string | null;
  icmsCst: string | null;
  pisCst: string | null;
  cofinsCst: string | null;
  origin: string | null;
  description: string | null;
  active: boolean;
};

export type ProductCreateInput = {
  name: string;
  internalCode?: string | null;
  barcode?: string | null;
  branchId?: string | null;
  brandId?: string | null;
  groupId?: string | null;
  unit?: string;
  location?: string | null;
  costPrice?: number;
  accessoryExpenses?: number;
  otherExpenses?: number;
  salePrice?: number;
  profitMarginPercentage?: number | null;
  minimumStock?: number;
  currentStock?: number;
  replenishmentMonitorEnabled?: boolean;
  ncm?: string | null;
  cest?: string | null;
  cfop?: string | null;
  icmsCst?: string | null;
  pisCst?: string | null;
  cofinsCst?: string | null;
  origin?: string | null;
  description?: string | null;
  active?: boolean;
};

export type ProductUpdateInput = Partial<ProductCreateInput>;

export async function listProducts(
  filters: ProductListFilters,
): Promise<ProductListItem[]> {
  const offset = (filters.page - 1) * filters.limit;

  const rows = await db("products")
    .leftJoin("branches", "branches.id", "products.branch_id")
    .leftJoin("brands", "brands.id", "products.brand_id")
    .leftJoin("product_groups", "product_groups.id", "products.group_id")
    .select(productListColumns())
    .modify((query) => applyProductFilters(query, filters))
    .orderBy("products.name", "asc")
    .limit(filters.limit)
    .offset(offset);

  return rows;
}

export async function listProductsPage(
  filters: ProductListFilters,
): Promise<ProductListPage> {
  const [items, total] = await Promise.all([
    listProducts(filters),
    countProducts(filters),
  ]);

  return {
    items,
    total,
    page: filters.page,
    limit: filters.limit,
    totalPages: Math.max(1, Math.ceil(total / filters.limit)),
  };
}

export async function listLowStockProducts(filters: {
  branchId?: string | null;
}): Promise<ProductListItem[]> {
  return db("products")
    .leftJoin("branches", "branches.id", "products.branch_id")
    .leftJoin("brands", "brands.id", "products.brand_id")
    .leftJoin("product_groups", "product_groups.id", "products.group_id")
    .select(productListColumns())
    .where("products.active", true)
    .whereNull("products.deleted_at")
    .modify((query) => {
      if (filters.branchId) {
        query.where("products.branch_id", filters.branchId);
      }
    })
    .andWhere((builder) => {
      builder
        .where("products.replenishment_monitor_enabled", true)
        .orWhere((lowStockBuilder) => {
          lowStockBuilder
            .where("products.minimum_stock", ">", 0)
            .whereRaw(
              "products.current_stock - products.reserved_stock <= products.minimum_stock",
            );
        });
    })
    .orderBy("products.replenishment_monitor_enabled", "desc")
    .orderByRaw("products.current_stock - products.reserved_stock asc")
    .orderBy("products.name", "asc");
}

async function countProducts(filters: ProductListFilters) {
  const result = await db("products")
    .leftJoin("brands", "brands.id", "products.brand_id")
    .count<{ count: string }>("products.id as count")
    .modify((query) => applyProductFilters(query, filters))
    .first();

  return Number(result?.count ?? 0);
}

function applyProductFilters(
  query: Knex.QueryBuilder,
  filters: ProductListFilters,
) {
  query.whereNull("products.deleted_at");

  if (filters.search) {
    query.where((builder) => {
      builder
        .whereILike("products.name", `%${filters.search}%`)
        .orWhereILike("products.internal_code", `%${filters.search}%`)
        .orWhereILike("products.barcode", `%${filters.search}%`)
        .orWhereILike("brands.name", `%${filters.search}%`)
        .orWhereILike("products.location", `%${filters.search}%`);
    });
  }

  if (typeof filters.active === "boolean") {
    query.where("products.active", filters.active);
  }

  if (filters.stockStatus && filters.stockStatus !== "ALL") {
    if (filters.stockStatus === "LOW") {
      query
        .where("products.minimum_stock", ">", 0)
        .whereRaw(
          "products.current_stock - products.reserved_stock <= products.minimum_stock",
        );
    }

    if (filters.stockStatus === "NEGATIVE") {
      query.where("products.current_stock", "<", 0);
    }

    if (filters.stockStatus === "AVAILABLE") {
      query.whereRaw("products.current_stock - products.reserved_stock > 0");
    }

    if (filters.stockStatus === "OUT_OF_STOCK") {
      query.whereRaw("products.current_stock - products.reserved_stock <= 0");
    }
  }

  if (filters.branchId) {
    query.where("products.branch_id", filters.branchId);
  }
}

export async function createProduct(
  input: ProductCreateInput,
  database: Knex | Knex.Transaction = db,
): Promise<ProductListItem> {
  const [created] = await database("products")
    .insert({
      name: input.name,
      internal_code: input.internalCode,
      barcode: input.barcode,
      branch_id: input.branchId,
      brand_id: input.brandId,
      group_id: input.groupId,
      unit: input.unit,
      location: input.location,
      cost_price: input.costPrice,
      accessory_expenses: input.accessoryExpenses,
      other_expenses: input.otherExpenses,
      sale_price: input.salePrice,
      profit_margin_percentage: input.profitMarginPercentage,
      minimum_stock: input.minimumStock,
      replenishment_monitor_enabled: input.replenishmentMonitorEnabled,
      ncm: input.ncm,
      cest: input.cest,
      cfop: input.cfop,
      icms_cst: input.icmsCst,
      pis_cst: input.pisCst,
      cofins_cst: input.cofinsCst,
      origin: input.origin,
      description: input.description,
      active: input.active,
    })
    .returning("id");

  const product = await findProductById(created.id, database);

  if (!product) {
    throw new Error("Product was not found after creation");
  }

  return product;
}

export async function getProductById(
  id: string,
  database: Knex | Knex.Transaction = db,
): Promise<ProductListItem | undefined> {
  return findProductById(id, database);
}

export async function updateProduct(
  id: string,
  input: ProductUpdateInput,
  database: Knex | Knex.Transaction = db,
): Promise<ProductListItem | undefined> {
  const [updated] = await database("products")
    .where("id", id)
    .whereNull("deleted_at")
    .update({
      name: input.name,
      internal_code: input.internalCode,
      barcode: input.barcode,
      branch_id: input.branchId,
      brand_id: input.brandId,
      group_id: input.groupId,
      unit: input.unit,
      location: input.location,
      cost_price: input.costPrice,
      accessory_expenses: input.accessoryExpenses,
      other_expenses: input.otherExpenses,
      sale_price: input.salePrice,
      profit_margin_percentage: input.profitMarginPercentage,
      minimum_stock: input.minimumStock,
      replenishment_monitor_enabled: input.replenishmentMonitorEnabled,
      ncm: input.ncm,
      cest: input.cest,
      cfop: input.cfop,
      icms_cst: input.icmsCst,
      pis_cst: input.pisCst,
      cofins_cst: input.cofinsCst,
      origin: input.origin,
      description: input.description,
      active: input.active,
      updated_at: db.fn.now(),
    })
    .returning("id");

  if (!updated) {
    return undefined;
  }

  return findProductById(updated.id, database);
}

export async function updateProductStatus(
  id: string,
  active: boolean,
): Promise<ProductListItem | undefined> {
  const [updated] = await db("products")
    .where("id", id)
    .whereNull("deleted_at")
    .update({
      active,
      updated_at: db.fn.now(),
    })
    .returning("id");

  if (!updated) {
    return undefined;
  }

  return findProductById(updated.id);
}

export async function updateProductReplenishmentMonitor(
  id: string,
  branchId: string,
  enabled: boolean,
): Promise<ProductListItem | undefined> {
  const [updated] = await db("products")
    .where({ id, branch_id: branchId })
    .whereNull("deleted_at")
    .update({
      replenishment_monitor_enabled: enabled,
      updated_at: db.fn.now(),
    })
    .returning("id");

  if (!updated) {
    return undefined;
  }

  return findProductById(updated.id);
}

export async function deleteProduct(
  id: string,
  branchId: string,
): Promise<ProductListItem | undefined> {
  const product = await findProductById(id);

  if (!product || product.branchId !== branchId) {
    return undefined;
  }

  await db("products").where({ id, branch_id: branchId }).update({
    active: false,
    deleted_at: db.fn.now(),
    updated_at: db.fn.now(),
  });

  return product;
}

async function findProductById(
  id: string,
  database: Knex | Knex.Transaction = db,
): Promise<ProductListItem | undefined> {
  return database("products")
    .leftJoin("branches", "branches.id", "products.branch_id")
    .leftJoin("brands", "brands.id", "products.brand_id")
    .leftJoin("product_groups", "product_groups.id", "products.group_id")
    .select(productListColumns())
    .where("products.id", id)
    .whereNull("products.deleted_at")
    .first();
}

function productListColumns() {
  return [
    "products.id",
    "products.name",
    "products.internal_code as internalCode",
    "products.barcode",
    "products.branch_id as branchId",
    "branches.name as branchName",
    "products.brand_id as brandId",
    "brands.name as brandName",
    "product_groups.name as groupName",
    "products.unit",
    "products.location",
    "products.cost_price as costPrice",
    "products.accessory_expenses as accessoryExpenses",
    "products.other_expenses as otherExpenses",
    "products.sale_price as salePrice",
    "products.profit_margin_percentage as profitMarginPercentage",
    "products.minimum_stock as minimumStock",
    "products.current_stock as currentStock",
    "products.reserved_stock as reservedStock",
    db.raw("products.current_stock - products.reserved_stock as ??", [
      "availableStock",
    ]),
    "products.replenishment_monitor_enabled as replenishmentMonitorEnabled",
    "products.ncm",
    "products.cest",
    "products.cfop",
    "products.icms_cst as icmsCst",
    "products.pis_cst as pisCst",
    "products.cofins_cst as cofinsCst",
    "products.origin",
    "products.description",
    "products.active",
  ];
}
