import { Router } from "express";
import { showReportsOverview } from "../../controllers/reports/reports.controller.js";

export const reportsRoutes = Router();

reportsRoutes.get("/reports/overview", async (_request, response) => {
  response.status(200).json(await showReportsOverview());
});
