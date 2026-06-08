import type { Knex } from "knex";
import { db } from "../../database/knex.js";
import type { Quote } from "../quotes/quotes.model.js";

export type ShippingOrderInput = {
  clientId: string;
  productId: string;
  quantity: number;
};

export type ShippingOrder = {
  id: string;
  quoteId: string | null;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  totalAmount: string;
  items: ShippingOrderItem[];
  createdByUserName: string;
  createdAt: Date;
  approvedByUserName: string | null;
  approvedAt: Date | null;
  separatedByUserName: string | null;
  separatedAt: Date | null;
  saleId: string | null;
  completedByUserName: string | null;
  completedAt: Date | null;
  cancelledByUserName: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  status: "QUOTED" | "APPROVED" | "SEPARATED" | "CANCELLED" | "COMPLETED";
};

export type ShippingOrderItem = {
  id: string;
  productId: string;
  productName: string;
  description: string | null;
  quantity: string;
  unitPrice: string;
  totalAmount: string;
  position: number;
};

export type ReservedProduct = {
  id: string;
  salePrice: string;
  currentStock: string;
  reservedStock: string;
  active: boolean;
};

const shippingOrderColumns = [
  "shipping_orders.id",
  "shipping_orders.quote_id as quoteId",
  "shipping_orders.client_id as clientId",
  "clients.name as clientName",
  "clients.phone as clientPhone",
  "shipping_orders.total_amount as totalAmount",
  "created_users.name as createdByUserName",
  "shipping_orders.created_at as createdAt",
  "approved_users.name as approvedByUserName",
  "shipping_orders.approved_at as approvedAt",
  "separated_users.name as separatedByUserName",
  "shipping_orders.separated_at as separatedAt",
  "shipping_orders.sale_id as saleId",
  "completed_users.name as completedByUserName",
  "shipping_orders.completed_at as completedAt",
  "cancelled_users.name as cancelledByUserName",
  "shipping_orders.cancelled_at as cancelledAt",
  "shipping_orders.cancellation_reason as cancellationReason",
  "shipping_orders.status",
];

const shippingOrderItemColumns = [
  "shipping_order_items.id",
  "shipping_order_items.shipping_order_id as shippingOrderId",
  "shipping_order_items.product_id as productId",
  "products.name as productName",
  "shipping_order_items.description",
  "shipping_order_items.quantity",
  "shipping_order_items.unit_price as unitPrice",
  "shipping_order_items.total_amount as totalAmount",
  "shipping_order_items.position",
];

type ShippingOrderRow = Omit<
  ShippingOrder,
  "items" | "productId" | "productName" | "quantity" | "unitPrice"
>;
type ShippingOrderItemRow = ShippingOrderItem & {
  shippingOrderId: string;
};

type LockedShippingOrderItem = {
  productId: string;
  quantity: string;
  unitPrice: string;
  totalAmount: string;
  position: number;
};

type LockedShippingOrder = {
  id: string;
  clientId: string;
  totalAmount: string;
  status: ShippingOrder["status"];
  items: LockedShippingOrderItem[];
};

export async function listShippingOrders(): Promise<ShippingOrder[]> {
  const orders = await shippingOrderQuery(db).orderBy(
    "shipping_orders.created_at",
    "desc",
  );
  return withShippingOrderItems(db, orders);
}

export async function activeShippingClientExists(
  transaction: Knex.Transaction,
  clientId: string,
): Promise<boolean> {
  const client = await transaction("clients")
    .select("id")
    .where({ id: clientId, active: true })
    .first();

  return Boolean(client);
}

export async function lockReservableProduct(
  transaction: Knex.Transaction,
  productId: string,
): Promise<ReservedProduct | undefined> {
  return transaction("products")
    .select([
      "id",
      "sale_price as salePrice",
      "current_stock as currentStock",
      "reserved_stock as reservedStock",
      "active",
    ])
    .where("id", productId)
    .forUpdate()
    .first();
}

