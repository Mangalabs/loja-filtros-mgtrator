import { Router } from "express";
import { z } from "zod";
import {
  cancelDraftQuote,
  completeQuoteAsSale,
  createShippingOrderFromQuote,
  destroyQuoteProductAlias,
  destroyQuoteFormDraft,
  indexQuoteProductMatchBatch,
  indexQuoteProductMatches,
  indexQuoteFormDrafts,
  indexQuotes,
  replaceQuoteFormDraft,
  showQuote,
  showQuotePdf,
  storeQuoteFormDraft,
  storeQuoteFormDraftBatch,
  storeQuoteProductAlias,
  storeQuote,
  storeQuoteFromFormDraft,
  updateDraftQuote,
} from "../../controllers/quotes/quotes.controller.js";
import { requireActiveBranchId } from "../../shared/auth/branch-context.js";
import { saleClosingSchema } from "../../shared/validation/sale-closing-schema.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const quotesRoutes = Router();

const createQuoteSchema = z
  .object({
    clientId: z.uuid(),
    paymentMethodId: z.uuid(),
    payments: z
      .array(
        z
          .object({
            paymentMethodId: z.uuid(),
            amount: z.coerce.number().positive(),
            position: z.coerce.number().int().positive().optional(),
          })
          .strict(),
      )
      .min(1)
      .optional(),
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
    discountAmount: z.coerce.number().min(0).optional(),
    paymentInstallments: z
      .array(
        z
          .object({
            position: z.coerce.number().int().positive(),
            dueDate: z.iso.date(),
            amount: z.coerce.number().positive(),
          })
          .strict(),
      )
      .optional(),
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

const quoteFormDraftPayloadSchema = z.record(z.string(), z.unknown());

const quoteFormDraftBatchSchema = z
  .object({
    requests: z
      .array(
        z.union([
          z.string().trim().min(1).max(180),
          z
            .object({
              requestLabel: z.string().trim().min(1).max(180),
              items: z
                .array(
                  z
                    .object({
                      description: z.string().trim().min(1).max(500),
                      quantity: z.coerce.number().positive(),
                    })
                    .strict(),
                )
                .max(20),
            })
            .strict(),
        ]),
      )
      .min(1)
      .max(20),
  })
  .strict();

const quoteProductMatchesQuerySchema = z.object({
  query: z.string().trim().min(2).max(180),
  limit: z.coerce.number().int().min(1).max(5).default(3),
});

const quoteProductMatchBatchSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            key: z.string().trim().min(1).max(80),
            query: z.string().trim().min(2).max(180),
          })
          .strict(),
      )
      .min(1)
      .max(50),
    limit: z.coerce.number().int().min(1).max(5).default(3),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.items.map(({ key }) => key)).size === value.items.length) {
      return;
    }

    context.addIssue({
      code: "custom",
      message: "Cada item deve possuir uma chave unica.",
      path: ["items"],
    });
  });

const quoteProductAliasSchema = z
  .object({
    alias: z.string().trim().min(2).max(180),
    productId: z.uuid(),
  })
  .strict();

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

quotesRoutes.get("/quotes/drafts", async (_request, response) => {
  const userId = response.locals.authenticatedUser.id as string;

  response.status(200).json(
    await indexQuoteFormDrafts(
      requireActiveBranchId(response.locals),
      userId,
    ),
  );
});

quotesRoutes.get("/quotes/product-matches", async (request, response) => {
  const { query, limit } = quoteProductMatchesQuerySchema.parse(request.query);

  response.status(200).json(
    await indexQuoteProductMatches(
      query,
      limit,
      requireActiveBranchId(response.locals),
    ),
  );
});

quotesRoutes.post("/quotes/product-matches/batch", async (request, response) => {
  const { items, limit } = validateBody(request, quoteProductMatchBatchSchema);

  response.status(200).json(
    await indexQuoteProductMatchBatch(
      items,
      limit,
      requireActiveBranchId(response.locals),
    ),
  );
});

quotesRoutes.post("/quotes/product-aliases", async (request, response) => {
  const input = validateBody(request, quoteProductAliasSchema);
  const userId = response.locals.authenticatedUser.id as string;

  response.status(201).json(
    await storeQuoteProductAlias(
      input,
      userId,
      requireActiveBranchId(response.locals),
    ),
  );
});

quotesRoutes.delete("/quotes/product-aliases/:id", async (request, response) => {
  const { id } = quoteParamsSchema.parse(request.params);
  const userId = response.locals.authenticatedUser.id as string;

  response.status(200).json(
    await destroyQuoteProductAlias(
      id,
      userId,
      requireActiveBranchId(response.locals),
    ),
  );
});

quotesRoutes.post("/quotes/drafts", async (request, response) => {
  const payload = validateBody(request, quoteFormDraftPayloadSchema);
  const userId = response.locals.authenticatedUser.id as string;

  response.status(201).json(
    await storeQuoteFormDraft(
      payload,
      userId,
      requireActiveBranchId(response.locals),
    ),
  );
});

quotesRoutes.post("/quotes/drafts/batch", async (request, response) => {
  const { requests } = validateBody(request, quoteFormDraftBatchSchema);
  const userId = response.locals.authenticatedUser.id as string;

  response.status(201).json(
    await storeQuoteFormDraftBatch(
      requests,
      userId,
      requireActiveBranchId(response.locals),
    ),
  );
});

quotesRoutes.post("/quotes/drafts/:id/quote", async (request, response) => {
  const { id } = quoteParamsSchema.parse(request.params);
  const input = validateBody(request, createQuoteSchema);
  const userId = response.locals.authenticatedUser.id as string;

  response.status(201).json(
    await storeQuoteFromFormDraft(
      id,
      input,
      userId,
      requireActiveBranchId(response.locals),
    ),
  );
});

quotesRoutes.put("/quotes/drafts/:id", async (request, response) => {
  const { id } = quoteParamsSchema.parse(request.params);
  const payload = validateBody(request, quoteFormDraftPayloadSchema);
  const userId = response.locals.authenticatedUser.id as string;

  response.status(200).json(
    await replaceQuoteFormDraft(
      id,
      payload,
      userId,
      requireActiveBranchId(response.locals),
    ),
  );
});

quotesRoutes.delete("/quotes/drafts/:id", async (request, response) => {
  const { id } = quoteParamsSchema.parse(request.params);
  const userId = response.locals.authenticatedUser.id as string;

  response.status(200).json(
    await destroyQuoteFormDraft(
      id,
      userId,
      requireActiveBranchId(response.locals),
    ),
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

quotesRoutes.post("/quotes/:id/sale", async (request, response) => {
  const { id } = quoteParamsSchema.parse(request.params);
  const body = validateBody(request, saleClosingSchema);
  const userId = response.locals.authenticatedUser.id as string;

  response.status(201).json(
    await completeQuoteAsSale(
      id,
      body,
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
