import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import type { Knex } from "knex";
import { db } from "../src/database/knex.js";

type ImportOptions = {
  branchCode?: string;
  branchId?: string;
  commit: boolean;
  createdByEmail?: string;
  defaultSupplierName: string;
  filePath: string;
  reportPath?: string;
};

type CsvRow = Record<string, string>;

type StockImportRow = {
  rowNumber: number;
  name: string;
  internalCode: string | null;
  barcode: string | null;
  brandName: string | null;
  supplierName: string;
  unit: string;
  location: string | null;
  costPrice: number;
  salePrice: number;
  profitMarginPercentage: number | null;
  currentStock: number;
  minimumStock: number;
  ncm: string | null;
  cest: string | null;
  cfop: string | null;
  icmsCst: string | null;
  pisCst: string | null;
  cofinsCst: string | null;
  origin: string | null;
  description: string | null;
};

type ImportRejection = {
  rowNumber: number;
  reason: string;
  row: CsvRow;
};

type ImportSummary = {
  mode: "commit" | "dry-run";
  file: string;
  layout: ImportLayout;
  branch: {
    id: string;
    name: string;
    code: string | null;
  };
  expectedFields: string[];
  unitMappings: Record<string, string>;
  totals: {
    rows: number;
    accepted: number;
    rejected: number;
    productsCreated: number;
    productsUpdated: number;
    stockEntriesCreated: number;
    stockAdjustmentsCreated: number;
    brandsCreated: number;
    suppliersCreated: number;
  };
  rejections: ImportRejection[];
};

type ImportLayout = "legacy-basic" | "fiscal-stock" | "custom";

const defaultSupplierName = "Importacao inicial de estoque";
const expectedFieldsByLayout: Record<ImportLayout, string[]> = {
  "legacy-basic": [
    "Cód. interno",
    "Nome",
    "Unidade",
    "Estoque",
    "Custo unit.",
    "Valor venda",
  ],
  "fiscal-stock": [
    "Cód. interno",
    "Nome",
    "Valor de custo",
    "NCM",
    "CEST",
    "Estoque",
    "LOCAÇÃO",
    "FABRICANTE",
    "Vr. MG SÃO LUIS-MA",
  ],
  custom: [
    "Nome",
    "Cód. interno",
    "Estoque",
    "Custo",
    "Venda",
    "NCM",
    "CEST",
    "LOCAÇÃO",
    "FABRICANTE",
  ],
};
const unitMappings: Record<string, string> = {
  BD: "UN",
  JG: "KIT",
  PAR: "CJ",
  PC: "UN",
};

const fieldAliases: Record<keyof Omit<StockImportRow, "rowNumber">, string[]> =
  {
    name: [
      "nome do produto",
      "produto",
      "nome",
      "descricao",
      "descrição",
      "title",
      "name",
    ],
    internalCode: [
      "codigo interno",
      "código interno",
      "cod. interno",
      "cód. interno",
      "codigo",
      "código",
      "cod interno",
      "cod",
      "internal_code",
    ],
    barcode: [
      "codigo de barras",
      "código de barras",
      "cod. barra",
      "cod barras",
      "ean",
      "barcode",
      "gtin",
    ],
    brandName: ["fabricante", "marca", "brand"],
    supplierName: ["fornecedor", "supplier"],
    unit: ["unidade", "un", "unit"],
    location: ["locacao", "locação", "localizacao", "localização", "location"],
    costPrice: [
      "custo",
      "custo unit.",
      "custo unitario",
      "custo unitário",
      "valor custo",
      "valor de custo",
      "preco custo",
      "preço custo",
      "cost_price",
    ],
    salePrice: [
      "venda",
      "valor venda",
      "preco venda",
      "preço venda",
      "vr. mg sao luis-ma",
      "vr. mg são luis-ma",
      "vr mg sao luis ma",
      "vr mg são luis ma",
      "sale_price",
    ],
    profitMarginPercentage: [
      "margem",
      "margem lucro",
      "percentual lucro",
      "profit_margin_percentage",
    ],
    currentStock: [
      "estoque",
      "estoque atual",
      "saldo",
      "quantidade",
      "current_stock",
    ],
    minimumStock: [
      "estoque minimo",
      "estoque mínimo",
      "estoque min.",
      "minimum_stock",
    ],
    ncm: ["ncm"],
    cest: ["cest"],
    cfop: ["cfop"],
    icmsCst: ["icms cst", "cst icms", "icms_cst"],
    pisCst: ["pis cst", "cst pis", "pis_cst"],
    cofinsCst: ["cofins cst", "cst cofins", "cofins_cst"],
    origin: ["origem", "origin"],
    description: [
      "descricao comercial",
      "descrição comercial",
      "descricao orcamento",
      "descrição orçamento",
      "description",
    ],
  };

