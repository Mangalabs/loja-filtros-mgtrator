import type { Knex } from "knex";
import { db } from "../../database/knex.js";

export type PickupReservationInput = {
  clientId: string;
  productId: string;
  quantity: number;
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
  createdByUserName: string;
  createdAt: Date;
  saleId: string | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  status: "RESERVED" | "CANCELLED" | "COMPLETED";
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
  "pickup_reservation_items.product_id as productId",
  "products.name as productName",
  "pickup_reservation_items.quantity",
  "pickup_reservation_items.unit_price as unitPrice",
  "pickup_reservations.total_amount as totalAmount",
  "created_users.name as createdByUserName",
  "pickup_reservations.created_at as createdAt",
  "pickup_reservations.sale_id as saleId",
  "pickup_reservations.completed_at as completedAt",
  "pickup_reservations.cancelled_at as cancelledAt",
  "pickup_reservations.cancellation_reason as cancellationReason",
  "pickup_reservations.status",
];

export async function listPickupReservations(): Promise<PickupReservation[]> {
  return pickupReservationQuery(db).orderBy("pickup_reservations.created_at", "desc");
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
  unitPrice: number,
  totalAmount: number,
): Promise<PickupReservation> {
  await transaction("products")
    .where("id", input.productId)
    .update({
      reserved_stock: transaction.raw("reserved_stock + ?", [input.quantity]),
      updated_at: transaction.fn.now(),
    });

  const [created] = await transaction("pickup_reservations")
    .insert({
      client_id: input.clientId,
      created_by_user_id: createdByUserId,
      total_amount: totalAmount,
    })
    .returning("id");

  await transaction("pickup_reservation_items").insert({
    pickup_reservation_id: created.id,
    product_id: input.productId,
    quantity: input.quantity,
    unit_price: unitPrice,
    total_amount: totalAmount,
  });

  return findPickupReservation(transaction, created.id);
}

export async function lockPickupReservation(
  transaction: Knex.Transaction,
  id: string,
): Promise<
  | {
      id: string;
      clientId: string;
      productId: string;
      quantity: string;
      unitPrice: string;
      totalAmount: string;
      status: PickupReservation["status"];
    }
  | undefined
> {
  return transaction("pickup_reservations")
    .join(
      "pickup_reservation_items",
      "pickup_reservation_items.pickup_reservation_id",
      "pickup_reservations.id",
    )
    .select([
      "pickup_reservations.id",
      "pickup_reservations.client_id as clientId",
      "pickup_reservations.total_amount as totalAmount",
      "pickup_reservations.status",
      "pickup_reservation_items.product_id as productId",
      "pickup_reservation_items.quantity",
      "pickup_reservation_items.unit_price as unitPrice",
    ])
    .where("pickup_reservations.id", id)
    .forUpdate("pickup_reservations")
    .first();
}

export async function cancelPickupReservation(
  transaction: Knex.Transaction,
  id: string,
  productId: string,
  quantity: number,
  cancelledByUserId: string,
  reason: string,
): Promise<PickupReservation> {
  await transaction("products")
    .where("id", productId)
    .update({
      reserved_stock: transaction.raw("reserved_stock - ?", [quantity]),
      updated_at: transaction.fn.now(),
    });

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

  return reservation;
}

function pickupReservationQuery(database: Knex | Knex.Transaction) {
  return database("pickup_reservations")
    .join(
      "pickup_reservation_items",
      "pickup_reservation_items.pickup_reservation_id",
      "pickup_reservations.id",
    )
    .join("products", "products.id", "pickup_reservation_items.product_id")
    .join("clients", "clients.id", "pickup_reservations.client_id")
    .join({ created_users: "users" }, "created_users.id", "pickup_reservations.created_by_user_id")
    .select(pickupReservationColumns);
}
