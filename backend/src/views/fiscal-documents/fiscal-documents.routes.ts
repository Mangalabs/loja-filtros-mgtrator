import { Router } from "express";
import { z } from "zod";
import {
  cancelFiscalDocument,
  indexFiscalDocuments,
  issuePickupReservationFiscalDocument,
  issueSaleFiscalDocument,
  issueShippingOrderFiscalDocument,
  mockFiscalDocumentFile,
  showFiscalDocument,
  syncFiscalDocument,
} from "../../controllers/fiscal-documents/fiscal-documents.controller.js";
import { requirePermission } from "../../shared/auth/authorization-middleware.js";
import { requireActiveBranchId } from "../../shared/auth/branch-context.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const fiscalDocumentsRoutes = Router();

const fiscalDocumentParamsSchema = z.object({
  id: z.uuid(),
});

const saleParamsSchema = z.object({
  id: z.uuid(),
});

const shippingOrderParamsSchema = z.object({
  id: z.uuid(),
});

const pickupReservationParamsSchema = z.object({
  id: z.uuid(),
});

const issueFiscalDocumentSchema = z
  .object({
    documentType: z.literal("NFE").default("NFE"),
  })
  .strict();

const cancelFiscalDocumentSchema = z
  .object({
    reason: z.string().trim().min(15).max(255),
  })
  .strict();

const mockFiscalDocumentFileParamsSchema = z.object({
  extension: z.enum(["pdf", "xml"]),
  reference: z.string().trim().min(1).max(160),
});

fiscalDocumentsRoutes.get(
  "/fiscal-documents",
  requirePermission("MANAGE_FISCAL_DOCUMENTS"),
  async (_request, response) => {
    response.status(200).json(await indexFiscalDocuments());
  },
);

fiscalDocumentsRoutes.get(
  "/mock/fiscal-documents/:reference.:extension",
  async (request, response) => {
    const { extension, reference } = mockFiscalDocumentFileParamsSchema.parse(
      request.params,
    );
    const file = mockFiscalDocumentFile(reference, extension);

    response
      .status(200)
      .setHeader("Content-Type", file.contentType)
      .setHeader(
        "Content-Disposition",
        `attachment; filename="${file.fileName}"`,
      )
      .send(file.content);
  },
);

fiscalDocumentsRoutes.get(
  "/fiscal-documents/:id",
  requirePermission("MANAGE_FISCAL_DOCUMENTS"),
  async (request, response) => {
    const { id } = fiscalDocumentParamsSchema.parse(request.params);

    response.status(200).json(await showFiscalDocument(id));
  },
);

fiscalDocumentsRoutes.patch(
  "/fiscal-documents/:id/sync",
  requirePermission("MANAGE_FISCAL_DOCUMENTS"),
  async (request, response) => {
    const { id } = fiscalDocumentParamsSchema.parse(request.params);

    response.status(200).json(await syncFiscalDocument(id));
  },
);

fiscalDocumentsRoutes.patch(
  "/fiscal-documents/:id/cancel",
  requirePermission("MANAGE_FISCAL_DOCUMENTS"),
  async (request, response) => {
    const { id } = fiscalDocumentParamsSchema.parse(request.params);
    const body = validateBody(request, cancelFiscalDocumentSchema);
    const userId = response.locals.authenticatedUser.id as string;

    response
      .status(200)
      .json(await cancelFiscalDocument(id, body.reason, userId));
  },
);

fiscalDocumentsRoutes.post(
  "/sales/:id/fiscal-documents",
  requirePermission("MANAGE_FISCAL_DOCUMENTS"),
  async (request, response) => {
    const { id } = saleParamsSchema.parse(request.params);
    const body = validateBody(request, issueFiscalDocumentSchema);
    const userId = response.locals.authenticatedUser.id as string;

    response
      .status(201)
      .json(
        await issueSaleFiscalDocument(
          id,
          userId,
          body.documentType,
          requireActiveBranchId(response.locals),
        ),
      );
  },
);

fiscalDocumentsRoutes.post(
  "/shipping-orders/:id/fiscal-documents",
  requirePermission("MANAGE_FISCAL_DOCUMENTS"),
  async (request, response) => {
    const { id } = shippingOrderParamsSchema.parse(request.params);
    const body = validateBody(request, issueFiscalDocumentSchema);
    const userId = response.locals.authenticatedUser.id as string;

    response
      .status(201)
      .json(
        await issueShippingOrderFiscalDocument(
          id,
          userId,
          body.documentType,
          requireActiveBranchId(response.locals),
        ),
      );
  },
);

fiscalDocumentsRoutes.post(
  "/pickup-reservations/:id/fiscal-documents",
  requirePermission("MANAGE_FISCAL_DOCUMENTS"),
  async (request, response) => {
    const { id } = pickupReservationParamsSchema.parse(request.params);
    const body = validateBody(request, issueFiscalDocumentSchema);
    const userId = response.locals.authenticatedUser.id as string;

    response
      .status(201)
      .json(
        await issuePickupReservationFiscalDocument(
          id,
          userId,
          body.documentType,
          requireActiveBranchId(response.locals),
        ),
      );
  },
);
