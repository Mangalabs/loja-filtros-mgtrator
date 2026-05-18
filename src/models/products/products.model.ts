import { db } from "../../database/knex.js";

export type ProductListFilters = {
  search?: string;
  active?: boolean;
  page: number;
  limit: number;
};

export type ProductListItem = {
  id: string;
  name: string;
  internalCode: string | null;
  barcode: string | null;
  brandName: string | null;
  groupName: string | null;
  unit: string;
  costPrice: string;
  salePrice: string;
  minimumStock: string;
  active: boolean;
};

export type ProductCreateInput = {
  name: string;
  internalCode?: string;
  barcode?: string;
  brandId?: string;
  groupId?: string;
  unit?: string;
  costPrice?: number;
  salePrice?: number;
  minimumStock?: number;
  ncm?: string;
  cest?: string;
  origin?: string;
  description?: string;
  active?: boolean;
};

export type ProductUpdateInput = Partial<ProductCreateInput>;

export async function listProducts(filters: ProductListFilters): Promise<ProductListItem[]> {
  const offset = (filters.page - 1) * filters.limit;

  const rows = await db("products")
    .leftJoin("brands", "brands.id", "products.brand_id")
    .leftJoin("product_groups", "product_groups.id", "products.group_id")
    .select([
      "products.id",
      "products.name",
      "products.internal_code as internalCode",
      "products.barcode",
      "brands.name as brandName",
      "product_groups.name as groupName",
      "products.unit",
      "products.cost_price as costPrice",
      "products.sale_price as salePrice",
      "products.minimum_stock as minimumStock",
      "products.active",
    ])
    .modify((query) => {
      if (filters.search) {
        query.where((builder) => {
          builder
            .whereILike("products.name", `%${filters.search}%`)
            .orWhereILike("products.internal_code", `%${filters.search}%`)
            .orWhereILike("products.barcode", `%${filters.search}%`);
        });
      }

      if (typeof filters.active === "boolean") {
        query.where("products.active", filters.active);
      }
    })
    .orderBy("products.name", "asc")
    .limit(filters.limit)
    .offset(offset);

  return rows;
}

export async function createProduct(input: ProductCreateInput): Promise<ProductListItem> {
  const [created] = await db("products")
    .insert({
      name: input.name,
      internal_code: input.internalCode,
      barcode: input.barcode,
      brand_id: input.brandId,
      group_id: input.groupId,
      unit: input.unit,
      cost_price: input.costPrice,
      sale_price: input.salePrice,
      minimum_stock: input.minimumStock,
      ncm: input.ncm,
      cest: input.cest,
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

export async function getProductById(id: string): Promise<ProductListItem | undefined> {
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
      brand_id: input.brandId,
      group_id: input.groupId,
      unit: input.unit,
      cost_price: input.costPrice,
      sale_price: input.salePrice,
      minimum_stock: input.minimumStock,
      ncm: input.ncm,
      cest: input.cest,
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

async function findProductById(id: string): Promise<ProductListItem | undefined> {
  return db("products")
    .leftJoin("brands", "brands.id", "products.brand_id")
    .leftJoin("product_groups", "product_groups.id", "products.group_id")
    .select([
      "products.id",
      "products.name",
      "products.internal_code as internalCode",
      "products.barcode",
      "brands.name as brandName",
      "product_groups.name as groupName",
      "products.unit",
      "products.cost_price as costPrice",
      "products.sale_price as salePrice",
      "products.minimum_stock as minimumStock",
      "products.active",
    ])
    .where("products.id", id)
    .first();
}
