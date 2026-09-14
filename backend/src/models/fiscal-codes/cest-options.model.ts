import { db } from "../../database/knex.js";
import {
  businessCestRows,
  officialCestDescriptions,
  type FiscalCodeSeed,
} from "./fiscal-code-business-options.js";

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
    .whereNull("deleted_at")
    .orderBy("cest", "asc")
    .orderBy("name", "asc");

  const normalizedSearch = normalizeSearch(search);

  return buildCestOptions(rows)
    .filter((option) => matchesSearch(option, normalizedSearch))
    .sort((first, second) => first.code.localeCompare(second.code));
}

function buildCestOptions(rows: CestProductRow[]) {
  const grouped = groupProductRows(
    rows.map((row) => ({ code: row.cest, name: row.name })),
  );

  return mergeBusinessRows({
    grouped,
    rows: businessCestRows,
    descriptions: officialCestDescriptions,
    fallbackLabel: "Produtos do cadastro",
  });
}

function groupProductRows(rows: Array<{ code: string; name: string }>) {
  return rows.reduce<Record<string, string[]>>((accumulator, row) => {
    const code = onlyDigits(row.code);

    if (!code) {
      return accumulator;
    }

    return {
      ...accumulator,
      [code]: [...(accumulator[code] ?? []), row.name],
    };
  }, {});
}

function mergeBusinessRows({
  grouped,
  rows,
  descriptions,
  fallbackLabel,
}: {
  grouped: Record<string, string[]>;
  rows: readonly FiscalCodeSeed[];
  descriptions: Record<string, string>;
  fallbackLabel: string;
}) {
  const seededByCode = new Map(rows.map((row) => [row.code, row]));
  const codes = new Set([...seededByCode.keys(), ...Object.keys(grouped)]);

  return Array.from(codes).map((code) => {
    const productNames = grouped[code] ?? [];
    const seed = seededByCode.get(code);
    const sampleProducts =
      productNames.length > 0
        ? productNames.slice(0, sampleLimit)
        : [...(seed?.sampleProducts ?? [])].slice(0, sampleLimit);

    return {
      code,
      label:
        descriptions[code] ?? labelFromProductNames(sampleProducts, fallbackLabel),
      productCount:
        productNames.length > 0 ? productNames.length : (seed?.productCount ?? 0),
      sampleProducts,
    };
  });
}

function labelFromProductNames(productNames: string[], fallbackLabel: string) {
  const firstProduct = productNames[0] ?? fallbackLabel;

  return productNames.length > 1
    ? `${firstProduct} e relacionados`
    : firstProduct;
}

function matchesSearch(option: CestOption, search: string) {
  if (!search) {
    return true;
  }

  return [option.code, option.label, ...option.sampleProducts]
    .map((value) => normalizeSearch(value))
    .some((value) => value.includes(search));
}

function normalizeSearch(value?: string) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}
