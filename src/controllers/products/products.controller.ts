import {
  listProducts,
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
