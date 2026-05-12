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
