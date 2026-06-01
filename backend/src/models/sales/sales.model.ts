import type { Knex } from "knex";
import { db } from "../../database/knex.js";

export type SaleInput = {
  productId: string;
  quantity: number;
  paymentMethodId: string;
  clientId?: string | null;
};

export type Sale = {
  id: string;
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  totalAmount: string;
  clientName: string | null;
  paymentMethodName: string;
  createdByUserName: string;
  createdAt: Date;
  status: "COMPLETED";
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
  "sale_items.product_id as productId",
  "products.name as productName",
  "sale_items.quantity",
  "sale_items.unit_price as unitPrice",
  "sales.total_amount as totalAmount",
  "clients.name as clientName",
  "payment_methods.name as paymentMethodName",
  "users.name as createdByUserName",
  "sales.created_at as createdAt",
  "sales.status",
];

export async function listSales(): Promise<Sale[]> {
  return saleQuery(db).orderBy("sales.created_at", "desc");
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
  unitPrice: number,
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

  await transaction("sale_items").insert({
    sale_id: created.id,
    product_id: input.productId,
    quantity: input.quantity,
    unit_price: unitPrice,
    total_amount: totalAmount,
  });

  await transaction("sale_payments").insert({
    sale_id: created.id,
    payment_method_id: input.paymentMethodId,
    amount: totalAmount,
  });

  await transaction("stock_movements").insert({
    product_id: input.productId,
    sale_id: created.id,
    type: "SALE",
    quantity: -input.quantity,
  });

  await transaction("products")
    .where("id", input.productId)
    .update({
      current_stock: transaction.raw("current_stock - ?", [input.quantity]),
      updated_at: transaction.fn.now(),
    });

  const sale = await saleQuery(transaction).where("sales.id", created.id).first();

  if (!sale) {
    throw new Error("Sale was not found after creation");
  }

  return sale;
}

function saleQuery(database: Knex | Knex.Transaction) {
  return database("sales")
    .join("sale_items", "sale_items.sale_id", "sales.id")
    .join("products", "products.id", "sale_items.product_id")
    .join("sale_payments", "sale_payments.sale_id", "sales.id")
    .join("payment_methods", "payment_methods.id", "sale_payments.payment_method_id")
    .join("users", "users.id", "sales.created_by_user_id")
    .leftJoin("clients", "clients.id", "sales.client_id")
    .select(saleColumns);
}
