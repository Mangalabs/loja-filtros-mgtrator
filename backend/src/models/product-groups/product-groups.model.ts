import { db } from "../../database/knex.js";

export type ProductGroupListFilters = {
  active?: boolean;
};

export type ProductGroup = {
  id: string;
  name: string;
  active: boolean;
};

export type ProductGroupCreateInput = {
  name: string;
  active?: boolean;
};

export async function listProductGroups(
  filters: ProductGroupListFilters,
): Promise<ProductGroup[]> {
  return db("product_groups")
    .select(["id", "name", "active"])
    .modify((query) => {
      if (typeof filters.active === "boolean") {
        query.where("active", filters.active);
      }
    })
    .orderBy("name", "asc");
}

export async function createProductGroup(
  input: ProductGroupCreateInput,
): Promise<ProductGroup> {
  const [group] = await db("product_groups")
    .insert({
      name: input.name,
      active: input.active ?? true,
    })
    .returning(["id", "name", "active"]);

  return group;
}