const validUnits = new Set(["UN", "KIT", "CJ"]);

const options = parseOptions(process.argv.slice(2));

const summary = await importStockCsv(options);

console.log(JSON.stringify(summary, null, 2));
await db.destroy();

async function importStockCsv(options: ImportOptions): Promise<ImportSummary> {
  const filePath = resolve(options.filePath);
  const branch = await resolveImportBranch(options);
  const csvContent = await readCsvFile(filePath);
  const parsedRows = parseCsv(csvContent);
  const layout = detectImportLayout(parsedRows);
  const { acceptedRows, rejections } = normalizeRows(parsedRows, options);
  const duplicateBarcodeRejections = rejectDuplicatedBarcodes(acceptedRows);
  const cleanRows = acceptedRows.filter(
    (row) =>
      !duplicateBarcodeRejections.some(
        (rejection) => rejection.rowNumber === row.rowNumber,
      ),
  );
  const databaseBarcodeRejections = await rejectExistingBarcodes(
    cleanRows,
    branch.id,
  );
  const rowsToImport = cleanRows.filter(
    (row) =>
      !databaseBarcodeRejections.some(
        (rejection) => rejection.rowNumber === row.rowNumber,
      ),
  );
  const allRejections = [
    ...rejections,
    ...duplicateBarcodeRejections,
    ...databaseBarcodeRejections,
  ].sort((left, right) => left.rowNumber - right.rowNumber);

  const writeResult = options.commit
    ? await writeImport(rowsToImport, options, branch.id)
    : {
        brandsCreated: 0,
        productsCreated: 0,
        productsUpdated: 0,
        stockEntriesCreated: 0,
        stockAdjustmentsCreated: 0,
        suppliersCreated: 0,
      };

  const summary: ImportSummary = {
    mode: options.commit ? "commit" : "dry-run",
    file: filePath,
    layout,
    branch,
    expectedFields: expectedFieldsByLayout[layout],
    unitMappings,
    totals: {
      rows: parsedRows.length,
      accepted: rowsToImport.length,
      rejected: allRejections.length,
      ...writeResult,
    },
    rejections: allRejections,
  };

  await writeReport(options.reportPath, summary);

  return summary;
}

async function writeImport(
  rows: StockImportRow[],
  options: ImportOptions,
  branchId: string,
) {
  return db.transaction(async (transaction) => {
    const createdByUserId = options.createdByEmail
      ? await findUserIdByEmail(options.createdByEmail)
      : null;
    const counters = {
      brandsCreated: 0,
      productsCreated: 0,
      productsUpdated: 0,
      stockEntriesCreated: 0,
      stockAdjustmentsCreated: 0,
      suppliersCreated: 0,
    };

    for (const row of rows) {
      const brand = row.brandName
        ? await findOrCreateBrand(transaction, row.brandName)
        : { id: null, created: false };
      const supplier = await findOrCreateSupplier(
        transaction,
        row.supplierName,
        branchId,
      );
      const existingProduct = await findImportProduct(
        transaction,
        row,
        branchId,
        brand.id,
      );
      const product = existingProduct
        ? await updateImportProduct(
            transaction,
            existingProduct.id,
            row,
            branchId,
            brand.id,
          )
        : await createImportProduct(transaction, row, branchId, brand.id);

      await transaction("product_suppliers")
        .insert({
          product_id: product.id,
          supplier_id: supplier.id,
          last_cost_price: row.costPrice,
        })
        .onConflict(["product_id", "supplier_id"])
        .merge({
          last_cost_price: row.costPrice,
          updated_at: transaction.fn.now(),
        });

      if (!existingProduct && row.currentStock > 0) {
        await insertInitialStockEntry(
          transaction,
          product.id,
          supplier.id,
          row,
          options,
          createdByUserId,
        );

        counters.stockEntriesCreated += 1;
      }

      if (existingProduct) {
        const stockDifference =
          row.currentStock - Number(existingProduct.current_stock ?? 0);

        if (stockDifference !== 0) {
          await insertStockBalanceAdjustment(
            transaction,
            product.id,
            stockDifference,
            row,
            options,
            createdByUserId,
          );

          counters.stockAdjustmentsCreated += 1;
        }
      }

      await transaction("products").where("id", product.id).update({
        current_stock: row.currentStock,
        updated_at: transaction.fn.now(),
      });

      counters.brandsCreated += brand.created ? 1 : 0;
      counters.suppliersCreated += supplier.created ? 1 : 0;
      counters.productsCreated += existingProduct ? 0 : 1;
      counters.productsUpdated += existingProduct ? 1 : 0;
    }

    return counters;
  });
}

