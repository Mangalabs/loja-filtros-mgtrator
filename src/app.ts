import express from "express";
import { registerRoutes } from "./views/routes.js";

export function createApp() {
  const app = express();

  app.use(express.json());
  registerRoutes(app);

  return app;
}
