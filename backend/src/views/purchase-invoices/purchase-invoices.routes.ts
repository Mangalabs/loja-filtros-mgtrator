import { Router } from "express";
import { z } from "zod";
import {
  cancelPurchaseInvoice,
  importPurchaseInvoiceXml,
  indexPurchaseInvoices,
  parsePurchaseInvoiceXml,
  postPurchaseInvoice,
  storePurchaseInvoice,
  updatePurchaseInvoice,
} from "../../controllers/purchase-invoices/purchase-invoices.controller.js";
import { requireActiveBranchId } from "../../shared/auth/branch-context.js";
import { requirePermission } from "../../shared/auth/authorization-middleware.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const purchaseInvoicesRoutes = Router();

const purchaseInvoiceItemSchema = z.object({
  cest: z
    .union([z.string().trim().min(1).max(16), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional(),
  cfop: z
    .union([z.string().trim().length(4), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional(),
  description: z.string().trim().min(1).max(500),
  ncm: z
    .union([z.string().trim().length(8), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional(),
  position: z.coerce.number().int().positive(),
  productId: z
    .union([z.uuid(), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional(),
  quantity: z.coerce.number().positive(),
  supplierProductCode: z
    .union([z.string().trim().min(1).max(80), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional(),
  totalAmount: z.coerce.number().min(0),
  unit: z
    .union([z.string().trim().min(1).max(20), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional(),
  unitCost: z.coerce.number().min(0),
});

const purchaseInvoiceInstallmentSchema = z.object({
  dueDate: z
    .union([z.iso.date(), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional(),
  number: z
    .union([z.string().trim().min(1).max(20), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional(),
  value: z.coerce.number().min(0),
});

const createPurchaseInvoiceSchema = z.object({
  accessKey: z.string().trim().length(44),
  installments: z.array(purchaseInvoiceInstallmentSchema).optional(),
  issueDate: z
    .union([z.iso.date(), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional(),
  items: z.array(purchaseInvoiceItemSchema).min(1),
  number: z
    .union([z.string().trim().min(1).max(20), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional(),
  series: z
    .union([z.string().trim().min(1).max(10), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional(),
  supplierDocument: z
    .union([z.string().trim().min(1).max(20), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional(),
  supplierId: z
    .union([z.uuid(), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional(),
  supplierName: z.string().trim().min(1).max(160),
  totalAmount: z.coerce.number().min(0),
  transporterDocument: z
    .union([z.string().trim().min(1).max(20), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional(),
  transporterName: z
    .union([z.string().trim().min(1).max(160), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional(),
  xmlContent: z
    .union([z.string().trim().min(1), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional(),
});

const updatePurchaseInvoiceSchema = createPurchaseInvoiceSchema.omit({
  accessKey: true,
  xmlContent: true,
});

const parsePurchaseInvoiceXmlSchema = z.object({
  xmlContent: z.string().trim().min(1),
});

const purchaseInvoiceParamsSchema = z.object({
  id: z.uuid(),
});

purchaseInvoicesRoutes.get(
  "/purchase-invoices",
  requirePermission("IMPORT_PURCHASE_INVOICES"),
  async (_request, response) => {
    const result = await indexPurchaseInvoices({
      branchId: requireActiveBranchId(response.locals),
    });

    response.status(200).json(result);
  },
);

purchaseInvoicesRoutes.post(
  "/purchase-invoices/parse-xml",
  requirePermission("IMPORT_PURCHASE_INVOICES"),
  async (request, response) => {
    const body = validateBody(request, parsePurchaseInvoiceXmlSchema);
    const result = parsePurchaseInvoiceXml(body.xmlContent);

    response.status(200).json(result);
  },
);

purchaseInvoicesRoutes.post(
  "/purchase-invoices/import-xml",
  requirePermission("IMPORT_PURCHASE_INVOICES"),
  async (request, response) => {
    const body = validateBody(request, parsePurchaseInvoiceXmlSchema);
    const userId = response.locals.authenticatedUser.id as string;
    const result = await importPurchaseInvoiceXml(
      body.xmlContent,
      userId,
      requireActiveBranchId(response.locals),
    );

    response.status(201).json(result);
  },
);

purchaseInvoicesRoutes.post(
  "/purchase-invoices",
  requirePermission("IMPORT_PURCHASE_INVOICES"),
  async (request, response) => {
    const body = validateBody(request, createPurchaseInvoiceSchema);
    const userId = response.locals.authenticatedUser.id as string;
    const result = await storePurchaseInvoice(
      body,
      userId,
      requireActiveBranchId(response.locals),
    );

    response.status(201).json(result);
  },
);

purchaseInvoicesRoutes.put(
  "/purchase-invoices/:id",
  requirePermission("IMPORT_PURCHASE_INVOICES"),
  async (request, response) => {
    const { id } = purchaseInvoiceParamsSchema.parse(request.params);
    const body = validateBody(request, updatePurchaseInvoiceSchema);
    const result = await updatePurchaseInvoice(
      id,
      body,
      requireActiveBranchId(response.locals),
    );

    response.status(200).json(result);
  },
);

purchaseInvoicesRoutes.post(
  "/purchase-invoices/:id/post",
  requirePermission("IMPORT_PURCHASE_INVOICES"),
  async (request, response) => {
    const { id } = purchaseInvoiceParamsSchema.parse(request.params);
    const userId = response.locals.authenticatedUser.id as string;
    const result = await postPurchaseInvoice(
      id,
      userId,
      requireActiveBranchId(response.locals),
    );

    response.status(200).json(result);
  },
);

purchaseInvoicesRoutes.post(
  "/purchase-invoices/:id/cancel",
  requirePermission("IMPORT_PURCHASE_INVOICES"),
  async (request, response) => {
    const { id } = purchaseInvoiceParamsSchema.parse(request.params);
    const result = await cancelPurchaseInvoice(
      id,
      requireActiveBranchId(response.locals),
    );

    response.status(200).json(result);
  },
);