async function createImportProduct(
  transaction: Knex.Transaction,
  row: StockImportRow,
  branchId: string,
  brandId: string | null,
) {
  const [product] = await transaction("products")
    .insert({
      name: row.name,
      internal_code: row.internalCode,
      barcode: row.barcode,
      branch_id: branchId,
      brand_id: brandId,
      unit: row.unit,
      location: row.location,
      cost_price: row.costPrice,
      sale_price: row.salePrice,
      profit_margin_percentage: row.profitMarginPercentage,
      minimum_stock: row.minimumStock,
      ncm: row.ncm,
      cest: row.cest,
      cfop: row.cfop,
      icms_cst: row.icmsCst,
      pis_cst: row.pisCst,
      cofins_cst: row.cofinsCst,
      origin: row.origin,
      description: row.description,
      active: true,
    })
    .returning("id");

  return { id: product.id as string };
}

async function updateImportProduct(
  transaction: Knex.Transaction,
  productId: string,
  row: StockImportRow,
  branchId: string,
  brandId: string | null,
) {
  const [product] = await transaction("products")
    .where("id", productId)
    .update({
      name: row.name,
      internal_code: row.internalCode,
      barcode: row.barcode,
      branch_id: branchId,
      brand_id: brandId,
      unit: row.unit,
      location: row.location,
      cost_price: row.costPrice,
      sale_price: row.salePrice,
      profit_margin_percentage: row.profitMarginPercentage,
      minimum_stock: row.minimumStock,
      ncm: row.ncm,
      cest: row.cest,
      cfop: row.cfop,
      icms_cst: row.icmsCst,
      pis_cst: row.pisCst,
      cofins_cst: row.cofinsCst,
      origin: row.origin,
      description: row.description,
      active: true,
      updated_at: transaction.fn.now(),
    })
    .returning("id");

  return { id: product.id as string };
}

async function insertInitialStockEntry(
  transaction: Knex.Transaction,
  productId: string,
  supplierId: string,
  row: StockImportRow,
  options: ImportOptions,
  createdByUserId: string | null,
) {
  await transaction("stock_movements").insert({
    product_id: productId,
    supplier_id: supplierId,
    created_by_user_id: createdByUserId,
    type: "ENTRY",
    quantity: row.currentStock,
    unit_cost: row.costPrice,
    notes: `Importacao inicial CSV ${basename(options.filePath)} linha ${row.rowNumber}`,
  });
}

async function insertStockBalanceAdjustment(
  transaction: Knex.Transaction,
  productId: string,
  quantity: number,
  row: StockImportRow,
  options: ImportOptions,
  createdByUserId: string | null,
) {
  await transaction("stock_movements").insert({
    product_id: productId,
    created_by_user_id: createdByUserId,
    type: "ADJUSTMENT",
    quantity,
    notes: `Ajuste por reimportacao CSV ${basename(options.filePath)} linha ${row.rowNumber}`,
  });
}

async function findImportProduct(
  transaction: Knex.Transaction,
  row: StockImportRow,
  branchId: string,
  brandId: string | null,
) {
  const barcodeProduct = row.barcode
    ? await transaction("products")
        .select(["id", "branch_id", "current_stock"])
        .where("barcode", row.barcode)
        .first()
    : null;

  if (barcodeProduct) {
    return barcodeProduct as {
      id: string;
      branch_id: string | null;
      current_stock: string;
    };
  }

  return transaction("products")
    .select(["id", "branch_id", "current_stock"])
    .where("branch_id", branchId)
    .whereRaw("lower(name) = lower(?)", [row.name])
    .modify((query) => {
      row.internalCode
        ? query.where("internal_code", row.internalCode)
        : query.whereNull("internal_code");
      brandId ? query.where("brand_id", brandId) : query.whereNull("brand_id");
    })
    .first();
}

