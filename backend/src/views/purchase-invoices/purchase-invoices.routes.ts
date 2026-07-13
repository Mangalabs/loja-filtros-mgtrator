import { Router } from "express";
import { z } from "zod";
import {
  indexPurchaseInvoices,
  parsePurchaseInvoiceXml,
  storePurchaseInvoice,
} from "../../controllers/purchase-invoices/purchase-invoices.controller.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const purchaseInvoicesRoutes = Router();

const purchaseInvoiceItemSchema = z.object({
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

const createPurchaseInvoiceSchema = z.object({
  accessKey: z.string().trim().length(44),
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
  xmlContent: z
    .union([z.string().trim().min(1), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional(),
});

const parsePurchaseInvoiceXmlSchema = z.object({
  xmlContent: z.string().trim().min(1),
});

purchaseInvoicesRoutes.get(
  "/purchase-invoices",
  async (_request, response) => {
    const result = await indexPurchaseInvoices();

    response.status(200).json(result);
  },
);

purchaseInvoicesRoutes.post(
  "/purchase-invoices/parse-xml",
  async (request, response) => {
    const body = validateBody(request, parsePurchaseInvoiceXmlSchema);
    const result = parsePurchaseInvoiceXml(body.xmlContent);

    response.status(200).json(result);
  },
);

purchaseInvoicesRoutes.post("/purchase-invoices", async (request, response) => {
  const body = validateBody(request, createPurchaseInvoiceSchema);
  const userId = response.locals.authenticatedUser.id as string;
  const result = await storePurchaseInvoice(body, userId);

  response.status(201).json(result);
});
