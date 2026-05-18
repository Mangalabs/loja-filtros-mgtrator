import {
  createProductGroup,
  listProductGroups,
  type ProductGroupCreateInput,
  type ProductGroupListFilters,
} from "../../models/product-groups/product-groups.model.js";

export async function indexProductGroups(filters: ProductGroupListFilters) {
  const groups = await listProductGroups(filters);

  return {
    code: 200,
    status: "success",
    data: groups,
  };
}

export async function storeProductGroup(input: ProductGroupCreateInput) {
  const group = await createProductGroup(input);

  return {
    code: 201,
    status: "success",
    data: group,
  };
}
