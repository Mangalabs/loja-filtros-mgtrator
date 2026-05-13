import type { Express } from "express";
import { brandsRoutes } from "./brands/brands.routes.js";
import { healthRoutes } from "./health/health.routes.js";
import { productsRoutes } from "./products/products.routes.js";

export function registerRoutes(app: Express): void {
  app.use(brandsRoutes);
  app.use(healthRoutes);
  app.use(productsRoutes);
}
