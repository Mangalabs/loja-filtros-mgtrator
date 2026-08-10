import { db } from "../../database/knex.js";

export type CestOption = {
  code: string;
  label: string;
  productCount: number;
  sampleProducts: string[];
};

type CestProductRow = {
  cest: string;
  name: string;
};

const sampleLimit = 3;

export async function listCestOptions({
  branchId,
  search,
}: {
  branchId: string;
  search?: string;
}): Promise<CestOption[]> {
  const rows = await db("products")
    .select<CestProductRow[]>(["cest", "name"])
    .where("branch_id", branchId)
    .whereNotNull("cest")
    .whereNot("cest", "")
    .modify((query) => {
      const normalizedSearch = search?.trim();

      if (!normalizedSearch) {
        return;
      }

      query.andWhere((builder) => {
        builder
          .whereILike("cest", `%${normalizedSearch}%`)
          .orWhereILike("name", `%${normalizedSearch}%`);
      });
    })
    .orderBy("cest", "asc")
    .orderBy("name", "asc");

  return buildCestOptions(rows);
}

function buildCestOptions(rows: CestProductRow[]) {
  const grouped = rows.reduce<Record<string, string[]>>(
    (accumulator, row) => ({
      ...accumulator,
      [row.cest]: [...(accumulator[row.cest] ?? []), row.name],
    }),
    {},
  );

  return Object.entries(grouped).map(([code, productNames]) => ({
    code,
    label: labelFromProductNames(productNames),
    productCount: productNames.length,
    sampleProducts: productNames.slice(0, sampleLimit),
  }));
}

function labelFromProductNames(productNames: string[]) {
  const firstProduct = productNames[0] ?? "Produtos do cadastro";

  return productNames.length > 1
    ? `${firstProduct} e relacionados`
    : firstProduct;
}
