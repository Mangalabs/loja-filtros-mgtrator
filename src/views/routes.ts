import type { Express } from "express";
import { healthRoutes } from "./health/health.routes.js";

export function registerRoutes(app: Express): void {
  app.use(healthRoutes);
}
