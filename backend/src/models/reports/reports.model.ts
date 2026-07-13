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

export type StockReportFilters = {
  dateFrom?: string;
  dateTo?: string;
};

export type PurchaseReportFilters = {
  dateFrom?: string;
  dateTo?: string;
};

export type StockReport = {
  summary: {
    activeProductsCount: number;
    lowStockProductsCount: number;
    productsWithoutMovementCount: number;
    soldQuantity: string;
  };
  lowStockProducts: Array<{
    productId: string;
    productName: string;
    currentStock: string;
    reservedStock: string;
    availableStock: string;
    minimumStock: string;
  }>;
  productsWithoutMovement: Array<{
    productId: string;
    productName: string;
    currentStock: string;
    minimumStock: string;
  }>;
  turnoverProducts: Array<{
    productId: string;
    productName: string;
    soldQuantity: string;
    lastSaleAt: Date | null;
  }>;
};

export type PurchaseReport = {
  summary: {
    entriesCount: number;
    totalQuantity: string;
    totalAmount: string;
    manualAmount: string;
    xmlAmount: string;
  };
  bySource: Array<{
    source: "MANUAL" | "XML";
    entriesCount: number;
    totalQuantity: string;
    totalAmount: string;
  }>;
  bySupplier: Array<{
    supplierId: string;
    supplierName: string;
    entriesCount: number;
    totalAmount: string;
  }>;
  byProduct: Array<{
    productId: string;
    productName: string;
    quantity: string;
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

type LowStockProductRow = {
  productId: string;
  productName: string;
  currentStock: string;
  reservedStock: string;
  availableStock: string;
  minimumStock: string;
};

type ProductWithoutMovementRow = {
  productId: string;
  productName: string;
  currentStock: string;
  minimumStock: string;
};

type StockTurnoverProductRow = {
  productId: string;
  productName: string;
  soldQuantity: string;
  lastSaleAt: Date | null;
};

type StockSummaryRow = {
  soldQuantity: string;
};

type PurchaseReportSummaryRow = {
  entriesCount: string;
  totalQuantity: string;
  totalAmount: string;
  manualAmount: string;
  xmlAmount: string;
};

type PurchaseBySourceRow = {
  source: "MANUAL" | "XML";
  entriesCount: string;
  totalQuantity: string;
  totalAmount: string;
};

type PurchaseBySupplierRow = {
  supplierId: string;
  supplierName: string;
  entriesCount: string;
  totalAmount: string;
};

type PurchaseByProductRow = {
  productId: string;
  productName: string;
  quantity: string;
  totalAmount: string;
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

export async function getStockReport(
  filters: StockReportFilters,
): Promise<StockReport> {
  const [
    activeProducts,
    lowStockProductsCount,
    lowStockProducts,
    productsWithoutMovementCount,
    productsWithoutMovement,
    turnoverProducts,
    stockSummary,
  ] = await Promise.all([
    db("products")
      .where("active", true)
      .count<CountRow[]>("id as count")
      .first(),
    lowStockProductsQuery().count<CountRow[]>("products.id as count").first(),
    lowStockProductsQuery()
      .select<LowStockProductRow[]>([
        "products.id as productId",
        "products.name as productName",
        "products.current_stock as currentStock",
        "products.reserved_stock as reservedStock",
        db.raw("products.current_stock - products.reserved_stock as ??", [
          "availableStock",
        ]),
        "products.minimum_stock as minimumStock",
      ])
      .orderByRaw("products.current_stock - products.reserved_stock asc")
      .orderBy("products.name", "asc")
      .limit(20),
    productsWithoutMovementQuery()
      .count<CountRow[]>("products.id as count")
      .first(),
    productsWithoutMovementQuery()
      .select<ProductWithoutMovementRow[]>([
        "products.id as productId",
        "products.name as productName",
        "products.current_stock as currentStock",
        "products.minimum_stock as minimumStock",
      ])
      .orderBy("products.name", "asc")
      .limit(20),
    stockTurnoverQuery(filters)
      .select<StockTurnoverProductRow[]>([
        "products.id as productId",
        "products.name as productName",
        db.raw(
          "abs(sum(stock_movements.quantity))::numeric(12, 3)::text as ??",
          ["soldQuantity"],
        ),
        db.raw("max(stock_movements.created_at) as ??", ["lastSaleAt"]),
      ])
      .groupBy("products.id", "products.name")
      .orderByRaw("abs(sum(stock_movements.quantity)) desc")
      .limit(20),
    stockTurnoverQuery(filters)
      .select<StockSummaryRow[]>([
        db.raw(
          "coalesce(abs(sum(stock_movements.quantity)), 0)::numeric(12, 3)::text as ??",
          ["soldQuantity"],
        ),
      ])
      .first(),
  ]);

  return {
    summary: {
      activeProductsCount: Number(activeProducts?.count ?? 0),
      lowStockProductsCount: Number(lowStockProductsCount?.count ?? 0),
      productsWithoutMovementCount: Number(
        productsWithoutMovementCount?.count ?? 0,
      ),
      soldQuantity: stockSummary?.soldQuantity ?? "0.000",
    },
    lowStockProducts,
    productsWithoutMovement,
    turnoverProducts,
  };
}

export async function getPurchaseReport(
  filters: PurchaseReportFilters,
): Promise<PurchaseReport> {
  const [summary, bySource, bySupplier, byProduct] = await Promise.all([
    purchaseReportBaseQuery(filters)
      .select<PurchaseReportSummaryRow[]>([
        db.raw("count(stock_movements.id)::text as ??", ["entriesCount"]),
        db.raw(
          "coalesce(sum(stock_movements.quantity), 0)::numeric(12, 3)::text as ??",
          ["totalQuantity"],
        ),
        db.raw(
          "coalesce(sum(stock_movements.quantity * stock_movements.unit_cost), 0)::numeric(12, 2)::text as ??",
          ["totalAmount"],
        ),
        db.raw(
          `coalesce(sum(case when ${purchaseSourceSql()} = 'MANUAL' then stock_movements.quantity * stock_movements.unit_cost else 0 end), 0)::numeric(12, 2)::text as ??`,
          ["manualAmount"],
        ),
        db.raw(
          `coalesce(sum(case when ${purchaseSourceSql()} = 'XML' then stock_movements.quantity * stock_movements.unit_cost else 0 end), 0)::numeric(12, 2)::text as ??`,
          ["xmlAmount"],
        ),
      ])
      .first(),
    purchaseReportBaseQuery(filters)
      .select<PurchaseBySourceRow[]>([
        db.raw(`${purchaseSourceSql()} as ??`, ["source"]),
        db.raw("count(stock_movements.id)::text as ??", ["entriesCount"]),
        db.raw(
          "sum(stock_movements.quantity)::numeric(12, 3)::text as ??",
          ["totalQuantity"],
        ),
        db.raw(
          "sum(stock_movements.quantity * stock_movements.unit_cost)::numeric(12, 2)::text as ??",
          ["totalAmount"],
        ),
      ])
      .groupByRaw(purchaseSourceSql())
      .orderByRaw(
        "sum(stock_movements.quantity * stock_movements.unit_cost) desc",
      ),
    purchaseReportBaseQuery(filters)
      .join("suppliers", "suppliers.id", "stock_movements.supplier_id")
      .select<PurchaseBySupplierRow[]>([
        "suppliers.id as supplierId",
        "suppliers.name as supplierName",
        db.raw("count(stock_movements.id)::text as ??", ["entriesCount"]),
        db.raw(
          "sum(stock_movements.quantity * stock_movements.unit_cost)::numeric(12, 2)::text as ??",
          ["totalAmount"],
        ),
      ])
      .groupBy("suppliers.id", "suppliers.name")
      .orderByRaw(
        "sum(stock_movements.quantity * stock_movements.unit_cost) desc",
      )
      .limit(20),
    purchaseReportBaseQuery(filters)
      .join("products", "products.id", "stock_movements.product_id")
      .select<PurchaseByProductRow[]>([
        "products.id as productId",
        "products.name as productName",
        db.raw("sum(stock_movements.quantity)::numeric(12, 3)::text as ??", [
          "quantity",
        ]),
        db.raw(
          "sum(stock_movements.quantity * stock_movements.unit_cost)::numeric(12, 2)::text as ??",
          ["totalAmount"],
        ),
      ])
      .groupBy("products.id", "products.name")
      .orderByRaw(
        "sum(stock_movements.quantity * stock_movements.unit_cost) desc",
      )
      .limit(20),
  ]);

  return {
    summary: {
      entriesCount: Number(summary?.entriesCount ?? 0),
      totalQuantity: summary?.totalQuantity ?? "0.000",
      totalAmount: summary?.totalAmount ?? "0.00",
      manualAmount: summary?.manualAmount ?? "0.00",
      xmlAmount: summary?.xmlAmount ?? "0.00",
    },
    bySource: bySource.map((source) => ({
      ...source,
      entriesCount: Number(source.entriesCount),
    })),
    bySupplier: bySupplier.map((supplier) => ({
      ...supplier,
      entriesCount: Number(supplier.entriesCount),
    })),
    byProduct,
  };
}

function lowStockProductsQuery() {
  return db("products")
    .where("products.active", true)
    .where("products.minimum_stock", ">", 0)
    .whereRaw(
      "products.current_stock - products.reserved_stock <= products.minimum_stock",
    );
}

function productsWithoutMovementQuery() {
  return db("products")
    .leftJoin("stock_movements", "stock_movements.product_id", "products.id")
    .where("products.active", true)
    .whereNull("stock_movements.id");
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

function stockTurnoverQuery(filters: StockReportFilters) {
  return db("stock_movements")
    .join("products", "products.id", "stock_movements.product_id")
    .where("products.active", true)
    .where("stock_movements.type", "SALE")
    .modify((query) => {
      if (filters.dateFrom) {
        query.where("stock_movements.created_at", ">=", filters.dateFrom);
      }

      if (filters.dateTo) {
        query.where(
          "stock_movements.created_at",
          "<",
          db.raw("?::date + interval '1 day'", [filters.dateTo]),
        );
      }
    });
}

function purchaseReportBaseQuery(filters: PurchaseReportFilters) {
  return db("stock_movements")
    .where("stock_movements.type", "ENTRY")
    .modify((query) => {
      if (filters.dateFrom) {
        query.where("stock_movements.created_at", ">=", filters.dateFrom);
      }

      if (filters.dateTo) {
        query.where(
          "stock_movements.created_at",
          "<",
          db.raw("?::date + interval '1 day'", [filters.dateTo]),
        );
      }
    });
}

function purchaseSourceSql() {
  return "case when stock_movements.purchase_invoice_id is not null or stock_movements.notes ilike 'Entrada por XML NF-e%' then 'XML' else 'MANUAL' end";
}
