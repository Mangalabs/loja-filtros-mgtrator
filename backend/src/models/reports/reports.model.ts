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

export type SalesReportFilters = {
  dateFrom?: string;
  dateTo?: string;
};

export type SalesReport = {
  summary: {
    salesCount: number;
    itemsQuantity: string;
    grossAmount: string;
    discountAmount: string;
    netAmount: string;
  };
  byProduct: Array<{
    productId: string;
    productName: string;
    quantity: string;
    totalAmount: string;
  }>;
  byClient: Array<{
    clientId: string | null;
    clientName: string;
    salesCount: number;
    totalAmount: string;
  }>;
  byPaymentMethod: Array<{
    paymentMethodId: string;
    paymentMethodName: string;
    totalAmount: string;
  }>;
};

type CountRow = {
  count: string;
};

type SalesSummaryRow = {
  count: string;
  totalAmount: string;
};

type SalesReportSummaryRow = {
  salesCount: string;
  itemsQuantity: string;
  grossAmount: string;
  discountAmount: string;
  netAmount: string;
};

type SalesByProductRow = {
  productId: string;
  productName: string;
  quantity: string;
  totalAmount: string;
};

type SalesByClientRow = {
  clientId: string | null;
  clientName: string | null;
  salesCount: string;
  totalAmount: string;
};

type SalesByPaymentMethodRow = {
  paymentMethodId: string;
  paymentMethodName: string;
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
      .where("status", "COMPLETED")
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

export async function getSalesReport(
  filters: SalesReportFilters,
): Promise<SalesReport> {
  const [summary, byProduct, byClient, byPaymentMethod] = await Promise.all([
    salesReportSalesQuery(filters)
      .leftJoin(
        salesItemQuantitySubquery().as("sale_item_quantities"),
        "sale_item_quantities.sale_id",
        "sales.id",
      )
      .select<SalesReportSummaryRow[]>([
        db.raw("count(sales.id)::text as ??", ["salesCount"]),
        db.raw(
          "coalesce(sum(sale_item_quantities.quantity), 0)::numeric(12, 3)::text as ??",
          ["itemsQuantity"],
        ),
        db.raw(
          "coalesce(sum(sales.subtotal_amount), 0)::numeric(12, 2)::text as ??",
          ["grossAmount"],
        ),
        db.raw(
          "coalesce(sum(sales.discount_amount), 0)::numeric(12, 2)::text as ??",
          ["discountAmount"],
        ),
        db.raw(
          "coalesce(sum(sales.total_amount), 0)::numeric(12, 2)::text as ??",
          ["netAmount"],
        ),
      ])
      .first(),
    salesReportBaseQuery(filters)
      .join("products", "products.id", "sale_items.product_id")
      .select<SalesByProductRow[]>([
        "products.id as productId",
        "products.name as productName",
        db.raw("sum(sale_items.quantity)::numeric(12, 3)::text as ??", [
          "quantity",
        ]),
        db.raw("sum(sale_items.total_amount)::numeric(12, 2)::text as ??", [
          "totalAmount",
        ]),
      ])
      .groupBy("products.id", "products.name")
      .orderByRaw("sum(sale_items.total_amount) desc")
      .limit(20),
    salesReportSalesQuery(filters)
      .leftJoin("clients", "clients.id", "sales.client_id")
      .select<SalesByClientRow[]>([
        "clients.id as clientId",
        "clients.name as clientName",
        db.raw("count(sales.id)::text as ??", ["salesCount"]),
        db.raw("sum(sales.total_amount)::numeric(12, 2)::text as ??", [
          "totalAmount",
        ]),
      ])
      .groupBy("clients.id", "clients.name")
      .orderByRaw("sum(sales.total_amount) desc")
      .limit(20),
    salesReportSalesQuery(filters)
      .join("sale_payments", "sale_payments.sale_id", "sales.id")
      .join(
        "payment_methods",
        "payment_methods.id",
        "sale_payments.payment_method_id",
      )
      .select<SalesByPaymentMethodRow[]>([
        "payment_methods.id as paymentMethodId",
        "payment_methods.name as paymentMethodName",
        db.raw("sum(sale_payments.amount)::numeric(12, 2)::text as ??", [
          "totalAmount",
        ]),
      ])
      .groupBy("payment_methods.id", "payment_methods.name")
      .orderByRaw("sum(sale_payments.amount) desc"),
  ]);

  return {
    summary: {
      salesCount: Number(summary?.salesCount ?? 0),
      itemsQuantity: summary?.itemsQuantity ?? "0.000",
      grossAmount: summary?.grossAmount ?? "0.00",
      discountAmount: summary?.discountAmount ?? "0.00",
      netAmount: summary?.netAmount ?? "0.00",
    },
    byProduct,
    byClient: byClient.map((client) => ({
      ...client,
      clientName: client.clientName ?? "Consumidor nao identificado",
      salesCount: Number(client.salesCount),
    })),
    byPaymentMethod,
  };
}

function salesReportBaseQuery(filters: SalesReportFilters) {
  return db("sales")
    .join("sale_items", "sale_items.sale_id", "sales.id")
    .where("sales.status", "COMPLETED")
    .modify((query) => {
      if (filters.dateFrom) {
        query.where("sales.created_at", ">=", filters.dateFrom);
      }

      if (filters.dateTo) {
        query.where(
          "sales.created_at",
          "<",
          db.raw("?::date + interval '1 day'", [filters.dateTo]),
        );
      }
    });
}

function salesReportSalesQuery(filters: SalesReportFilters) {
  return db("sales")
    .where("sales.status", "COMPLETED")
    .modify((query) => {
      if (filters.dateFrom) {
        query.where("sales.created_at", ">=", filters.dateFrom);
      }

      if (filters.dateTo) {
        query.where(
          "sales.created_at",
          "<",
          db.raw("?::date + interval '1 day'", [filters.dateTo]),
        );
      }
    });
}

function salesItemQuantitySubquery() {
  return db("sale_items")
    .select("sale_id")
    .sum("quantity as quantity")
    .groupBy("sale_id");
}
