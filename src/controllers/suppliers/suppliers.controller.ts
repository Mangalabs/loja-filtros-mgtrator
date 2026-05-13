import {
  createSupplier,
  listSuppliers,
  type SupplierCreateInput,
  type SupplierListFilters,
} from "../../models/suppliers/suppliers.model.js";

export async function indexSuppliers(filters: SupplierListFilters) {
  const suppliers = await listSuppliers(filters);

  return {
    code: 200,
    status: "success",
    data: suppliers,
  };
}

export async function storeSupplier(input: SupplierCreateInput) {
  const supplier = await createSupplier(input);

  return {
    code: 201,
    status: "success",
    data: supplier,
  };
}
