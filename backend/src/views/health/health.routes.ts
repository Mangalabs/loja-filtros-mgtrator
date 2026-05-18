import {
  showDatabaseHealth,
  showHealth,
} from "../../controllers/health/health.controller.js";
import { Router } from "express";

export const healthRoutes = Router();

healthRoutes.get("/health", (_request, response) => {
  response.status(200).json(showHealth());
});

healthRoutes.get("/health/database", async (_request, response) => {
  response.status(200).json(await showDatabaseHealth());
});
