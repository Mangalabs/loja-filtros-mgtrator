import { Router } from "express";
import { indexAuthEvents } from "../../controllers/auth-events/auth-events.controller.js";
import { requireAdmin } from "../../shared/auth/authorization-middleware.js";

export const authEventsRoutes = Router();

authEventsRoutes.get("/auth-events", requireAdmin, async (_request, response) => {
  response.status(200).json(await indexAuthEvents());
});
