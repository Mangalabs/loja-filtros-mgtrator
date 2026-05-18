import { Router } from "express";
import { showApiInfo } from "../../controllers/root/root.controller.js";

export const rootRoutes = Router();

rootRoutes.get("/", (_request, response) => {
  response.status(200).json(showApiInfo());
});
