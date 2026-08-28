import { Router } from "express";
import { z } from "zod";
import {
  cancelCounterSale,
  indexSales,
  returnCounterSaleItem,
  showSaleReceiptPdf,
  storeSale,
  updateCompletedSaleCommercialDetails,
} from "../../controllers/sales/sales.controller.js";
import { requireActiveBranchId } from "../../shared/auth/branch-context.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const salesRoutes = Router();

const saleParamsSchema = z.object({
  id: z.uuid(),
});

const createSaleSchema = z
  .object({
    productId: z.uuid().optional(),
    quantity: z.coerce.number().positive().optional(),
    paymentMethodId: z.uuid().optional(),
    payments: z
      .array(
        z
          .object({
            paymentMethodId: z.uuid(),
            amount: z.coerce.number().positive(),
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
    discountAmount: z.coerce.number().min(0).optional(),
    allowInsufficientStock: z.boolean().optional(),
    clientId: z
      .union([z.uuid(), z.literal(""), z.null()])
      .transform((value) => value || null)
      .optional(),
    items: z
      .array(
        z
          .object({
            productId: z.uuid(),
            quantity: z.coerce.number().positive(),
          })
          .strict(),
      )
      .min(1)
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const hasItems = Boolean(value.items?.length);
    const hasSingleItem = Boolean(value.productId && value.quantity);
    const hasPayment = Boolean(value.paymentMethodId || value.payments?.length);

    if (!hasItems && !hasSingleItem) {
      context.addIssue({
        code: "custom",
        message: "Informe ao menos um item para a venda.",
        path: ["items"],
      });
    }

    if (!hasPayment) {
      context.addIssue({
        code: "custom",
        message: "Informe ao menos uma forma de pagamento.",
        path: ["payments"],
      });
    }

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
  })
  .transform((value) => ({
    paymentMethodId: value.paymentMethodId,
    payments: value.payments,
    clientId: value.clientId,
    billingIssueDate: value.billingIssueDate,
    billingDueDate: value.billingDueDate,
    discountAmount: value.discountAmount ?? 0,
    allowInsufficientStock: value.allowInsufficientStock ?? false,
    items: value.items ?? [
      {
        productId: value.productId as string,
        quantity: value.quantity as number,
      },
    ],
  }));

const cancelSaleSchema = z
  .object({
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

const updateSaleCommercialDetailsSchema = z
  .object({
    billingIssueDate: z
      .union([z.iso.date(), z.literal(""), z.null()])
      .transform((value) => value || null)
      .optional(),
    billingDueDate: z
      .union([z.iso.date(), z.literal(""), z.null()])
      .transform((value) => value || null)
      .optional(),
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

const returnSaleItemSchema = z
  .object({
    saleItemId: z.uuid(),
    quantity: z.coerce.number().positive(),
    reason: z.string().trim().min(1).max(500),
    refundAmount: z.coerce.number().min(0).optional(),
    refundPaymentMethodId: z.uuid().optional(),
    refundedAt: z
      .union([z.iso.datetime(), z.iso.date(), z.literal(""), z.null()])
      .transform((value) => value || null)
      .optional(),
    refundReference: z
      .union([z.string().trim().min(1).max(120), z.literal(""), z.null()])
      .transform((value) => value || null)
      .optional(),
  })
  .strict();

salesRoutes.get("/sales", async (_request, response) => {
  response.status(200).json(
    await indexSales({
      branchId: requireActiveBranchId(response.locals),
    }),
  );
});

salesRoutes.get("/sales/:id/receipt", async (request, response) => {
  const { id } = saleParamsSchema.parse(request.params);
  const result = await showSaleReceiptPdf(
    id,
    requireActiveBranchId(response.locals),
  );

  response
    .status(200)
    .type("application/pdf")
    .attachment(result.filename)
    .send(result.pdf);
});

salesRoutes.post("/sales", async (request, response) => {
  const body = validateBody(request, createSaleSchema);
  const userId = response.locals.authenticatedUser.id as string;

  response
    .status(201)
    .json(await storeSale(body, userId, requireActiveBranchId(response.locals)));
});

salesRoutes.patch("/sales/:id/cancel", async (request, response) => {
  const { id } = saleParamsSchema.parse(request.params);
  const body = validateBody(request, cancelSaleSchema);
  const userId = response.locals.authenticatedUser.id as string;

  response.status(200).json(
    await cancelCounterSale(
      id,
      body.reason,
      userId,
      requireActiveBranchId(response.locals),
    ),
  );
});

salesRoutes.patch("/sales/:id/commercial-details", async (request, response) => {
  const { id } = saleParamsSchema.parse(request.params);
  const body = validateBody(request, updateSaleCommercialDetailsSchema);

  response.status(200).json(
    await updateCompletedSaleCommercialDetails(
      id,
      body,
      requireActiveBranchId(response.locals),
    ),
  );
});

salesRoutes.post("/sales/:id/returns", async (request, response) => {
  const { id } = saleParamsSchema.parse(request.params);
  const body = validateBody(request, returnSaleItemSchema);
  const userId = response.locals.authenticatedUser.id as string;

  response
    .status(200)
    .json(
      await returnCounterSaleItem(
        id,
        body.saleItemId,
        body.quantity,
        body.reason,
        userId,
        requireActiveBranchId(response.locals),
        {
          refundAmount: body.refundAmount,
          refundPaymentMethodId: body.refundPaymentMethodId,
          refundedAt: body.refundedAt,
          refundReference: body.refundReference,
        },
      ),
    );
});
