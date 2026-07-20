import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { db } from "../src/database/knex.js";

type ImportOptions = {
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
  expectedFields: string[];
  totals: {
    rows: number;
    accepted: number;
    rejected: number;
    productsCreated: number;
    stockEntriesCreated: number;
    brandsCreated: number;
    suppliersCreated: number;
  };
  rejections: ImportRejection[];
};

const defaultSupplierName = "Importacao inicial de estoque";
const expectedFields = [
  "Nome do produto",
  "Codigo interno",
  "Unidade",
  "Custo",
  "Venda",
  "NCM",
];

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
      "codigo",
      "código",
      "cod interno",
      "cod",
      "internal_code",
    ],
    barcode: [
      "codigo de barras",
      "código de barras",
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
      "valor custo",
      "preco custo",
      "preço custo",
      "cost_price",
    ],
    salePrice: [
      "venda",
      "valor venda",
      "preco venda",
      "preço venda",
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
    minimumStock: ["estoque minimo", "estoque mínimo", "minimum_stock"],
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
  const csvContent = await readCsvFile(filePath);
  const parsedRows = parseCsv(csvContent);
  const { acceptedRows, rejections } = normalizeRows(parsedRows, options);
  const duplicateBarcodeRejections = rejectDuplicatedBarcodes(acceptedRows);
  const cleanRows = acceptedRows.filter(
    (row) =>
      !duplicateBarcodeRejections.some(
        (rejection) => rejection.rowNumber === row.rowNumber,
      ),
  );
  const databaseBarcodeRejections = await rejectExistingBarcodes(cleanRows);
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
    ? await writeImport(rowsToImport, options)
    : {
        brandsCreated: 0,
        productsCreated: 0,
        stockEntriesCreated: 0,
        suppliersCreated: 0,
      };

  const summary: ImportSummary = {
    mode: options.commit ? "commit" : "dry-run",
    file: filePath,
    expectedFields,
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

async function writeImport(rows: StockImportRow[], options: ImportOptions) {
  return db.transaction(async (transaction) => {
    const createdByUserId = options.createdByEmail
      ? await findUserIdByEmail(options.createdByEmail)
      : null;
    const counters = {
      brandsCreated: 0,
      productsCreated: 0,
      stockEntriesCreated: 0,
      suppliersCreated: 0,
    };

    for (const row of rows) {
      const brand = row.brandName
        ? await findOrCreateBrand(transaction, row.brandName)
        : { id: null, created: false };
      const supplier = await findOrCreateSupplier(
        transaction,
        row.supplierName,
      );
      const [product] = await transaction("products")
        .insert({
          name: row.name,
          internal_code: row.internalCode,
          barcode: row.barcode,
          brand_id: brand.id,
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

      if (row.currentStock > 0) {
        await transaction("stock_movements").insert({
          product_id: product.id,
          supplier_id: supplier.id,
          created_by_user_id: createdByUserId,
          type: "ENTRY",
          quantity: row.currentStock,
          unit_cost: row.costPrice,
          notes: `Importacao inicial CSV ${basename(options.filePath)} linha ${row.rowNumber}`,
        });

        await transaction("products").where("id", product.id).update({
          current_stock: row.currentStock,
          updated_at: transaction.fn.now(),
        });

        counters.stockEntriesCreated += 1;
      }

      counters.brandsCreated += brand.created ? 1 : 0;
      counters.suppliersCreated += supplier.created ? 1 : 0;
      counters.productsCreated += 1;
    }

    return counters;
  });
}

async function findOrCreateBrand(
  transaction: Parameters<Parameters<typeof db.transaction>[0]>[0],
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
  transaction: Parameters<Parameters<typeof db.transaction>[0]>[0],
  name: string,
) {
  const existing = await transaction("suppliers")
    .select("id")
    .whereRaw("lower(name) = lower(?)", [name])
    .first();

  if (existing) {
    return { id: existing.id as string, created: false };
  }

  const [supplier] = await transaction("suppliers")
    .insert({ name })
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

async function rejectExistingBarcodes(rows: StockImportRow[]) {
  const barcodes = rows
    .map((row) => row.barcode)
    .filter((barcode): barcode is string => Boolean(barcode));

  if (barcodes.length === 0) {
    return [];
  }

  const existingBarcodes = await db("products")
    .whereIn("barcode", barcodes)
    .pluck<string[]>("barcode");
  const existingBarcodeSet = new Set(existingBarcodes);

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
  const unit = (text(row, "unit") ?? "UN").toUpperCase();
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

  return value?.trim() || null;
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
  const [headers = [], ...dataRows] = rows;
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
    );
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
    .replace(/\s+/g, " ");
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

  if (!filePath) {
    throw new Error(
      "Informe o CSV com --file caminho/estoque.csv. Use --commit para gravar.",
    );
  }

  return {
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