export async function insertShippingOrder(
  transaction: Knex.Transaction,
  input: ShippingOrderInput,
  createdByUserId: string,
  unitPrice: number,
  totalAmount: number,
): Promise<ShippingOrder> {
  const [created] = await transaction("shipping_orders")
    .insert({
      client_id: input.clientId,
      created_by_user_id: createdByUserId,
      total_amount: totalAmount,
    })
    .returning("id");

  await transaction("shipping_order_items").insert({
    shipping_order_id: created.id,
    product_id: input.productId,
    quantity: input.quantity,
    unit_price: unitPrice,
    total_amount: totalAmount,
  });

  return findShippingOrder(transaction, created.id);
}

export async function findShippingOrderByQuoteId(
  transaction: Knex.Transaction,
  quoteId: string,
): Promise<ShippingOrder | undefined> {
  const order = await shippingOrderQuery(transaction)
    .where("shipping_orders.quote_id", quoteId)
    .first();

  if (!order) {
    return undefined;
  }

  const [withItems] = await withShippingOrderItems(transaction, [order]);
  return withItems;
}

export async function getShippingOrderById(
  id: string,
  database: Knex | Knex.Transaction = db,
): Promise<ShippingOrder | undefined> {
  const order = await shippingOrderQuery(database)
    .where("shipping_orders.id", id)
    .first();

  if (!order) {
    return undefined;
  }

  const [withItems] = await withShippingOrderItems(database, [order]);
  return withItems;
}

export async function insertShippingOrderFromQuote(
  transaction: Knex.Transaction,
  quote: Quote,
  createdByUserId: string,
): Promise<ShippingOrder> {
  const [created] = await transaction("shipping_orders")
    .insert({
      quote_id: quote.id,
      client_id: quote.clientId,
      created_by_user_id: createdByUserId,
      total_amount: quote.totalAmount,
    })
    .returning("id");

  await transaction("shipping_order_items").insert(
    quote.items.map((item) => ({
      shipping_order_id: created.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_amount: item.totalAmount,
      description: item.description,
      position: item.position,
    })),
  );

  return findShippingOrder(transaction, created.id);
}

export async function lockShippingOrder(
  transaction: Knex.Transaction,
  id: string,
): Promise<LockedShippingOrder | undefined> {
  const order = await transaction("shipping_orders")
    .select([
      "shipping_orders.id",
      "shipping_orders.client_id as clientId",
      "shipping_orders.total_amount as totalAmount",
      "shipping_orders.status",
    ])
    .where("shipping_orders.id", id)
    .forUpdate("shipping_orders")
    .first();

  if (!order) {
    return undefined;
  }

  const items = await transaction("shipping_order_items")
    .select([
      "product_id as productId",
      "quantity",
      "unit_price as unitPrice",
      "total_amount as totalAmount",
      "position",
    ])
    .where("shipping_order_id", id)
    .orderBy("position", "asc");

  return { ...order, items };
}

export async function approveShippingOrder(
  transaction: Knex.Transaction,
  id: string,
  items: Array<{ productId: string; quantity: number }>,
  approvedByUserId: string,
): Promise<ShippingOrder> {
  for (const item of items) {
    await transaction("products")
      .where("id", item.productId)
      .update({
        reserved_stock: transaction.raw("reserved_stock + ?", [item.quantity]),
        updated_at: transaction.fn.now(),
      });
  }

  await transaction("shipping_orders").where("id", id).update({
    status: "APPROVED",
    approved_by_user_id: approvedByUserId,
    approved_at: transaction.fn.now(),
  });

  return findShippingOrder(transaction, id);
}

