import type { Knex } from "knex";
import { db } from "../../database/knex.js";

export type SaleInput = {
  paymentMethodId: string;
  clientId?: string | null;
  discountAmount: number;
  allowInsufficientStock?: boolean;
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
  subtotalAmount: string;
  discountAmount: string;
  totalAmount: string;
  items: SaleItem[];
  clientId: string | null;
  clientPersonType: "PF" | "PJ" | "ES" | null;
  clientName: string | null;
  clientDocument: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  clientStateRegistration: string | null;
  clientStateRegistrationIndicator: "1" | "2" | "9" | null;
  clientAddressStreet: string | null;
  clientAddressNumber: string | null;
  clientAddressComplement: string | null;
  clientAddressDistrict: string | null;
  clientAddressCity: string | null;
  clientAddressState: string | null;
  clientAddressZipCode: string | null;
  paymentMethodName: string;
  createdByUserName: string;
  createdAt: Date;
  cancelledByUserName: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  status: "COMPLETED" | "CANCELLED";
};

export type SaleItem = {
  id: string;
  productId: string;
  productInternalCode: string | null;
  productName: string;
  productCfop: string | null;
  productIcmsCst: string | null;
  productNcm: string | null;
  productPisCst: string | null;
  productCofinsCst: string | null;
  productOrigin: string | null;
  productUnit: string;
  quantity: string;
  unitPrice: string;
  totalAmount: string;
  position: number;
};

export type SaleItemForReturn = {
  id: string;
  saleId: string;
  productId: string;
  quantity: string;
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
  "sales.subtotal_amount as subtotalAmount",
  "sales.discount_amount as discountAmount",
  "sales.total_amount as totalAmount",
  "sales.client_id as clientId",
  "clients.person_type as clientPersonType",
  "clients.name as clientName",
  "clients.document as clientDocument",
  "clients.email as clientEmail",
  "clients.phone as clientPhone",
  "clients.state_registration as clientStateRegistration",
  "clients.state_registration_indicator as clientStateRegistrationIndicator",
  "clients.address_street as clientAddressStreet",
  "clients.address_number as clientAddressNumber",
  "clients.address_complement as clientAddressComplement",
  "clients.address_district as clientAddressDistrict",
  "clients.address_city as clientAddressCity",
  "clients.address_state as clientAddressState",
  "clients.address_zip_code as clientAddressZipCode",
  "payment_methods.name as paymentMethodName",
  "users.name as createdByUserName",
  "sales.created_at as createdAt",
  "cancelled_users.name as cancelledByUserName",
  "sales.cancelled_at as cancelledAt",
  "sales.cancellation_reason as cancellationReason",
  "sales.status",
];

const saleItemColumns = [
  "sale_items.id",
  "sale_items.sale_id as saleId",
  "sale_items.product_id as productId",
  "products.internal_code as productInternalCode",
  "products.name as productName",
  "products.cfop as productCfop",
  "products.icms_cst as productIcmsCst",
  "products.ncm as productNcm",
  "products.pis_cst as productPisCst",
  "products.cofins_cst as productCofinsCst",
  "products.origin as productOrigin",
  "products.unit as productUnit",
  "sale_items.quantity",
  "sale_items.unit_price as unitPrice",
  "sale_items.total_amount as totalAmount",
  "sale_items.position",
];

type SaleRow = Omit<
  Sale,
  "items" | "productId" | "productName" | "quantity" | "unitPrice"
>;
type SaleItemRow = SaleItem & {
  saleId: string;
};

export async function listSales(): Promise<Sale[]> {
  const sales = await saleQuery(db).orderBy("sales.created_at", "desc");
  return withSaleItems(db, sales);
}

export async function getSaleById(
  id: string,
  database: Knex | Knex.Transaction = db,
): Promise<Sale | undefined> {
  const sale = await saleQuery(database).where("sales.id", id).first();

  if (!sale) {
    return undefined;
  }

  const [withItems] = await withSaleItems(database, [sale]);
  return withItems;
}

export async function findOpenCashRegister(
  transaction: Knex.Transaction,
): Promise<{ id: string } | undefined> {
  return transaction("cash_register_sessions")
    .select("id")
    .where("status", "OPEN")
    .forUpdate()
    .first();
}

export async function lockSaleForCancellation(
  transaction: Knex.Transaction,
  id: string,
): Promise<{ id: string; status: Sale["status"] } | undefined> {
  return transaction("sales")
    .select(["id", "status"])
    .where("id", id)
    .forUpdate()
    .first();
}

export async function saleHasLinkedOperation(
  transaction: Knex.Transaction,
  saleId: string,
): Promise<boolean> {
  const linkedShippingOrder = await transaction("shipping_orders")
    .select("id")
    .where("sale_id", saleId)
    .first();

  if (linkedShippingOrder) {
    return true;
  }

  const linkedPickupReservation = await transaction("pickup_reservations")
    .select("id")
    .where("sale_id", saleId)
    .first();

  return Boolean(linkedPickupReservation);
}

