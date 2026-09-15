import { Router } from "express";
import { z } from "zod";
import {
  generateCashReportPdf,
  generateInventoryReportPdf,
  generatePurchaseReportPdf,
  generateSalesReportPdf,
  generateStockReportPdf,
  generateUserPerformanceReportPdf,
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
  columns: z
    .preprocess(
      (value) => (Array.isArray(value) ? value : value ? [value] : undefined),
      z
        .array(
          z.enum([
            "internalCode",
            "productName",
            "unit",
            "currentStock",
            "location",
            "ncm",
            "previousStock",
            "entryQuantity",
            "exitQuantity",
            "availableStock",
            "costPrice",
          ]),
        )
        .optional(),
    ),
  locations: z
    .preprocess(
      (value) => (Array.isArray(value) ? value : value ? [value] : undefined),
      z.array(z.string().trim().min(1).max(120)).optional(),
    ),
  search: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(0).max(10000).optional(),
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
  "/reports/sales/pdf",
  requirePermission("VIEW_REPORTS"),
  async (request, response) => {
    const query = salesReportQuerySchema.parse(request.query);
    const pdf = await generateSalesReportPdf({
      ...query,
      branchId: requireActiveBranchId(response.locals),
    });

    sendReportPdf(response, pdf, "relatorio-vendas.pdf");
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
  "/reports/stock/pdf",
  requirePermission("VIEW_REPORTS"),
  async (request, response) => {
    const query = salesReportQuerySchema.parse(request.query);
    const pdf = await generateStockReportPdf({
      ...query,
      branchId: requireActiveBranchId(response.locals),
    });

    sendReportPdf(response, pdf, "relatorio-estoque.pdf");
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
  "/reports/inventory/pdf",
  requirePermission("VIEW_REPORTS"),
  async (request, response) => {
    const query = inventoryReportQuerySchema.parse(request.query);
    const pdf = await generateInventoryReportPdf({
      ...query,
      branchId: requireActiveBranchId(response.locals),
    });

    sendReportPdf(response, pdf, "relatorio-inventario.pdf");
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
  "/reports/purchases/pdf",
  requirePermission("VIEW_REPORTS"),
  async (request, response) => {
    const query = salesReportQuerySchema.parse(request.query);
    const pdf = await generatePurchaseReportPdf({
      ...query,
      branchId: requireActiveBranchId(response.locals),
    });

    sendReportPdf(response, pdf, "relatorio-compras.pdf");
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
  "/reports/cash/pdf",
  requirePermission("VIEW_REPORTS"),
  async (request, response) => {
    const query = salesReportQuerySchema.parse(request.query);
    const pdf = await generateCashReportPdf({
      ...query,
      branchId: requireActiveBranchId(response.locals),
    });

    sendReportPdf(response, pdf, "relatorio-caixa.pdf");
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

reportsRoutes.get(
  "/reports/users/pdf",
  requirePermission("VIEW_REPORTS"),
  async (request, response) => {
    const query = salesReportQuerySchema.parse(request.query);
    const pdf = await generateUserPerformanceReportPdf({
      ...query,
      branchId: requireActiveBranchId(response.locals),
    });

    sendReportPdf(response, pdf, "relatorio-usuarios.pdf");
  },
);

function sendReportPdf(response: import("express").Response, pdf: Buffer, filename: string) {
  response
    .status(200)
    .setHeader("content-type", "application/pdf")
    .setHeader("content-disposition", `attachment; filename="${filename}"`)
    .send(pdf);
}
