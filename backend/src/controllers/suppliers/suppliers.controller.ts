import {
  createSupplier,
  deleteSupplier,
  listSuppliers,
  supplierHasOperationalReferences,
  updateSupplier,
  type SupplierCreateInput,
  type SupplierListFilters,
  type SupplierUpdateInput,
} from "../../models/suppliers/suppliers.model.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function indexSuppliers(filters: SupplierListFilters) {
  const suppliers = await listSuppliers(filters);

  return {
    code: 200,
    status: "success",
    data: suppliers,
  };
}

export async function storeSupplier(
  input: Omit<SupplierCreateInput, "branchId">,
  branchId: string,
) {
  const supplier = await createSupplier({ ...input, branchId });

  return {
    code: 201,
    status: "success",
    data: supplier,
  };
}

export async function replaceSupplier(
  id: string,
  input: Omit<SupplierUpdateInput, "branchId">,
  branchId: string,
) {
  const supplier = await updateSupplier(id, branchId, { ...input, branchId });

  if (!supplier) {
    throw new AppError("Fornecedor nao encontrado.", 404);
  }

  return {
    code: 200,
    status: "success",
    data: supplier,
  };
}

export async function destroySupplier(id: string, branchId: string) {
  if (await supplierHasOperationalReferences(id, branchId)) {
    throw new AppError(
      "Fornecedor possui produtos ou movimentacoes vinculadas. Inative o cadastro para preservar o historico.",
      409,
    );
  }

  const supplier = await deleteSupplier(id, branchId);

  if (!supplier) {
    throw new AppError("Fornecedor nao encontrado.", 404);
  }

  return {
    code: 200,
    status: "success",
    data: supplier,
  };
}
