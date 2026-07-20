import { db } from "../../database/knex.js";

export type ProductListFilters = {
  search?: string;
  active?: boolean;
  branchId?: string | null;
  page: number;
  limit: number;
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
  salePrice: string;
  profitMarginPercentage: string | null;
  minimumStock: string;
  currentStock: string;
  reservedStock: string;
  availableStock: string;
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
  salePrice?: number;
  profitMarginPercentage?: number | null;
  minimumStock?: number;
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
    .modify((query) => {
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

      if (filters.branchId) {
        query.where("products.branch_id", filters.branchId);
      }
    })
    .orderBy("products.name", "asc")
    .limit(filters.limit)
    .offset(offset);

  return rows;
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
    .modify((query) => {
      if (filters.branchId) {
        query.where("products.branch_id", filters.branchId);
      }
    })
    .andWhere("products.minimum_stock", ">", 0)
    .andWhereRaw(
      "products.current_stock - products.reserved_stock <= products.minimum_stock",
    )
    .orderByRaw("products.current_stock - products.reserved_stock asc")
    .orderBy("products.name", "asc");
}

export async function createProduct(
  input: ProductCreateInput,
): Promise<ProductListItem> {
  const [created] = await db("products")
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
      sale_price: input.salePrice,
      profit_margin_percentage: input.profitMarginPercentage,
      minimum_stock: input.minimumStock,
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

  const product = await findProductById(created.id);

  if (!product) {
    throw new Error("Product was not found after creation");
  }

  return product;
}

export async function getProductById(
  id: string,
): Promise<ProductListItem | undefined> {
  return findProductById(id);
}

export async function updateProduct(
  id: string,
  input: ProductUpdateInput,
): Promise<ProductListItem | undefined> {
  const [updated] = await db("products")
    .where("id", id)
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
      sale_price: input.salePrice,
      profit_margin_percentage: input.profitMarginPercentage,
      minimum_stock: input.minimumStock,
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

  return findProductById(updated.id);
}

export async function updateProductStatus(
  id: string,
  active: boolean,
): Promise<ProductListItem | undefined> {
  const [updated] = await db("products")
    .where("id", id)
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

async function findProductById(
  id: string,
): Promise<ProductListItem | undefined> {
  return db("products")
    .leftJoin("branches", "branches.id", "products.branch_id")
    .leftJoin("brands", "brands.id", "products.brand_id")
    .leftJoin("product_groups", "product_groups.id", "products.group_id")
    .select(productListColumns())
    .where("products.id", id)
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
    "products.sale_price as salePrice",
    "products.profit_margin_percentage as profitMarginPercentage",
    "products.minimum_stock as minimumStock",
    "products.current_stock as currentStock",
    "products.reserved_stock as reservedStock",
    db.raw("products.current_stock - products.reserved_stock as ??", [
      "availableStock",
    ]),
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
