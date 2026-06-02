import type { Knex } from "knex";
import { db } from "../../database/knex.js";

export type PickupReservationInput = {
  clientId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
};

export type PickupReservation = {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  totalAmount: string;
  items: PickupReservationItem[];
  createdByUserName: string;
  createdAt: Date;
  saleId: string | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  status: "RESERVED" | "CANCELLED" | "COMPLETED";
};

export type PickupReservationItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  totalAmount: string;
  position: number;
};

export type ReservableProduct = {
  id: string;
  salePrice: string;
  currentStock: string;
  reservedStock: string;
  active: boolean;
};

const pickupReservationColumns = [
  "pickup_reservations.id",
  "pickup_reservations.client_id as clientId",
  "clients.name as clientName",
  "clients.phone as clientPhone",
  "pickup_reservations.total_amount as totalAmount",
  "created_users.name as createdByUserName",
  "pickup_reservations.created_at as createdAt",
  "pickup_reservations.sale_id as saleId",
  "pickup_reservations.completed_at as completedAt",
  "pickup_reservations.cancelled_at as cancelledAt",
  "pickup_reservations.cancellation_reason as cancellationReason",
  "pickup_reservations.status",
];

const pickupReservationItemColumns = [
  "pickup_reservation_items.id",
  "pickup_reservation_items.pickup_reservation_id as pickupReservationId",
  "pickup_reservation_items.product_id as productId",
  "products.name as productName",
  "pickup_reservation_items.quantity",
  "pickup_reservation_items.unit_price as unitPrice",
  "pickup_reservation_items.total_amount as totalAmount",
  "pickup_reservation_items.position",
];

type PickupReservationRow = Omit<
  PickupReservation,
  "items" | "productId" | "productName" | "quantity" | "unitPrice"
>;
type PickupReservationItemRow = PickupReservationItem & {
  pickupReservationId: string;
};

type LockedPickupReservationItem = {
  productId: string;
  quantity: string;
  unitPrice: string;
  totalAmount: string;
  position: number;
};

type LockedPickupReservation = {
  id: string;
  clientId: string;
  totalAmount: string;
  status: PickupReservation["status"];
  items: LockedPickupReservationItem[];
};

export async function listPickupReservations(): Promise<PickupReservation[]> {
  const reservations = await pickupReservationQuery(db).orderBy("pickup_reservations.created_at", "desc");
  return withPickupReservationItems(db, reservations);
}

export async function activePickupClientExists(
  transaction: Knex.Transaction,
  clientId: string,
): Promise<boolean> {
  const client = await transaction("clients").select("id").where({ id: clientId, active: true }).first();

  return Boolean(client);
}

export async function lockPickupProduct(
  transaction: Knex.Transaction,
  productId: string,
): Promise<ReservableProduct | undefined> {
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

export async function insertPickupReservation(
  transaction: Knex.Transaction,
  input: PickupReservationInput,
  createdByUserId: string,
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    position: number;
  }>,
  totalAmount: number,
): Promise<PickupReservation> {
  for (const item of aggregateReservationItems(items)) {
    await transaction("products")
      .where("id", item.productId)
      .update({
        reserved_stock: transaction.raw("reserved_stock + ?", [item.quantity]),
        updated_at: transaction.fn.now(),
      });
  }

  const [created] = await transaction("pickup_reservations")
    .insert({
      client_id: input.clientId,
      created_by_user_id: createdByUserId,
      total_amount: totalAmount,
    })
    .returning("id");

  await transaction("pickup_reservation_items").insert(
    items.map((item) => ({
      pickup_reservation_id: created.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_amount: item.totalAmount,
      position: item.position,
    })),
  );

  return findPickupReservation(transaction, created.id);
}

