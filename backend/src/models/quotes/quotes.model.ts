import type { Knex } from "knex";
import { db } from "../../database/knex.js";

export type QuoteItemInput = {
  productId: string;
  description?: string | null;
  quantity: number;
  unitPrice?: number | null;
};

export type QuoteInput = {
  clientId: string;
  validUntil?: string | null;
  notes?: string | null;
  items: QuoteItemInput[];
};

export type QuoteItem = {
  id: string;
  productId: string;
  productInternalCode: string | null;
  productName: string;
  productBrandName: string | null;
  productNcm: string | null;
  productAvailableStock: string;
  description: string;
  quantity: string;
  unitPrice: string;
  totalAmount: string;
  position: number;
};

export type Quote = {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  clientDocument: string | null;
  clientEmail: string | null;
  status: "DRAFT";
  totalAmount: string;
  validUntil: string | null;
  notes: string | null;
  shippingOrderId: string | null;
  shippingOrderStatus: "QUOTED" | "APPROVED" | "SEPARATED" | "CANCELLED" | "COMPLETED" | null;
  createdByUserName: string;
  createdByUserEmail: string;
  createdByUserPhone: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: QuoteItem[];
};

type QuoteProduct = {
  id: string;
  name: string;
  description: string | null;
  salePrice: string;
  active: boolean;
};

type QuoteRow = Omit<Quote, "items">;
type QuoteItemRow = QuoteItem & {
  quoteId: string;
};

const quoteColumns = [
  "quotes.id",
  "quotes.client_id as clientId",
  "clients.name as clientName",
  "clients.phone as clientPhone",
  "clients.document as clientDocument",
  "clients.email as clientEmail",
  "quotes.status",
  "quotes.total_amount as totalAmount",
  "quotes.valid_until as validUntil",
  "quotes.notes",
  "shipping_orders.id as shippingOrderId",
  "shipping_orders.status as shippingOrderStatus",
  "users.name as createdByUserName",
  "users.email as createdByUserEmail",
  "users.phone as createdByUserPhone",
  "quotes.created_at as createdAt",
  "quotes.updated_at as updatedAt",
];

const quoteItemColumns = [
  "quote_items.id",
  "quote_items.quote_id as quoteId",
  "quote_items.product_id as productId",
  "products.internal_code as productInternalCode",
  "products.name as productName",
  "brands.name as productBrandName",
  "products.ncm as productNcm",
  db.raw("(products.current_stock - products.reserved_stock) as \"productAvailableStock\""),
  "quote_items.description",
  "quote_items.quantity",
  "quote_items.unit_price as unitPrice",
  "quote_items.total_amount as totalAmount",
  "quote_items.position",
];

export async function listQuotes(): Promise<Quote[]> {
  const quoteRows = await quoteQuery(db).orderBy("quotes.created_at", "desc");
  return withQuoteItems(db, quoteRows);
}

export async function getQuoteById(
  id: string,
  database: Knex | Knex.Transaction = db,
): Promise<Quote | undefined> {
  const quote = await quoteQuery(database).where("quotes.id", id).first();

  if (!quote) {
    return undefined;
  }

  const [withItems] = await withQuoteItems(database, [quote]);
  return withItems;
}

export async function activeQuoteClientExists(
  transaction: Knex.Transaction,
  clientId: string,
): Promise<boolean> {
  const client = await transaction("clients").select("id").where({ id: clientId, active: true }).first();

  return Boolean(client);
}

export async function listActiveQuoteProducts(
  transaction: Knex.Transaction,
  productIds: string[],
): Promise<QuoteProduct[]> {
  return transaction("products")
    .select(["id", "name", "description", "sale_price as salePrice", "active"])
    .whereIn("id", productIds)
    .andWhere("active", true);
}

export async function insertQuote(
  transaction: Knex.Transaction,
  input: QuoteInput,
  createdByUserId: string,
  items: Array<{
    productId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    position: number;
  }>,
  totalAmount: number,
): Promise<Quote> {
  const [created] = await transaction("quotes")
    .insert({
      client_id: input.clientId,
      created_by_user_id: createdByUserId,
      status: "DRAFT",
      total_amount: totalAmount,
      valid_until: input.validUntil,
      notes: input.notes,
    })
    .returning("id");

  await transaction("quote_items").insert(
    items.map((item) => ({
      quote_id: created.id,
      product_id: item.productId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_amount: item.totalAmount,
      position: item.position,
    })),
  );

  const quote = await quoteQuery(transaction).where("quotes.id", created.id).first();

  if (!quote) {
    throw new Error("Quote was not found after creation");
  }

  const [withItems] = await withQuoteItems(transaction, [quote]);
  return withItems;
}

function quoteQuery(database: Knex | Knex.Transaction) {
  return database("quotes")
    .join("clients", "clients.id", "quotes.client_id")
    .join("users", "users.id", "quotes.created_by_user_id")
    .leftJoin("shipping_orders", "shipping_orders.quote_id", "quotes.id")
    .select<QuoteRow[]>(quoteColumns);
}

async function withQuoteItems(
  database: Knex | Knex.Transaction,
  quotes: QuoteRow[],
): Promise<Quote[]> {
  if (quotes.length === 0) {
    return [];
  }

  const quoteIds = quotes.map((quote) => quote.id);
  const items = await database("quote_items")
    .join("products", "products.id", "quote_items.product_id")
    .leftJoin("brands", "brands.id", "products.brand_id")
    .select<QuoteItemRow[]>(quoteItemColumns)
    .whereIn("quote_items.quote_id", quoteIds)
    .orderBy("quote_items.position", "asc");

  return quotes.map((quote) => ({
    ...quote,
    items: items
      .filter((item) => item.quoteId === quote.id)
      .map(({ quoteId: _quoteId, ...item }) => item),
  }));
}