export async function cancelShippingOrder(
  transaction: Knex.Transaction,
  id: string,
  items: Array<{ productId: string; quantity: number }>,
  wasApproved: boolean,
  cancelledByUserId: string,
  reason: string,
): Promise<ShippingOrder> {
  if (wasApproved) {
    for (const item of items) {
      await transaction("products")
        .where("id", item.productId)
        .update({
          reserved_stock: transaction.raw("reserved_stock - ?", [
            item.quantity,
          ]),
          updated_at: transaction.fn.now(),
        });
    }
  }

  await transaction("shipping_orders").where("id", id).update({
    status: "CANCELLED",
    cancelled_by_user_id: cancelledByUserId,
    cancelled_at: transaction.fn.now(),
    cancellation_reason: reason,
  });

  return findShippingOrder(transaction, id);
}

export async function separateShippingOrder(
  transaction: Knex.Transaction,
  id: string,
  separatedByUserId: string,
): Promise<ShippingOrder> {
  await transaction("shipping_orders").where("id", id).update({
    status: "SEPARATED",
    separated_by_user_id: separatedByUserId,
    separated_at: transaction.fn.now(),
  });

  return findShippingOrder(transaction, id);
}

export async function releaseShippingOrderReservation(
  transaction: Knex.Transaction,
  productId: string,
  quantity: number,
): Promise<void> {
  await transaction("products")
    .where("id", productId)
    .update({
      reserved_stock: transaction.raw("reserved_stock - ?", [quantity]),
      updated_at: transaction.fn.now(),
    });
}

export async function completeShippingOrder(
  transaction: Knex.Transaction,
  id: string,
  saleId: string,
  completedByUserId: string,
): Promise<ShippingOrder> {
  await transaction("shipping_orders").where("id", id).update({
    status: "COMPLETED",
    sale_id: saleId,
    completed_by_user_id: completedByUserId,
    completed_at: transaction.fn.now(),
  });

  return findShippingOrder(transaction, id);
}

async function findShippingOrder(
  transaction: Knex.Transaction,
  id: string,
): Promise<ShippingOrder> {
  const order = await shippingOrderQuery(transaction)
    .where("shipping_orders.id", id)
    .first();

  if (!order) {
    throw new Error("Shipping order was not found after operation");
  }

  const [withItems] = await withShippingOrderItems(transaction, [order]);
  return withItems;
}

function shippingOrderQuery(database: Knex | Knex.Transaction) {
  return database("shipping_orders")
    .join("clients", "clients.id", "shipping_orders.client_id")
    .join(
      { created_users: "users" },
      "created_users.id",
      "shipping_orders.created_by_user_id",
    )
    .leftJoin(
      { approved_users: "users" },
      "approved_users.id",
      "shipping_orders.approved_by_user_id",
    )
    .leftJoin(
      { separated_users: "users" },
      "separated_users.id",
      "shipping_orders.separated_by_user_id",
    )
    .leftJoin(
      { completed_users: "users" },
      "completed_users.id",
      "shipping_orders.completed_by_user_id",
    )
    .leftJoin(
      { cancelled_users: "users" },
      "cancelled_users.id",
      "shipping_orders.cancelled_by_user_id",
    )
    .select<ShippingOrderRow[]>(shippingOrderColumns);
}

async function withShippingOrderItems(
  database: Knex | Knex.Transaction,
  orders: ShippingOrderRow[],
): Promise<ShippingOrder[]> {
  if (orders.length === 0) {
    return [];
  }

  const orderIds = orders.map((order) => order.id);
  const items = await database("shipping_order_items")
    .join("products", "products.id", "shipping_order_items.product_id")
    .select<ShippingOrderItemRow[]>(shippingOrderItemColumns)
    .whereIn("shipping_order_items.shipping_order_id", orderIds)
    .orderBy("shipping_order_items.position", "asc");

  return orders.map((order) => {
    const orderItems = items
      .filter((item) => item.shippingOrderId === order.id)
      .map(({ shippingOrderId: _shippingOrderId, ...item }) => item);
    const firstItem = orderItems[0];

    return {
      ...order,
      productId: firstItem?.productId ?? "",
      productName: firstItem?.productName ?? "",
      quantity: firstItem?.quantity ?? "0.000",
      unitPrice: firstItem?.unitPrice ?? "0.00",
      items: orderItems,
    };
  });
}
