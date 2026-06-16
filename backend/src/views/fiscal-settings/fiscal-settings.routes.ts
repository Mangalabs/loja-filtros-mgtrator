import { Router } from "express";
import { z } from "zod";
import {
  replaceFiscalSettings,
  showFiscalSettings,
} from "../../controllers/fiscal-settings/fiscal-settings.controller.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const fiscalSettingsRoutes = Router();

const fiscalSettingsSchema = z
  .object({
    provider: z.enum(["MOCK", "FOCUS"]),
    environment: z.enum(["HOMOLOGATION", "PRODUCTION"]),
    companyCnpj: z
      .union([z.string().trim().min(1).max(32), z.literal(""), z.null()])
      .transform((value) => value || null),
    allowProduction: z.boolean(),
  })
  .strict();

fiscalSettingsRoutes.get("/fiscal-settings", async (_request, response) => {
  response.status(200).json(await showFiscalSettings());
});

fiscalSettingsRoutes.put("/fiscal-settings", async (request, response) => {
  const body = validateBody(request, fiscalSettingsSchema);

  response.status(200).json(await replaceFiscalSettings(body));
});
