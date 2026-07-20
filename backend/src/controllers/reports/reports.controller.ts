import {
  getCashReport,
  getReportsOverview,
  getPurchaseReport,
  getSalesReport,
  getStockReport,
  type CashReportFilters,
  type PurchaseReportFilters,
  type SalesReportFilters,
  type StockReportFilters,
} from "../../models/reports/reports.model.js";

export async function showReportsOverview() {
  return {
    code: 200,
    status: "success",
    data: await getReportsOverview(),
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
