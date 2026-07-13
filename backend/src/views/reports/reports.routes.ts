import { Router } from "express";
import { z } from "zod";
import {
  showReportsOverview,
  showSalesReport,
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
