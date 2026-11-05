import type { Knex } from "knex";
import { db } from "../../database/knex.js";

export type ProductChangeType =
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_STATUS_CHANGED"
  | "PRODUCT_DELETED"
  | "PRODUCT_REPLENISHMENT_CHANGED";

export type ProductFieldChange = {
  before: unknown;
  after: unknown;
};

export type ProductChangeHistory = {
  id: string;
  type: ProductChangeType;
  productId: string;
  productName: string;
  createdByUserId: string | null;
  createdByUserName: string | null;
  description: string;
  changes: Record<string, ProductFieldChange>;
  createdAt: Date;
};

export async function insertProductChange(
  transaction: Knex.Transaction,
  input: {
    productId: string;
    branchId: string;
    createdByUserId: string;
    type: ProductChangeType;
    description: string;
    changes?: Record<string, ProductFieldChange>;
  },
) {
  await transaction("product_change_history").insert({
    product_id: input.productId,
    branch_id: input.branchId,
    created_by_user_id: input.createdByUserId,
    type: input.type,
    description: input.description,
    changes: input.changes ?? {},
  });
}

export async function listProductChanges(filters: {
  branchId: string;
}): Promise<ProductChangeHistory[]> {
  return db("product_change_history")
    .join("products", "products.id", "product_change_history.product_id")
    .leftJoin("users", "users.id", "product_change_history.created_by_user_id")
    .where("product_change_history.branch_id", filters.branchId)
    .select([
      "product_change_history.id",
      "product_change_history.type",
      "product_change_history.product_id as productId",
      "products.name as productName",
      "product_change_history.created_by_user_id as createdByUserId",
      "users.name as createdByUserName",
      "product_change_history.description",
      "product_change_history.changes",
      "product_change_history.created_at as createdAt",
    ])
    .orderBy("product_change_history.created_at", "desc")
    .orderBy("product_change_history.id", "desc");
}
