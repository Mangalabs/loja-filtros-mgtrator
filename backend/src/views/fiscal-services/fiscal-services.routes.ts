import { Router } from "express";
import { z } from "zod";
import {
  indexFiscalServices,
  replaceFiscalService,
  storeFiscalService,
} from "../../controllers/fiscal-services/fiscal-services.controller.js";
import {
  requireAnyPermission,
  requirePermission,
} from "../../shared/auth/authorization-middleware.js";
import { requireActiveBranchId } from "../../shared/auth/branch-context.js";
import { parseBooleanFilter } from "../../shared/http/query-params.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const fiscalServicesRoutes = Router();

const nationalTaxCodeSchema = z
  .string()
  .trim()
  .min(6)
  .max(10)
  .transform((value) => value.replace(/\D/g, ""))
  .refine((value) => /^\d{6}$/.test(value), {
    message: "Codigo nacional deve conter 6 digitos.",
  });

const createFiscalServiceSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    nationalTaxCode: nationalTaxCodeSchema,
    municipalTaxCode: z
      .union([z.string().trim().max(40), z.null()])
      .transform((value) => value || null)
      .optional(),
    municipalActivityCode: z
      .union([
        z.string().trim().regex(/^\d{9}$/),
        z.literal(""),
        z.null(),
      ])
      .transform((value) => value || null)
      .optional(),
    nbsCode: z
      .union([
        z.string().trim().regex(/^\d{9}$/),
        z.literal(""),
        z.null(),
      ])
      .transform((value) => value || null)
      .optional(),
    description: z
      .union([z.string().trim().max(2000), z.null()])
      .transform((value) => value || null),
    issRate: z.coerce.number().min(2).max(5),
    active: z.boolean().optional(),
  })
  .strict();
const updateFiscalServiceSchema = createFiscalServiceSchema.extend({
  active: z.boolean(),
});
const fiscalServiceParamsSchema = z.object({ id: z.uuid() });

fiscalServicesRoutes.get(
  "/fiscal-services",
  requireAnyPermission([
    "MANAGE_FISCAL_SETTINGS",
    "MANAGE_FISCAL_DOCUMENTS",
  ]),
  async (request, response) => {
    response.status(200).json(
      await indexFiscalServices({
        branchId: requireActiveBranchId(response.locals),
        active: parseBooleanFilter(request.query.active),
      }),
    );
  },
);

fiscalServicesRoutes.post(
  "/fiscal-services",
  requirePermission("MANAGE_FISCAL_SETTINGS"),
  async (request, response) => {
    const body = validateBody(request, createFiscalServiceSchema);

    response
      .status(201)
      .json(
        await storeFiscalService(
          requireActiveBranchId(response.locals),
          body,
        ),
      );
  },
);

fiscalServicesRoutes.put(
  "/fiscal-services/:id",
  requirePermission("MANAGE_FISCAL_SETTINGS"),
  async (request, response) => {
    const { id } = fiscalServiceParamsSchema.parse(request.params);
    const body = validateBody(request, updateFiscalServiceSchema);

    response
      .status(200)
      .json(
        await replaceFiscalService(
          id,
          requireActiveBranchId(response.locals),
          body,
        ),
      );
  },
);
