import {
  createProduct,
  getProductById,
  listLowStockProducts,
  listProducts,
  listProductsPage,
  updateProduct,
  updateProductStatus,
  type ProductCreateInput,
  type ProductListFilters,
  type ProductUpdateInput,
} from "../../models/products/products.model.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function indexProducts(
  filters: ProductListFilters,
  options: { includeMeta?: boolean } = {},
) {
  const products = options.includeMeta
    ? await listProductsPage(filters)
    : await listProducts(filters);

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

export async function indexLowStockProducts(filters: {
  branchId?: string | null;
}) {
  const products = await listLowStockProducts(filters);

  return {
    code: 200,
    status: "success",
    data: products,
  };
}

export async function showProduct(id: string) {
  const product = await getProductById(id);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return {
    code: 200,
    status: "success",
    data: product,
  };
}

export async function replaceProduct(id: string, input: ProductUpdateInput) {
  const product = await updateProduct(id, input);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return {
    code: 200,
    status: "success",
    data: product,
  };
}

export async function changeProductStatus(id: string, active: boolean) {
  const product = await updateProductStatus(id, active);

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return {
    code: 200,
    status: "success",
    data: product,
  };
}
