import { db } from "../../database/knex.js";

export type SupplierListFilters = {
  search?: string;
  active?: boolean;
};

export type Supplier = {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
};

export type SupplierCreateInput = {
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  active?: boolean;
};

export async function listSuppliers(filters: SupplierListFilters): Promise<Supplier[]> {
  return db("suppliers")
    .select(["id", "name", "document", "email", "phone", "active"])
    .modify((query) => {
      if (filters.search) {
        query.where((builder) => {
          builder
            .whereILike("name", `%${filters.search}%`)
            .orWhereILike("document", `%${filters.search}%`);
        });
      }

      if (typeof filters.active === "boolean") {
        query.where("active", filters.active);
      }
    })
    .orderBy("name", "asc");
}

export async function createSupplier(input: SupplierCreateInput): Promise<Supplier> {
  const [supplier] = await db("suppliers")
    .insert({
      name: input.name,
      document: input.document,
      email: input.email,
      phone: input.phone,
      active: input.active,
    })
    .returning(["id", "name", "document", "email", "phone", "active"]);

  return supplier;
}
