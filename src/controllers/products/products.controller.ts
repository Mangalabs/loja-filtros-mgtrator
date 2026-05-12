import {
  createProduct,
  listProducts,
  type ProductCreateInput,
  type ProductListFilters,
} from "../../models/products/products.model.js";

export async function indexProducts(filters: ProductListFilters) {
  const products = await listProducts(filters);

  return {
    code: 200,
    status: "success",
    data: products,
  };
}

export async function storeProduct(input: ProductCreateInput) {
  const product = await createProduct(input);

  return {
    code: 201,
    status: "success",
    data: product,
  };
}