async function findOrCreateBrand(
  transaction: Knex.Transaction,
  name: string,
) {
  const existing = await transaction("brands")
    .select("id")
    .whereRaw("lower(name) = lower(?)", [name])
    .first();

  if (existing) {
    return { id: existing.id as string, created: false };
  }

  const [brand] = await transaction("brands").insert({ name }).returning("id");

  return { id: brand.id as string, created: true };
}

async function findOrCreateSupplier(
  transaction: Knex.Transaction,
  name: string,
  branchId: string,
) {
  const existing = await transaction("suppliers")
    .select("id")
    .whereRaw("lower(name) = lower(?)", [name])
    .where("branch_id", branchId)
    .first();

  if (existing) {
    return { id: existing.id as string, created: false };
  }

  const [supplier] = await transaction("suppliers")
    .insert({ name, branch_id: branchId })
    .returning("id");

  return { id: supplier.id as string, created: true };
}

async function findUserIdByEmail(email: string) {
  const user = await db("users")
    .select("id")
    .whereRaw("lower(email) = lower(?)", [email])
    .first();

  if (!user) {
    throw new Error(`Usuario informado em --created-by-email nao encontrado.`);
  }

  return user.id as string;
}

async function resolveImportBranch(options: ImportOptions) {
  const query = db("branches")
    .select(["id", "name", "code"])
    .where("active", true)
    .first();

  const branch = await applyBranchLookup(query, options);

  if (!branch) {
    throw new Error(
      "Filial nao encontrada. Informe uma filial ativa com --branch-code CODIGO ou --branch-id UUID.",
    );
  }

  return {
    id: branch.id as string,
    name: branch.name as string,
    code: (branch.code as string | null) ?? null,
  };
}

function applyBranchLookup(
  query: ReturnType<typeof db>,
  options: ImportOptions,
) {
  const lookups = [
    {
      enabled: Boolean(options.branchId),
      apply: () => query.where("id", options.branchId),
    },
    {
      enabled: Boolean(options.branchCode),
      apply: () =>
        query.whereRaw("lower(code) = lower(?)", [options.branchCode]),
    },
  ];
  const lookup = lookups.find((lookup) => lookup.enabled);

  return lookup?.apply() ?? Promise.resolve(undefined);
}

async function rejectExistingBarcodes(rows: StockImportRow[], branchId: string) {
  const barcodes = rows
    .map((row) => row.barcode)
    .filter((barcode): barcode is string => Boolean(barcode));

  if (barcodes.length === 0) {
    return [];
  }

  const existingBarcodes = await db("products")
    .select(["barcode", "branch_id"])
    .whereIn("barcode", barcodes)
    .whereNot("branch_id", branchId);
  const existingBarcodeSet = new Set(
    existingBarcodes.map((product) => product.barcode as string),
  );

  return rows
    .filter((row) => row.barcode && existingBarcodeSet.has(row.barcode))
    .map((row) => ({
      rowNumber: row.rowNumber,
      reason: `Codigo de barras ja existe no banco: ${row.barcode}`,
      row: {},
    }));
}

function rejectDuplicatedBarcodes(rows: StockImportRow[]) {
  const barcodeRows = rows.reduce<Record<string, number[]>>((groups, row) => {
    return row.barcode
      ? {
          ...groups,
          [row.barcode]: [...(groups[row.barcode] ?? []), row.rowNumber],
        }
      : groups;
  }, {});

  return Object.entries(barcodeRows)
    .filter(([, rowNumbers]) => rowNumbers.length > 1)
    .flatMap(([barcode, rowNumbers]) =>
      rowNumbers.map((rowNumber) => ({
        rowNumber,
        reason: `Codigo de barras duplicado no CSV: ${barcode}`,
        row: {},
      })),
    );
}

function detectImportLayout(rows: CsvRow[]): ImportLayout {
  const headers = new Set(Object.keys(rows[0] ?? {}));
  const hasLegacyFields = hasHeaderFields(headers, [
    "Cód. interno",
    "Nome",
    "Unidade",
    "Custo unit.",
    "Valor venda",
  ]);
  const hasFiscalStockFields = hasHeaderFields(headers, [
    "Cód. interno",
    "Nome",
    "Valor de custo",
    "NCM",
    "CEST",
    "LOCAÇÃO",
    "FABRICANTE",
    "Vr. MG SÃO LUIS-MA",
  ]);
  const layouts = [
    {
      matched: hasFiscalStockFields,
      name: "fiscal-stock" as const,
    },
    {
      matched: hasLegacyFields,
      name: "legacy-basic" as const,
    },
  ];

  return layouts.find((layout) => layout.matched)?.name ?? "custom";
}