export async function lockPickupReservation(
  transaction: Knex.Transaction,
  id: string,
): Promise<LockedPickupReservation | undefined> {
  const reservation = await transaction("pickup_reservations")
    .select([
      "pickup_reservations.id",
      "pickup_reservations.client_id as clientId",
      "pickup_reservations.total_amount as totalAmount",
      "pickup_reservations.status",
    ])
    .where("pickup_reservations.id", id)
    .forUpdate("pickup_reservations")
    .first();

  if (!reservation) {
    return undefined;
  }

  const items = await transaction("pickup_reservation_items")
    .select([
      "product_id as productId",
      "quantity",
      "unit_price as unitPrice",
      "total_amount as totalAmount",
      "position",
    ])
    .where("pickup_reservation_id", id)
    .orderBy("position", "asc");

  return { ...reservation, items };
}

export async function cancelPickupReservation(
  transaction: Knex.Transaction,
  id: string,
  items: Array<{ productId: string; quantity: number }>,
  cancelledByUserId: string,
  reason: string,
): Promise<PickupReservation> {
  for (const item of items) {
    await transaction("products")
      .where("id", item.productId)
      .update({
        reserved_stock: transaction.raw("reserved_stock - ?", [item.quantity]),
        updated_at: transaction.fn.now(),
      });
  }

  await transaction("pickup_reservations").where("id", id).update({
    status: "CANCELLED",
    cancelled_by_user_id: cancelledByUserId,
    cancelled_at: transaction.fn.now(),
    cancellation_reason: reason,
  });

  return findPickupReservation(transaction, id);
}

export async function releasePickupReservationStock(
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

export async function completePickupReservation(
  transaction: Knex.Transaction,
  id: string,
  saleId: string,
  completedByUserId: string,
): Promise<PickupReservation> {
  await transaction("pickup_reservations").where("id", id).update({
    status: "COMPLETED",
    sale_id: saleId,
    completed_by_user_id: completedByUserId,
    completed_at: transaction.fn.now(),
  });

  return findPickupReservation(transaction, id);
}

async function findPickupReservation(
  transaction: Knex.Transaction,
  id: string,
): Promise<PickupReservation> {
  const reservation = await pickupReservationQuery(transaction).where("pickup_reservations.id", id).first();

  if (!reservation) {
    throw new Error("Pickup reservation was not found after operation");
  }

  const [withItems] = await withPickupReservationItems(transaction, [reservation]);
  return withItems;
}

function pickupReservationQuery(database: Knex | Knex.Transaction) {
  return database("pickup_reservations")
    .join("clients", "clients.id", "pickup_reservations.client_id")
    .join({ created_users: "users" }, "created_users.id", "pickup_reservations.created_by_user_id")
    .select<PickupReservationRow[]>(pickupReservationColumns);
}

async function withPickupReservationItems(
  database: Knex | Knex.Transaction,
  reservations: PickupReservationRow[],
): Promise<PickupReservation[]> {
  if (reservations.length === 0) {
    return [];
  }

  const reservationIds = reservations.map((reservation) => reservation.id);
  const items = await database("pickup_reservation_items")
    .join("products", "products.id", "pickup_reservation_items.product_id")
    .select<PickupReservationItemRow[]>(pickupReservationItemColumns)
    .whereIn("pickup_reservation_items.pickup_reservation_id", reservationIds)
    .orderBy("pickup_reservation_items.position", "asc");

  return reservations.map((reservation) => {
    const reservationItems = items
      .filter((item) => item.pickupReservationId === reservation.id)
      .map(({ pickupReservationId: _pickupReservationId, ...item }) => item);
    const firstItem = reservationItems[0];

    return {
      ...reservation,
      productId: firstItem?.productId ?? "",
      productName: firstItem?.productName ?? "",
      quantity: firstItem?.quantity ?? "0.000",
      unitPrice: firstItem?.unitPrice ?? "0.00",
      items: reservationItems,
    };
  });
}

function aggregateReservationItems(items: Array<{ productId: string; quantity: number }>) {
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
