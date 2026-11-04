import { db } from "../../database/knex.js";

export type BrandListFilters = {
  active?: boolean;
};

export type Brand = {
  id: string;
  name: string;
  active: boolean;
};

export type BrandCreateInput = {
  name: string;
  active?: boolean;
};

export type BrandUpdateInput = Omit<BrandCreateInput, "active"> & {
  active: boolean;
};

export async function listBrands(filters: BrandListFilters): Promise<Brand[]> {
  return db("brands")
    .select(["id", "name", "active"])
    .modify((query) => {
      if (typeof filters.active === "boolean") {
        query.where("active", filters.active);
      }
    })
    .orderBy("name", "asc");
}

export async function createBrand(input: BrandCreateInput): Promise<Brand> {
  const [brand] = await db("brands")
    .insert({
      name: input.name,
      active: input.active ?? true,
    })
    .returning(["id", "name", "active"]);

  return brand;
}

export async function updateBrand(
  id: string,
  input: BrandUpdateInput,
): Promise<Brand | undefined> {
  const [brand] = await db("brands")
    .where({ id })
    .update({
      name: input.name,
      active: input.active,
      updated_at: db.fn.now(),
    })
    .returning(["id", "name", "active"]);

  return brand;
}

export async function deleteBrand(id: string): Promise<Brand | undefined> {
  const [brand] = await db("brands")
    .where({ id })
    .delete()
    .returning(["id", "name", "active"]);

  return brand;
}