function hasHeaderFields(headers: Set<string>, labels: string[]) {
  return labels.every((label) => headers.has(normalizeHeader(label)));
}

function normalizeRows(rows: CsvRow[], options: ImportOptions) {
  return rows.reduce<{
    acceptedRows: StockImportRow[];
    rejections: ImportRejection[];
  }>(
    (result, row, index) => {
      const rowNumber = index + 2;
      const normalizedRow = normalizeRow(row, rowNumber, options);

      return normalizedRow.ok
        ? {
            ...result,
            acceptedRows: [...result.acceptedRows, normalizedRow.data],
          }
        : {
            ...result,
            rejections: [
              ...result.rejections,
              {
                rowNumber,
                reason: normalizedRow.reason,
                row,
              },
            ],
          };
    },
    { acceptedRows: [], rejections: [] },
  );
}

function normalizeRow(row: CsvRow, rowNumber: number, options: ImportOptions) {
  const name = text(row, "name");
  const rawUnit = (text(row, "unit") ?? "UN").toUpperCase();
  const unit = unitMappings[rawUnit] ?? rawUnit;
  const costPrice = requiredNumber(row, "costPrice");
  const salePrice = requiredNumber(row, "salePrice");
  const currentStock = optionalNumber(row, "currentStock") ?? 0;
  const minimumStock = optionalNumber(row, "minimumStock") ?? 0;
  const profitMarginPercentage = optionalNumber(row, "profitMarginPercentage");

  const invalidReason =
    requiredTextReason("Produto", name) ??
    invalidUnitReason(unit) ??
    requiredNumberReason("Custo", costPrice) ??
    requiredNumberReason("Venda", salePrice) ??
    requiredNumberReason("Estoque minimo", minimumStock) ??
    invalidProfitMarginReason(profitMarginPercentage);

  if (invalidReason) {
    return { ok: false as const, reason: invalidReason };
  }

  return {
    ok: true as const,
    data: {
      rowNumber,
      name,
      internalCode: text(row, "internalCode"),
      barcode: text(row, "barcode"),
      brandName: text(row, "brandName"),
      supplierName: text(row, "supplierName") ?? options.defaultSupplierName,
      unit,
      location: text(row, "location"),
      costPrice,
      salePrice,
      profitMarginPercentage,
      currentStock,
      minimumStock,
      ncm: onlyDigits(text(row, "ncm")),
      cest: onlyDigits(text(row, "cest")),
      cfop: onlyDigits(text(row, "cfop")),
      icmsCst: onlyDigits(text(row, "icmsCst")),
      pisCst: onlyDigits(text(row, "pisCst")),
      cofinsCst: onlyDigits(text(row, "cofinsCst")),
      origin: onlyDigits(text(row, "origin")),
      description: text(row, "description"),
    },
  };
}

function text(row: CsvRow, field: keyof typeof fieldAliases) {
  const value = fieldAliases[field]
    .map((alias) => row[normalizeHeader(alias)])
    .find((value) => value?.trim());

  return nullableText(value);
}

function requiredNumber(row: CsvRow, field: keyof typeof fieldAliases) {
  const value = text(row, field);

  return value ? numberFromText(value) : null;
}

function optionalNumber(row: CsvRow, field: keyof typeof fieldAliases) {
  const value = text(row, field);

  return value ? numberFromText(value) : null;
}

