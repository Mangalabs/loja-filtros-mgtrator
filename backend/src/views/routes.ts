import type { Express } from "express";
import { brandsRoutes } from "./brands/brands.routes.js";
import { healthRoutes } from "./health/health.routes.js";
import { productGroupsRoutes } from "./product-groups/product-groups.routes.js";
import { productsRoutes } from "./products/products.routes.js";
import { rootRoutes } from "./root/root.routes.js";
import { stockEntriesRoutes } from "./stock-entries/stock-entries.routes.js";
import { suppliersRoutes } from "./suppliers/suppliers.routes.js";

export function registerRoutes(app: Express): void {
  app.use(rootRoutes);
  app.use(brandsRoutes);
  app.use(healthRoutes);
  app.use(productGroupsRoutes);
  app.use(productsRoutes);
  app.use(stockEntriesRoutes);
  app.use(suppliersRoutes);
}
