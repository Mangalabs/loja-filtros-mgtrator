import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import {
  cancelFiscalDocument,
  downloadFiscalDocumentFile,
  indexFiscalDocuments,
  issueManualFiscalDocument,
  issuePickupReservationFiscalDocument,
  issueSaleFiscalDocument,
  issueShippingOrderFiscalDocument,
  mockFiscalDocumentFile,
  previewManualFiscalDocument,
  previewPickupReservationFiscalDocument,
  previewSaleFiscalDocument,
  previewShippingOrderFiscalDocument,
  showFiscalDocument,
  syncFiscalDocument,
  type ManualFiscalDocumentInput,
} from "../../controllers/fiscal-documents/fiscal-documents.controller.js";
import { requirePermission } from "../../shared/auth/authorization-middleware.js";
import { requireActiveBranchId } from "../../shared/auth/branch-context.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const fiscalDocumentsRoutes = Router();

const fiscalDocumentParamsSchema = z.object({
  id: z.uuid(),
});

const fiscalDocumentFileParamsSchema = fiscalDocumentParamsSchema.extend({
  fileType: z.enum(["danfe", "xml"]),
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
    additionalInformation: z
      .union([z.string().trim().max(5000), z.literal(""), z.null()])
      .transform((value) => value || null)
      .default(null),
  })
  .strict();

