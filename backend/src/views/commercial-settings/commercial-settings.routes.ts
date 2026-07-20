import { Router } from "express";
import { z } from "zod";
import {
  replaceCommercialSettings,
  showCommercialSettings,
} from "../../controllers/commercial-settings/commercial-settings.controller.js";
import { requirePermission } from "../../shared/auth/authorization-middleware.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const commercialSettingsRoutes = Router();

const commercialSettingsSchema = z
  .object({
    defaultProfitMarginPercentage: z.coerce.number().min(0).max(1000),
  })
  .strict();

commercialSettingsRoutes.get(
  "/commercial-settings",
  async (_request, response) => {
    response.status(200).json(await showCommercialSettings());
  },
);

commercialSettingsRoutes.put(
  "/commercial-settings",
  requirePermission("MANAGE_COMMERCIAL_SETTINGS"),
  async (request, response) => {
    const body = validateBody(request, commercialSettingsSchema);

    response.status(200).json(await replaceCommercialSettings(body));
  },
);
