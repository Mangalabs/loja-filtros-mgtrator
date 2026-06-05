import { db } from "../../database/knex.js";

export type ReportsOverview = {
  salesCount: number;
  salesTotalAmount: string;
  lowStockProductsCount: number;
  openShippingOrdersCount: number;
  openPickupReservationsCount: number;
  openCashRegister: {
    id: string;
    openedByUserName: string;
    openedAt: Date;
  } | null;
};

type CountRow = {
  count: string;
};

type SalesSummaryRow = {
  count: string;
  totalAmount: string;
};

type CashRegisterRow = {
  id: string;
  openedByUserName: string;
  openedAt: Date;
};

export async function getReportsOverview(): Promise<ReportsOverview> {
  const [
    salesSummary,
    lowStockProducts,
    openShippingOrders,
    openPickupReservations,
    openCashRegister,
  ] = await Promise.all([
    db("sales")
      .select<SalesSummaryRow[]>([
        db.raw("count(*)::text as count"),
        db.raw(
          'coalesce(sum(total_amount), 0)::numeric(12, 2)::text as "totalAmount"',
        ),
      ])
      .first(),
    db("products")
      .where("active", true)
      .whereRaw("current_stock <= minimum_stock")
      .count<CountRow[]>("id as count")
      .first(),
    db("shipping_orders")
      .whereIn("status", ["QUOTED", "APPROVED", "SEPARATED"])
      .count<CountRow[]>("id as count")
      .first(),
    db("pickup_reservations")
      .where("status", "RESERVED")
      .count<CountRow[]>("id as count")
      .first(),
    db("cash_register_sessions")
      .join("users", "users.id", "cash_register_sessions.opened_by_user_id")
      .select<
        CashRegisterRow[]
      >(["cash_register_sessions.id", "users.name as openedByUserName", "cash_register_sessions.opened_at as openedAt"])
      .where("cash_register_sessions.status", "OPEN")
      .first(),
  ]);

  return {
    salesCount: Number(salesSummary?.count ?? 0),
    salesTotalAmount: salesSummary?.totalAmount ?? "0.00",
    lowStockProductsCount: Number(lowStockProducts?.count ?? 0),
    openShippingOrdersCount: Number(openShippingOrders?.count ?? 0),
    openPickupReservationsCount: Number(openPickupReservations?.count ?? 0),
    openCashRegister: openCashRegister ?? null,
  };
}
