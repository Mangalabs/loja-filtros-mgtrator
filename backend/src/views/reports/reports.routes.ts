import { Router } from "express";
import { z } from "zod";
import {
  showCashReport,
  showPurchaseReport,
  showReportsOverview,
  showSalesReport,
  showStockReport,
} from "../../controllers/reports/reports.controller.js";
import { requirePermission } from "../../shared/auth/authorization-middleware.js";
import { requireActiveBranchId } from "../../shared/auth/branch-context.js";

export const reportsRoutes = Router();

const salesReportQuerySchema = z.object({
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
});

reportsRoutes.get("/reports/overview", async (_request, response) => {
  response
    .status(200)
    .json(
      await showReportsOverview({
        branchId: requireActiveBranchId(response.locals),
      }),
    );
});

reportsRoutes.get(
  "/reports/sales",
  requirePermission("VIEW_REPORTS"),
  async (request, response) => {
    const query = salesReportQuerySchema.parse(request.query);

    response
      .status(200)
      .json(
        await showSalesReport({
          ...query,
          branchId: requireActiveBranchId(response.locals),
        }),
      );
  },
);

reportsRoutes.get(
  "/reports/stock",
  requirePermission("VIEW_REPORTS"),
  async (request, response) => {
    const query = salesReportQuerySchema.parse(request.query);

    response
      .status(200)
      .json(
        await showStockReport({
          ...query,
          branchId: requireActiveBranchId(response.locals),
        }),
      );
  },
);

reportsRoutes.get(
  "/reports/purchases",
  requirePermission("VIEW_REPORTS"),
  async (request, response) => {
    const query = salesReportQuerySchema.parse(request.query);

    response
      .status(200)
      .json(
        await showPurchaseReport({
          ...query,
          branchId: requireActiveBranchId(response.locals),
        }),
      );
  },
);

reportsRoutes.get(
  "/reports/cash",
  requirePermission("VIEW_REPORTS"),
  async (request, response) => {
    const query = salesReportQuerySchema.parse(request.query);

    response
      .status(200)
      .json(
        await showCashReport({
          ...query,
          branchId: requireActiveBranchId(response.locals),
        }),
      );
  },
);
