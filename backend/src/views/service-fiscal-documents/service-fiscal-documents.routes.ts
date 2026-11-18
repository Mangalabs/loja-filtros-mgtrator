import { Router } from "express";
import { z } from "zod";
import {
  cancelServiceFiscalDocument,
  destroyServiceFiscalDocumentDraft,
  indexServiceFiscalDocumentDrafts,
  issueServiceFiscalDocument,
  indexServiceFiscalDocuments,
  previewServiceFiscalDocument,
  replaceServiceFiscalDocumentDraft,
  storeServiceFiscalDocumentDraft,
  syncServiceFiscalDocument,
} from "../../controllers/service-fiscal-documents/service-fiscal-documents.controller.js";
import { requirePermission } from "../../shared/auth/authorization-middleware.js";
import { requireActiveBranchId } from "../../shared/auth/branch-context.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const serviceFiscalDocumentsRoutes = Router();

const paramsSchema = z.object({ id: z.uuid() });
const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(""), z.null()])
    .transform((value) => value || null);
const takerSchema = z
  .object({
    clientId: z.uuid().nullable().default(null),
    personType: z.enum(["PF", "PJ", "ES"]),
    name: z.string().trim().min(1).max(160),
    document: optionalText(32),
    email: optionalText(160),
    phone: optionalText(32),
    addressStreet: z.string().trim().min(1).max(160),
    addressNumber: z.string().trim().min(1).max(20),
    addressComplement: optionalText(80),
    addressDistrict: z.string().trim().min(1).max(120),
    addressCity: z.string().trim().min(1).max(120),
    addressState: z.string().trim().length(2),
    addressZipCode: z.string().trim().min(8).max(16),
    municipalityIbgeCode: z.string().trim().regex(/^\d{7}$/),
  })
  .strict();
const draftSchema = z
  .object({
    serviceId: z.uuid(),
    competenceDate: z.iso.date(),
    serviceDescription: z.string().trim().min(1).max(2000),
    serviceAmount: z.coerce.number().positive().max(9999999999999.99),
    issRate: z.coerce.number().min(2).max(5),
    issRetained: z.boolean(),
    consumerFinal: z.boolean(),
    additionalInformation: optionalText(2000),
    taker: takerSchema,
  })
  .strict();
const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  status: z
    .enum(["PROCESSING", "AUTHORIZED", "REJECTED", "CANCELLED"])
    .optional(),
});
const cancellationSchema = z
  .object({ justification: z.string().trim().min(15).max(255) })
  .strict();

serviceFiscalDocumentsRoutes.get(
  "/service-fiscal-documents",
  requirePermission("MANAGE_FISCAL_DOCUMENTS"),
  async (request, response) => {
    const query = listQuerySchema.parse(request.query);

    response.status(200).json(
      await indexServiceFiscalDocuments({
        branchId: requireActiveBranchId(response.locals),
        ...query,
      }),
    );
  },
);

serviceFiscalDocumentsRoutes.post(
  "/service-fiscal-documents",
  requirePermission("MANAGE_FISCAL_DOCUMENTS"),
  async (request, response) => {
    const payload = validateBody(request, draftSchema);

    response.status(201).json(
      await issueServiceFiscalDocument(
        payload,
        response.locals.authenticatedUser.id as string,
        requireActiveBranchId(response.locals),
      ),
    );
  },
);

serviceFiscalDocumentsRoutes.patch(
  "/service-fiscal-documents/:id/sync",
  requirePermission("MANAGE_FISCAL_DOCUMENTS"),
  async (request, response) => {
    const { id } = paramsSchema.parse(request.params);

    response.status(200).json(
      await syncServiceFiscalDocument(
        id,
        requireActiveBranchId(response.locals),
      ),
    );
  },
);

serviceFiscalDocumentsRoutes.post(
  "/service-fiscal-documents/:id/cancel",
  requirePermission("MANAGE_FISCAL_DOCUMENTS"),
  async (request, response) => {
    const { id } = paramsSchema.parse(request.params);
    const { justification } = validateBody(request, cancellationSchema);

    response.status(200).json(
      await cancelServiceFiscalDocument(
        id,
        justification,
        response.locals.authenticatedUser.id as string,
        requireActiveBranchId(response.locals),
      ),
    );
  },
);

serviceFiscalDocumentsRoutes.post(
  "/service-fiscal-documents/preview",
  requirePermission("MANAGE_FISCAL_DOCUMENTS"),
  async (request, response) => {
    const payload = validateBody(request, draftSchema);
    const file = await previewServiceFiscalDocument(
      payload,
      requireActiveBranchId(response.locals),
    );

    response
      .status(200)
      .setHeader("Content-Type", file.contentType)
      .setHeader("Content-Disposition", `inline; filename="${file.fileName}"`)
      .send(file.content);
  },
);

serviceFiscalDocumentsRoutes.get(
  "/service-fiscal-documents/drafts",
  requirePermission("MANAGE_FISCAL_DOCUMENTS"),
  async (_request, response) => {
    response.status(200).json(
      await indexServiceFiscalDocumentDrafts(
        requireActiveBranchId(response.locals),
        response.locals.authenticatedUser.id as string,
      ),
    );
  },
);

serviceFiscalDocumentsRoutes.post(
  "/service-fiscal-documents/drafts",
  requirePermission("MANAGE_FISCAL_DOCUMENTS"),
  async (request, response) => {
    const payload = validateBody(request, draftSchema);

    response.status(201).json(
      await storeServiceFiscalDocumentDraft(
        payload,
        response.locals.authenticatedUser.id as string,
        requireActiveBranchId(response.locals),
      ),
    );
  },
);

serviceFiscalDocumentsRoutes.put(
  "/service-fiscal-documents/drafts/:id",
  requirePermission("MANAGE_FISCAL_DOCUMENTS"),
  async (request, response) => {
    const { id } = paramsSchema.parse(request.params);
    const payload = validateBody(request, draftSchema);

    response.status(200).json(
      await replaceServiceFiscalDocumentDraft(
        id,
        payload,
        response.locals.authenticatedUser.id as string,
        requireActiveBranchId(response.locals),
      ),
    );
  },
);

serviceFiscalDocumentsRoutes.delete(
  "/service-fiscal-documents/drafts/:id",
  requirePermission("MANAGE_FISCAL_DOCUMENTS"),
  async (request, response) => {
    const { id } = paramsSchema.parse(request.params);

    response.status(200).json(
      await destroyServiceFiscalDocumentDraft(
        id,
        response.locals.authenticatedUser.id as string,
        requireActiveBranchId(response.locals),
      ),
    );
  },
);
