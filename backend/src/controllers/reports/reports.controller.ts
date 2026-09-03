import {
  getCashReport,
  getInventoryReport,
  getReportsOverview,
  getPurchaseReport,
  getSalesReport,
  getStockReport,
  getUserPerformanceReport,
  type CashReportFilters,
  type InventoryReportFilters,
  type PurchaseReportFilters,
  type SalesReportFilters,
  type StockReportFilters,
  type UserPerformanceReportFilters,
} from "../../models/reports/reports.model.js";

export async function showReportsOverview(filters: { branchId: string }) {
  return {
    code: 200,
    status: "success",
    data: await getReportsOverview(filters),
  };
}

export async function showSalesReport(filters: SalesReportFilters) {
  return {
    code: 200,
    status: "success",
    data: await getSalesReport(filters),
  };
}

export async function showStockReport(filters: StockReportFilters) {
  return {
    code: 200,
    status: "success",
    data: await getStockReport(filters),
  };
}

export async function showInventoryReport(filters: InventoryReportFilters) {
  return {
    code: 200,
    status: "success",
    data: await getInventoryReport(filters),
  };
}

export async function showPurchaseReport(filters: PurchaseReportFilters) {
  return {
    code: 200,
    status: "success",
    data: await getPurchaseReport(filters),
  };
}

export async function showCashReport(filters: CashReportFilters) {
  return {
    code: 200,
    status: "success",
    data: await getCashReport(filters),
  };
}

export async function showUserPerformanceReport(
  filters: UserPerformanceReportFilters,
) {
  return {
    code: 200,
    status: "success",
    data: await getUserPerformanceReport(filters),
  };
}
