import { Router } from "express";
import { z } from "zod";
import {
  cancelDraftQuote,
  createShippingOrderFromQuote,
  indexQuotes,
  showQuote,
  showQuotePdf,
  storeQuote,
  updateDraftQuote,
} from "../../controllers/quotes/quotes.controller.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const quotesRoutes = Router();

const createQuoteSchema = z
  .object({
    clientId: z.uuid(),
    validUntil: z
      .union([z.iso.date(), z.literal(""), z.null()])
      .transform((value) => value || null)
      .optional(),
    notes: z
      .union([z.string().trim().min(1).max(1000), z.literal(""), z.null()])
      .transform((value) => value || null)
      .optional(),
    showBrand: z.boolean().optional(),
    discountAmount: z.coerce.number().min(0).optional(),
    items: z
      .array(
        z
          .object({
            productId: z.uuid(),
            description: z
              .union([
                z.string().trim().min(1).max(500),
                z.literal(""),
                z.null(),
              ])
              .transform((value) => value || null)
              .optional(),
            quantity: z.coerce.number().positive(),
            unitPrice: z.coerce.number().min(0).nullable().optional(),
            discountAmount: z.coerce.number().min(0).optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

const quoteParamsSchema = z.object({
  id: z.uuid(),
});

const cancelQuoteSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

quotesRoutes.get("/quotes", async (_request, response) => {
  response.status(200).json(await indexQuotes());
});

quotesRoutes.get("/quotes/:id/pdf", async (request, response) => {
  const { id } = quoteParamsSchema.parse(request.params);
  const result = await showQuotePdf(id);

  response
    .status(200)
    .type("application/pdf")
    .attachment(result.filename)
    .send(result.pdf);
});

quotesRoutes.get("/quotes/:id", async (request, response) => {
  const { id } = quoteParamsSchema.parse(request.params);

  response.status(200).json(await showQuote(id));
});

quotesRoutes.post("/quotes", async (request, response) => {
  const body = validateBody(request, createQuoteSchema);
  const userId = response.locals.authenticatedUser.id as string;

  response.status(201).json(await storeQuote(body, userId));
});

quotesRoutes.put("/quotes/:id", async (request, response) => {
  const { id } = quoteParamsSchema.parse(request.params);
  const body = validateBody(request, createQuoteSchema);

  response.status(200).json(await updateDraftQuote(id, body));
});

quotesRoutes.post("/quotes/:id/shipping-order", async (request, response) => {
  const { id } = quoteParamsSchema.parse(request.params);
  const userId = response.locals.authenticatedUser.id as string;

  response.status(201).json(await createShippingOrderFromQuote(id, userId));
});

quotesRoutes.patch("/quotes/:id/cancel", async (request, response) => {
  const { id } = quoteParamsSchema.parse(request.params);
  const body = validateBody(request, cancelQuoteSchema);
  const userId = response.locals.authenticatedUser.id as string;

  response.status(200).json(await cancelDraftQuote(id, body.reason, userId));
});
