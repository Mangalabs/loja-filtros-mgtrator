import {
  brandHasProductReferences,
  createBrand,
  deleteBrand,
  listBrands,
  updateBrand,
  type BrandCreateInput,
  type BrandListFilters,
  type BrandUpdateInput,
} from "../../models/brands/brands.model.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function indexBrands(filters: BrandListFilters) {
  const brands = await listBrands(filters);

  return {
    code: 200,
    status: "success",
    data: brands,
  };
}

export async function storeBrand(input: BrandCreateInput) {
  const brand = await createBrand(input);

  return {
    code: 201,
    status: "success",
    data: brand,
  };
}

export async function replaceBrand(id: string, input: BrandUpdateInput) {
  const brand = await updateBrand(id, input);

  if (!brand) {
    throw new AppError("Fabricante nao encontrado.", 404);
  }

  return {
    code: 200,
    status: "success",
    data: brand,
  };
}

export async function destroyBrand(id: string) {
  if (await brandHasProductReferences(id)) {
    throw new AppError(
      "Fabricante vinculado a produtos. Inative o cadastro para preservar as associacoes.",
      409,
    );
  }

  const brand = await deleteBrand(id);

  if (!brand) {
    throw new AppError("Fabricante nao encontrado.", 404);
  }

  return {
    code: 200,
    status: "success",
    data: brand,
  };
}
