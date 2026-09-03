import { Router } from "express";
import { z } from "zod";
import {
  showCashReport,
  showInventoryReport,
  showPurchaseReport,
  showReportsOverview,
  showSalesReport,
  showStockReport,
  showUserPerformanceReport,
} from "../../controllers/reports/reports.controller.js";
import { requirePermission } from "../../shared/auth/authorization-middleware.js";
import { requireActiveBranchId } from "../../shared/auth/branch-context.js";

export const reportsRoutes = Router();

const salesReportQuerySchema = z.object({
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
});

const inventoryReportQuerySchema = z.object({
  active: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  search: z.string().trim().min(1).max(120).optional(),
  stockStatus: z
    .enum(["ALL", "LOW", "NEGATIVE", "AVAILABLE", "OUT_OF_STOCK"])
    .optional(),
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
  "/reports/inventory",
  requirePermission("VIEW_REPORTS"),
  async (request, response) => {
    const query = inventoryReportQuerySchema.parse(request.query);

    response
      .status(200)
      .json(
        await showInventoryReport({
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

reportsRoutes.get(
  "/reports/users",
  requirePermission("VIEW_REPORTS"),
  async (request, response) => {
    const query = salesReportQuerySchema.parse(request.query);

    response
      .status(200)
      .json(
        await showUserPerformanceReport({
          ...query,
          branchId: requireActiveBranchId(response.locals),
        }),
      );
  },
);
