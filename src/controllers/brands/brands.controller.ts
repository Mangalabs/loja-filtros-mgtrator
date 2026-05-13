import {
  createBrand,
  listBrands,
  type BrandCreateInput,
  type BrandListFilters,
} from "../../models/brands/brands.model.js";

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