export async function saleHasBlockingFiscalDocument(
  transaction: Knex.Transaction,
  saleId: string,
): Promise<boolean> {
  const fiscalDocument = await transaction("fiscal_documents")
    .select("id")
    .where({
      source_type: "SALE",
      source_id: saleId,
    })
    .whereIn("status", ["PENDING", "PROCESSING", "AUTHORIZED"])
    .first();

  return Boolean(fiscalDocument);
}

export async function lockSaleItemForReturn(
  transaction: Knex.Transaction,
  saleId: string,
  saleItemId: string,
): Promise<SaleItemForReturn | undefined> {
  return transaction("sale_items")
    .select([
      "id",
      "sale_id as saleId",
      "product_id as productId",
      "quantity",
    ])
    .where({ id: saleItemId, sale_id: saleId })
    .forUpdate()
    .first();
}

export async function returnedSaleItemQuantity(
  transaction: Knex.Transaction,
  saleItemId: string,
): Promise<number> {
  const result = await transaction("sale_item_returns")
    .where("sale_item_id", saleItemId)
    .sum<{ total: string | null }>("quantity as total")
    .first();

  return Number(result?.total ?? 0);
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
  const client = await transaction("clients")
    .select("id")
    .where({ id: clientId, active: true })
    .first();

  return Boolean(client);
}

export async function cancelSale(
  transaction: Knex.Transaction,
  id: string,
  cancelledByUserId: string,
  reason: string,
): Promise<Sale> {
  const saleItems = await transaction("sale_items")
    .select<Array<{ productId: string; quantity: string }>>([
      "product_id as productId",
      "quantity",
    ])
    .where("sale_id", id);

  await transaction("sales").where("id", id).update({
    status: "CANCELLED",
    cancelled_by_user_id: cancelledByUserId,
    cancelled_at: transaction.fn.now(),
    cancellation_reason: reason,
  });

  await transaction("stock_movements").insert(
    saleItems.map((item) => ({
      product_id: item.productId,
      sale_id: id,
      created_by_user_id: cancelledByUserId,
      type: "SALE_CANCEL",
      quantity: Number(item.quantity),
      notes: reason,
    })),
  );

  for (const item of aggregateSaleItems(
    saleItems.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
    })),
  )) {
    await transaction("products")
      .where("id", item.productId)
      .update({
        current_stock: transaction.raw("current_stock + ?", [item.quantity]),
        updated_at: transaction.fn.now(),
      });
  }

  const sale = await getSaleById(id, transaction);

  if (!sale) {
    throw new Error("Sale was not found after cancellation");
  }

  return sale;
}

export async function returnSaleItem(
  transaction: Knex.Transaction,
  saleId: string,
  saleItem: SaleItemForReturn,
  quantity: number,
  createdByUserId: string,
  reason: string,
): Promise<Sale> {
  await transaction("sale_item_returns").insert({
    sale_id: saleId,
    sale_item_id: saleItem.id,
    product_id: saleItem.productId,
    created_by_user_id: createdByUserId,
    quantity,
    reason,
  });

  await transaction("stock_movements").insert({
    product_id: saleItem.productId,
    sale_id: saleId,
    created_by_user_id: createdByUserId,
    type: "SALE_RETURN",
    quantity,
    notes: reason,
  });

  await transaction("products")
    .where("id", saleItem.productId)
    .update({
      current_stock: transaction.raw("current_stock + ?", [quantity]),
      updated_at: transaction.fn.now(),
    });

  const sale = await getSaleById(saleId, transaction);

  if (!sale) {
    throw new Error("Sale was not found after item return");
  }

  return sale;
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
  subtotalAmount: number,
  totalAmount: number,
): Promise<Sale> {
  const [created] = await transaction("sales")
    .insert({
      cash_register_session_id: cashRegisterSessionId,
      created_by_user_id: createdByUserId,
      client_id: input.clientId,
      subtotal_amount: subtotalAmount,
      discount_amount: input.discountAmount,
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

  const sale = await saleQuery(transaction)
    .where("sales.id", created.id)
    .first();

  if (!sale) {
    throw new Error("Sale was not found after creation");
  }

  const [withItems] = await withSaleItems(transaction, [sale]);
  return withItems;
}

function saleQuery(database: Knex | Knex.Transaction) {
  return database("sales")
    .join("sale_payments", "sale_payments.sale_id", "sales.id")
    .join(
      "payment_methods",
      "payment_methods.id",
      "sale_payments.payment_method_id",
    )
    .join("users", "users.id", "sales.created_by_user_id")
    .leftJoin(
      { cancelled_users: "users" },
      "cancelled_users.id",
      "sales.cancelled_by_user_id",
    )
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

function aggregateSaleItems(
  items: Array<{ productId: string; quantity: number }>,
) {
  return items.reduce<Array<{ productId: string; quantity: number }>>(
    (aggregatedItems, item) => {
      const existing = aggregatedItems.find(
        (currentItem) => currentItem.productId === item.productId,
      );

      if (existing) {
        existing.quantity += item.quantity;
        return aggregatedItems;
      }

      aggregatedItems.push({
        productId: item.productId,
        quantity: item.quantity,
      });

      return aggregatedItems;
    },
    [],
  );
}
