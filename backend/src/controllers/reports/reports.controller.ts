import {
  getReportsOverview,
  getSalesReport,
  type SalesReportFilters,
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
