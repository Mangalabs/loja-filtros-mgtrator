import { Router } from "express";
import { z } from "zod";
import { indexAuthEvents } from "../../controllers/auth-events/auth-events.controller.js";
import { authEventTypeValues } from "../../models/auth-events/auth-events.model.js";
import { requireAdmin } from "../../shared/auth/authorization-middleware.js";

export const authEventsRoutes = Router();

const authEventsQuerySchema = z.object({
  email: optionalText(160),
  eventType: z.enum(authEventTypeValues).optional(),
  dateFrom: optionalText(32),
  dateTo: optionalText(32),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(5).max(100).default(15),
});

authEventsRoutes.get("/auth-events", requireAdmin, async (request, response) => {
  const query = authEventsQuerySchema.parse(request.query);

  response.status(200).json(await indexAuthEvents(query));
});

function optionalText(max: number) {
  return z
    .union([z.string().trim().min(1).max(max), z.literal(""), z.null()])
    .transform((value) => value || undefined)
    .optional();
}