function numberFromText(value: string) {
  const normalized = value
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function onlyDigits(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits || null;
}

function requiredTextReason(label: string, value: string | null) {
  return value ? null : `${label} e obrigatorio.`;
}

function requiredNumberReason(label: string, value: number | null) {
  return value !== null && Number.isFinite(value) && value >= 0
    ? null
    : `${label} precisa ser maior ou igual a zero.`;
}

function invalidUnitReason(unit: string) {
  return validUnits.has(unit)
    ? null
    : `Unidade invalida: ${unit}. Use UN, KIT ou CJ.`;
}

function invalidProfitMarginReason(value: number | null) {
  return value === null || (Number.isFinite(value) && value >= 0 && value <= 1000)
    ? null
    : "Margem de lucro precisa estar entre 0 e 1000.";
}

function parseCsv(content: string): CsvRow[] {
  const rows = parseCsvRows(content);
  const headerRowIndex = findHeaderRowIndex(rows);
  const headers = rows[headerRowIndex] ?? [];
  const dataRows = rows.slice(headerRowIndex + 1);
  const normalizedHeaders = headers.map(normalizeHeader);

  return dataRows
    .filter((row) => row.some((value) => value.trim()))
    .map((row) =>
      normalizedHeaders.reduce<CsvRow>(
        (record, header, index) => ({
          ...record,
          [header]: row[index]?.trim() ?? "",
        }),
        {},
      ),
    )
    .filter((row) => !isReportFooterRow(row));
}

function findHeaderRowIndex(rows: string[][]) {
  const headerRowIndex = rows.findIndex((row) => {
    const normalizedHeaders = new Set(row.map(normalizeHeader));
    return ["name", "internalCode", "costPrice", "salePrice"].every((field) =>
      fieldAliases[field as keyof typeof fieldAliases].some((alias) =>
        normalizedHeaders.has(normalizeHeader(alias)),
      ),
    );
  });

  return headerRowIndex >= 0 ? headerRowIndex : 0;
}

function parseCsvRows(content: string) {
  const delimiter = detectDelimiter(content);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let insideQuotes = false;

  for (const character of content.replace(/^\uFEFF/, "")) {
    const isQuote = character === '"';
    const isDelimiter = character === delimiter && !insideQuotes;
    const isLineBreak = ["\n", "\r"].includes(character) && !insideQuotes;

    if (isQuote) {
      insideQuotes = !insideQuotes;
    }

    if (isDelimiter) {
      currentRow.push(currentValue);
      currentValue = "";
    }

    if (isLineBreak) {
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
    }

    if (!isQuote && !isDelimiter && !isLineBreak) {
      currentValue += character;
    }
  }

  if (currentValue || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((value) => value.trim()));
}

function detectDelimiter(content: string) {
  const firstLine = content.split(/\r?\n/)[0] ?? "";
  const semicolonCount = firstLine.split(";").length;
  const commaCount = firstLine.split(",").length;

  return semicolonCount >= commaCount ? ";" : ",";
}

function normalizeHeader(header: string) {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ");
}

function nullableText(value: string | undefined) {
  const trimmed = value?.trim();
  const emptyValues = new Set(["", "-", "--", "---", "------"]);

  return trimmed && !emptyValues.has(trimmed) ? trimmed : null;
}

function isReportFooterRow(row: CsvRow) {
  const internalCode = normalizeHeader(row[normalizeHeader("cod. interno")] ?? "");
  const name = row[normalizeHeader("nome")]?.trim() ?? "";
  const footerMarkers = new Set([
    "totais",
    "quantidade:",
    "custo total:",
    "valores de venda",
    "total valor venda:",
  ]);

  return !name && footerMarkers.has(internalCode);
}

async function readCsvFile(filePath: string) {
  const { readFile } = await import("node:fs/promises");
  return readFile(filePath, "utf8");
}

async function writeReport(
  reportPath: string | undefined,
  summary: ImportSummary,
) {
  if (!reportPath) {
    return;
  }

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(summary, null, 2));
}

function parseOptions(args: string[]): ImportOptions {
  const values = args.reduce<Record<string, string | boolean>>(
    (parsed, argument, index) => {
      if (!argument.startsWith("--")) {
        return parsed;
      }

      const [key, inlineValue] = argument.slice(2).split("=");
      const nextValue = args[index + 1];
      const value =
        inlineValue ??
        (nextValue && !nextValue.startsWith("--") ? nextValue : true);

      return {
        ...parsed,
        [key]: value,
      };
    },
    {},
  );
  const filePath = stringOption(values.file);
  const branchCode = stringOption(values["branch-code"]);
  const branchId = stringOption(values["branch-id"]);

  if (!filePath) {
    throw new Error(
      "Informe o CSV com --file caminho/estoque.csv. Use --commit para gravar.",
    );
  }

  if (!branchCode && !branchId) {
    throw new Error(
      "Informe a filial de destino com --branch-code CODIGO ou --branch-id UUID.",
    );
  }

  return {
    branchCode,
    branchId,
    commit: values.commit === true || values.commit === "true",
    createdByEmail: stringOption(values["created-by-email"]),
    defaultSupplierName:
      stringOption(values["default-supplier"]) ?? defaultSupplierName,
    filePath,
    reportPath: stringOption(values.report),
  };
}

function stringOption(value: string | boolean | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
