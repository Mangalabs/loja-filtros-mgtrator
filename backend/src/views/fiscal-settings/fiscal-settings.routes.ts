import { Router } from "express";
import { z } from "zod";
import {
  replaceFiscalSettings,
  showFiscalSettings,
} from "../../controllers/fiscal-settings/fiscal-settings.controller.js";
import { requirePermission } from "../../shared/auth/authorization-middleware.js";
import { requireActiveBranchId } from "../../shared/auth/branch-context.js";
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
    defaultNatureOperation: z
      .union([z.string().trim().min(1).max(60), z.literal(""), z.null()])
      .transform((value) => value || null)
      .optional(),
    defaultSaleCfop: z
      .union([z.string().trim().min(1).max(4), z.literal(""), z.null()])
      .transform((value) => value || null)
      .optional(),
    defaultIcmsCst: z
      .union([z.string().trim().min(1).max(3), z.literal(""), z.null()])
      .transform((value) => value || null)
      .optional(),
    defaultPisCst: z
      .union([z.string().trim().min(1).max(2), z.literal(""), z.null()])
      .transform((value) => value || null)
      .optional(),
    defaultCofinsCst: z
      .union([z.string().trim().min(1).max(2), z.literal(""), z.null()])
      .transform((value) => value || null)
      .optional(),
    productionConfirmation: z
      .union([z.string().trim().min(1).max(64), z.literal(""), z.null()])
      .transform((value) => value || null)
      .optional(),
  })
  .strict();

fiscalSettingsRoutes.get(
  "/fiscal-settings",
  requirePermission("MANAGE_FISCAL_SETTINGS"),
  async (_request, response) => {
    response
      .status(200)
      .json(await showFiscalSettings(requireActiveBranchId(response.locals)));
  },
);

fiscalSettingsRoutes.put(
  "/fiscal-settings",
  requirePermission("MANAGE_FISCAL_SETTINGS"),
  async (request, response) => {
    const body = validateBody(request, fiscalSettingsSchema);

    response
      .status(200)
      .json(
        await replaceFiscalSettings(requireActiveBranchId(response.locals), body),
      );
  },
);