const manualFiscalDocumentSchema = z
  .object({
    documentType: z.literal("NFE").default("NFE"),
    operationType: z.enum(["ENTRY", "EXIT"]).default("ENTRY"),
    purpose: z.enum(["NORMAL", "RETURN"]).default("RETURN"),
    natureOperation: z.string().trim().min(1).max(60),
    referencedAccessKeys: z
      .array(z.string().trim().regex(/^\d{44}$/))
      .max(10)
      .default([]),
    additionalInformation: z
      .union([z.string().trim().max(5000), z.literal(""), z.null()])
      .transform((value) => value || null)
      .optional(),
    client: z
      .object({
        personType: z.enum(["PF", "PJ", "ES"]).default("PJ"),
        name: z.string().trim().min(1).max(160),
        document: optionalText(32),
        email: optionalText(160),
        phone: optionalText(32),
        stateRegistration: optionalText(32),
        stateRegistrationIndicator: z.enum(["1", "2", "9"]).nullable().default("9"),
        addressStreet: z.string().trim().min(1).max(160),
        addressNumber: z.string().trim().min(1).max(20),
        addressComplement: optionalText(80),
        addressDistrict: z.string().trim().min(1).max(120),
        addressCity: z.string().trim().min(1).max(120),
        addressState: z.string().trim().length(2),
        addressZipCode: z.string().trim().min(8).max(16),
      })
      .strict(),
    items: z
      .array(
        z
          .object({
            productId: z.uuid().nullable().default(null),
            productInternalCode: optionalText(80),
            productName: z.string().trim().min(1).max(180),
            productNcm: optionalText(16),
            productCfop: optionalText(4),
            productIcmsCst: optionalText(3),
            productPisCst: optionalText(2),
            productCofinsCst: optionalText(2),
            productOrigin: optionalText(2),
            productUnit: z.string().trim().min(1).max(16).default("UN"),
            quantity: z.coerce.number().positive(),
            unitPrice: z.coerce.number().min(0),
            discountAmount: z.coerce.number().min(0).default(0),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .refine(
    (value) => value.purpose !== "RETURN" || value.referencedAccessKeys.length > 0,
    {
      message: "Chave da NF-e referenciada e obrigatoria para devolucao.",
      path: ["referencedAccessKeys"],
    },
  );

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
    response
      .status(200)
      .json(
        await indexFiscalDocuments({
          branchId: requireActiveBranchId(response.locals),
        }),
      );
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

    response
      .status(200)
      .json(await showFiscalDocument(id, requireActiveBranchId(response.locals)));
  },
);

fiscalDocumentsRoutes.get(
  "/fiscal-documents/:id/files/:fileType",
  requirePermission("MANAGE_FISCAL_DOCUMENTS"),
  async (request, response) => {
    const { fileType, id } = fiscalDocumentFileParamsSchema.parse(
      request.params,
    );
    const file = await downloadFiscalDocumentFile(
      id,
      requireActiveBranchId(response.locals),
      fileType,
    );

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

fiscalDocumentsRoutes.patch(
  "/fiscal-documents/:id/sync",
  requirePermission("MANAGE_FISCAL_DOCUMENTS"),
  async (request, response) => {
    const { id } = fiscalDocumentParamsSchema.parse(request.params);

    response
      .status(200)
      .json(await syncFiscalDocument(id, requireActiveBranchId(response.locals)));
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
      .json(
        await cancelFiscalDocument(
          id,
          body.reason,
          userId,
          requireActiveBranchId(response.locals),
        ),
      );
  },
);

fiscalDocumentsRoutes.post(
  "/fiscal-documents/manual/preview",
  requirePermission("MANAGE_FISCAL_DOCUMENTS"),
  async (request, response) => {
    const body = validateBody(request, manualFiscalDocumentSchema);
    const file = await previewManualFiscalDocument(
      normalizeManualFiscalDocumentInput(body),
      requireActiveBranchId(response.locals),
    );

    sendFiscalPreview(response, file);
  },
);

fiscalDocumentsRoutes.post(
  "/fiscal-documents/manual",
  requirePermission("MANAGE_FISCAL_DOCUMENTS"),
  async (request, response) => {
    const body = validateBody(request, manualFiscalDocumentSchema);
    const userId = response.locals.authenticatedUser.id as string;

    response
      .status(201)
      .json(
        await issueManualFiscalDocument(
          normalizeManualFiscalDocumentInput(body),
          userId,
          requireActiveBranchId(response.locals),
        ),
      );
  },
);

fiscalDocumentsRoutes.post(
  "/sales/:id/fiscal-documents/preview",
  requirePermission("MANAGE_FISCAL_DOCUMENTS"),
  async (request, response) => {
    const { id } = saleParamsSchema.parse(request.params);
    const body = validateBody(request, issueFiscalDocumentSchema);
    const file = await previewSaleFiscalDocument(
      id,
      body.documentType,
      requireActiveBranchId(response.locals),
      body.additionalInformation ?? null,
    );

    sendFiscalPreview(response, file);
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
          body.additionalInformation ?? null,
        ),
      );
  },
);

fiscalDocumentsRoutes.post(
  "/shipping-orders/:id/fiscal-documents/preview",
  requirePermission("MANAGE_FISCAL_DOCUMENTS"),
  async (request, response) => {
    const { id } = shippingOrderParamsSchema.parse(request.params);
    const body = validateBody(request, issueFiscalDocumentSchema);
    const file = await previewShippingOrderFiscalDocument(
      id,
      body.documentType,
      requireActiveBranchId(response.locals),
      body.additionalInformation ?? null,
    );

    sendFiscalPreview(response, file);
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
          body.additionalInformation ?? null,
        ),
      );
  },
);

fiscalDocumentsRoutes.post(
  "/pickup-reservations/:id/fiscal-documents/preview",
  requirePermission("MANAGE_FISCAL_DOCUMENTS"),
  async (request, response) => {
    const { id } = pickupReservationParamsSchema.parse(request.params);
    const body = validateBody(request, issueFiscalDocumentSchema);
    const file = await previewPickupReservationFiscalDocument(
      id,
      body.documentType,
      requireActiveBranchId(response.locals),
      body.additionalInformation ?? null,
    );

    sendFiscalPreview(response, file);
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
          body.additionalInformation ?? null,
        ),
      );
  },
);

function sendFiscalPreview(
  response: Response,
  file: { content: Buffer; contentType: string; fileName: string },
) {
  response
    .status(200)
    .setHeader("Content-Type", file.contentType)
    .setHeader("Content-Disposition", `inline; filename="${file.fileName}"`)
    .send(file.content);
}

function optionalText(max: number) {
  return z
    .union([z.string().trim().max(max), z.literal(""), z.null()])
    .transform((value) => value || null)
    .default(null);
}

function normalizeManualFiscalDocumentInput(
  body: z.infer<typeof manualFiscalDocumentSchema>,
): ManualFiscalDocumentInput {
  return {
    ...body,
    additionalInformation: body.additionalInformation ?? null,
  };
}
