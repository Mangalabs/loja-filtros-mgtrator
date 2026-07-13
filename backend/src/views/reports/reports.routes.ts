import { Router } from "express";
import { z } from "zod";
import {
  showPurchaseReport,
  showReportsOverview,
  showSalesReport,
  showStockReport,
} from "../../controllers/reports/reports.controller.js";

export const reportsRoutes = Router();

const salesReportQuerySchema = z.object({
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
});

reportsRoutes.get("/reports/overview", async (_request, response) => {
  response.status(200).json(await showReportsOverview());
});

reportsRoutes.get("/reports/sales", async (request, response) => {
  const query = salesReportQuerySchema.parse(request.query);

  response.status(200).json(await showSalesReport(query));
});

reportsRoutes.get("/reports/stock", async (request, response) => {
  const query = salesReportQuerySchema.parse(request.query);

  response.status(200).json(await showStockReport(query));
});

reportsRoutes.get("/reports/purchases", async (request, response) => {
  const query = salesReportQuerySchema.parse(request.query);

  response.status(200).json(await showPurchaseReport(query));
});
