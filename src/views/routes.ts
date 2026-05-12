import type { Express } from "express";
import { healthRoutes } from "./health/health.routes.js";
import { productsRoutes } from "./products/products.routes.js";

export function registerRoutes(app: Express): void {
  app.use(healthRoutes);
  app.use(productsRoutes);
}
