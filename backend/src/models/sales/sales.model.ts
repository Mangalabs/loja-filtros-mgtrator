import type { Knex } from "knex";
import { db } from "../../database/knex.js";

export type SaleInput = {
  paymentMethodId: string;
  clientId?: string | null;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
};

export type Sale = {
  id: string;
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  totalAmount: string;
  items: SaleItem[];
  clientName: string | null;
  paymentMethodName: string;
  createdByUserName: string;
  createdAt: Date;
  status: "COMPLETED";
};

export type SaleItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  totalAmount: string;
  position: number;
};

export type SaleProduct = {
  id: string;
  name: string;
  salePrice: string;
  currentStock: string;
  reservedStock: string;
  active: boolean;
};

const saleColumns = [
  "sales.id",
  "sales.total_amount as totalAmount",
  "clients.name as clientName",
  "payment_methods.name as paymentMethodName",
  "users.name as createdByUserName",
  "sales.created_at as createdAt",
  "sales.status",
];

const saleItemColumns = [
  "sale_items.id",
  "sale_items.sale_id as saleId",
  "sale_items.product_id as productId",
  "products.name as productName",
  "sale_items.quantity",
  "sale_items.unit_price as unitPrice",
  "sale_items.total_amount as totalAmount",
  "sale_items.position",
];

type SaleRow = Omit<Sale, "items" | "productId" | "productName" | "quantity" | "unitPrice">;
type SaleItemRow = SaleItem & {
  saleId: string;
};

export async function listSales(): Promise<Sale[]> {
  const sales = await saleQuery(db).orderBy("sales.created_at", "desc");
  return withSaleItems(db, sales);
}

export async function findOpenCashRegister(
  transaction: Knex.Transaction,
): Promise<{ id: string } | undefined> {
  return transaction("cash_register_sessions").select("id").where("status", "OPEN").forUpdate().first();
}

export async function lockSaleProduct(
  transaction: Knex.Transaction,
  productId: string,
): Promise<SaleProduct | undefined> {
  return transaction("products")
    .select([
      "id",
      "name",
      "sale_price as salePrice",
      "current_stock as currentStock",
      "reserved_stock as reservedStock",
      "active",
    ])
    .where("id", productId)
    .forUpdate()
    .first();
}

export async function activePaymentMethodExists(
  transaction: Knex.Transaction,
  paymentMethodId: string,
): Promise<boolean> {
  const paymentMethod = await transaction("payment_methods")
    .select("id")
    .where({ id: paymentMethodId, active: true })
    .first();

  return Boolean(paymentMethod);
}

export async function activeClientExists(
  transaction: Knex.Transaction,
  clientId: string,
): Promise<boolean> {
  const client = await transaction("clients").select("id").where({ id: clientId, active: true }).first();

  return Boolean(client);
}

export async function insertSale(
  transaction: Knex.Transaction,
  input: SaleInput,
  cashRegisterSessionId: string,
  createdByUserId: string,
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    position: number;
  }>,
  totalAmount: number,
): Promise<Sale> {
  const [created] = await transaction("sales")
    .insert({
      cash_register_session_id: cashRegisterSessionId,
      created_by_user_id: createdByUserId,
      client_id: input.clientId,
      total_amount: totalAmount,
    })
    .returning("id");

  await transaction("sale_items").insert(
    items.map((item) => ({
      sale_id: created.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_amount: item.totalAmount,
      position: item.position,
    })),
  );

  await transaction("sale_payments").insert({
    sale_id: created.id,
    payment_method_id: input.paymentMethodId,
    amount: totalAmount,
  });

  await transaction("stock_movements").insert(
    items.map((item) => ({
      product_id: item.productId,
      sale_id: created.id,
      created_by_user_id: createdByUserId,
      type: "SALE",
      quantity: -item.quantity,
    })),
  );

  for (const item of aggregateSaleItems(items)) {
    await transaction("products")
      .where("id", item.productId)
      .update({
        current_stock: transaction.raw("current_stock - ?", [item.quantity]),
        updated_at: transaction.fn.now(),
      });
  }

  const sale = await saleQuery(transaction).where("sales.id", created.id).first();

  if (!sale) {
    throw new Error("Sale was not found after creation");
  }

  const [withItems] = await withSaleItems(transaction, [sale]);
  return withItems;
}

function saleQuery(database: Knex | Knex.Transaction) {
  return database("sales")
    .join("sale_payments", "sale_payments.sale_id", "sales.id")
    .join("payment_methods", "payment_methods.id", "sale_payments.payment_method_id")
    .join("users", "users.id", "sales.created_by_user_id")
    .leftJoin("clients", "clients.id", "sales.client_id")
    .select<SaleRow[]>(saleColumns);
}

async function withSaleItems(
  database: Knex | Knex.Transaction,
  sales: SaleRow[],
): Promise<Sale[]> {
  if (sales.length === 0) {
    return [];
  }

  const saleIds = sales.map((sale) => sale.id);
  const items = await database("sale_items")
    .join("products", "products.id", "sale_items.product_id")
    .select<SaleItemRow[]>(saleItemColumns)
    .whereIn("sale_items.sale_id", saleIds)
    .orderBy("sale_items.position", "asc");

  return sales.map((sale) => {
    const saleItems = items
      .filter((item) => item.saleId === sale.id)
      .map(({ saleId: _saleId, ...item }) => item);
    const firstItem = saleItems[0];

    return {
      ...sale,
      productId: firstItem?.productId ?? "",
      productName: firstItem?.productName ?? "",
      quantity: firstItem?.quantity ?? "0.000",
      unitPrice: firstItem?.unitPrice ?? "0.00",
      items: saleItems,
    };
  });
}

function aggregateSaleItems(items: Array<{ productId: string; quantity: number }>) {
  return items.reduce<Array<{ productId: string; quantity: number }>>((aggregatedItems, item) => {
    const existing = aggregatedItems.find((currentItem) => currentItem.productId === item.productId);

    if (existing) {
      existing.quantity += item.quantity;
      return aggregatedItems;
    }

    aggregatedItems.push({
      productId: item.productId,
      quantity: item.quantity,
    });

    return aggregatedItems;
  }, []);
}
