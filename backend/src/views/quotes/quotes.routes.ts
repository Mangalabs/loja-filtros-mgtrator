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
import { requireActiveBranchId } from "../../shared/auth/branch-context.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const quotesRoutes = Router();

const createQuoteSchema = z
  .object({
    clientId: z.uuid(),
    paymentMethodId: z.uuid(),
    billingIssueDate: z
      .union([z.iso.date(), z.literal(""), z.null()])
      .transform((value) => value || null)
      .optional(),
    billingDueDate: z
      .union([z.iso.date(), z.literal(""), z.null()])
      .transform((value) => value || null)
      .optional(),
    validUntil: z
      .union([z.iso.date(), z.literal(""), z.null()])
      .transform((value) => value || null)
      .optional(),
    notes: z
      .union([z.string().trim().min(1).max(1000), z.literal(""), z.null()])
      .transform((value) => value || null)
      .optional(),
    showBrand: z.boolean().optional(),
    discountPercentage: z.coerce.number().min(0).max(100).optional(),
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
            discountPercentage: z.coerce.number().min(0).max(100).optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .superRefine((value, context) => {
    const hasValidBillingDates =
      !value.billingIssueDate ||
      !value.billingDueDate ||
      value.billingDueDate >= value.billingIssueDate;

    if (hasValidBillingDates) {
      return;
    }

    context.addIssue({
      code: "custom",
      message: "Vencimento nao pode ser anterior a data da fatura.",
      path: ["billingDueDate"],
    });
  });

const quoteParamsSchema = z.object({
  id: z.uuid(),
});

const cancelQuoteSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

quotesRoutes.get("/quotes", async (_request, response) => {
  response.status(200).json(
    await indexQuotes({
      branchId: requireActiveBranchId(response.locals),
    }),
  );
});

quotesRoutes.get("/quotes/:id/pdf", async (request, response) => {
  const { id } = quoteParamsSchema.parse(request.params);
  const result = await showQuotePdf(
    id,
    requireActiveBranchId(response.locals),
  );

  response
    .status(200)
    .type("application/pdf")
    .attachment(result.filename)
    .send(result.pdf);
});

quotesRoutes.get("/quotes/:id", async (request, response) => {
  const { id } = quoteParamsSchema.parse(request.params);

  response.status(200).json(
    await showQuote(id, requireActiveBranchId(response.locals)),
  );
});

quotesRoutes.post("/quotes", async (request, response) => {
  const body = validateBody(request, createQuoteSchema);
  const userId = response.locals.authenticatedUser.id as string;

  response
    .status(201)
    .json(await storeQuote(body, userId, requireActiveBranchId(response.locals)));
});

quotesRoutes.put("/quotes/:id", async (request, response) => {
  const { id } = quoteParamsSchema.parse(request.params);
  const body = validateBody(request, createQuoteSchema);

  response.status(200).json(
    await updateDraftQuote(id, body, requireActiveBranchId(response.locals)),
  );
});

quotesRoutes.post("/quotes/:id/shipping-order", async (request, response) => {
  const { id } = quoteParamsSchema.parse(request.params);
  const userId = response.locals.authenticatedUser.id as string;

  response.status(201).json(
    await createShippingOrderFromQuote(
      id,
      userId,
      requireActiveBranchId(response.locals),
    ),
  );
});

quotesRoutes.patch("/quotes/:id/cancel", async (request, response) => {
  const { id } = quoteParamsSchema.parse(request.params);
  const body = validateBody(request, cancelQuoteSchema);
  const userId = response.locals.authenticatedUser.id as string;

  response.status(200).json(
    await cancelDraftQuote(
      id,
      body.reason,
      userId,
      requireActiveBranchId(response.locals),
    ),
  );
});
