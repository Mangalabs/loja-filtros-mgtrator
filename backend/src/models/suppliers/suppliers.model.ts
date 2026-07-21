import { db } from "../../database/knex.js";

export type SupplierListFilters = {
  branchId: string;
  search?: string;
  active?: boolean;
};

export type Supplier = {
  id: string;
  branchId: string | null;
  branchName: string | null;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
};

export type SupplierCreateInput = {
  branchId: string;
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  active?: boolean;
};

export async function listSuppliers(
  filters: SupplierListFilters,
): Promise<Supplier[]> {
  return suppliersQuery()
    .where("suppliers.branch_id", filters.branchId)
    .modify((query) => {
      if (filters.search) {
        query.where((builder) => {
          builder
            .whereILike("suppliers.name", `%${filters.search}%`)
            .orWhereILike("suppliers.document", `%${filters.search}%`);
        });
      }

      if (typeof filters.active === "boolean") {
        query.where("suppliers.active", filters.active);
      }
    })
    .orderBy("suppliers.name", "asc");
}

export async function createSupplier(
  input: SupplierCreateInput,
): Promise<Supplier> {
  const [supplier] = await db("suppliers")
    .insert({
      branch_id: input.branchId,
      name: input.name,
      document: input.document,
      email: input.email,
      phone: input.phone,
      active: input.active ?? true,
    })
    .returning("id");

  return findSupplierById(supplier.id);
}

function suppliersQuery() {
  return db("suppliers")
    .leftJoin("branches", "branches.id", "suppliers.branch_id")
    .select<Supplier[]>([
      "suppliers.id",
      "suppliers.branch_id as branchId",
      "branches.name as branchName",
      "suppliers.name",
      "suppliers.document",
      "suppliers.email",
      "suppliers.phone",
      "suppliers.active",
    ]);
}

async function findSupplierById(id: string): Promise<Supplier> {
  const supplier = await suppliersQuery().where("suppliers.id", id).first();

  if (!supplier) {
    throw new Error("Supplier was not found after creation");
  }

  return supplier;
}
