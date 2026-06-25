import { Router } from "express";
import { z } from "zod";
import {
  cancelCounterSale,
  indexSales,
  returnCounterSaleItem,
  storeSale,
} from "../../controllers/sales/sales.controller.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const salesRoutes = Router();

const saleParamsSchema = z.object({
  id: z.uuid(),
});

const createSaleSchema = z
  .object({
    productId: z.uuid().optional(),
    quantity: z.coerce.number().positive().optional(),
    paymentMethodId: z.uuid(),
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

    if (!hasItems && !hasSingleItem) {
      context.addIssue({
        code: "custom",
        message: "Informe ao menos um item para a venda.",
        path: ["items"],
      });
    }
  })
  .transform((value) => ({
    paymentMethodId: value.paymentMethodId,
    clientId: value.clientId,
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

const returnSaleItemSchema = z
  .object({
    saleItemId: z.uuid(),
    quantity: z.coerce.number().positive(),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

salesRoutes.get("/sales", async (_request, response) => {
  response.status(200).json(await indexSales());
});

salesRoutes.post("/sales", async (request, response) => {
  const body = validateBody(request, createSaleSchema);
  const userId = response.locals.authenticatedUser.id as string;

  response.status(201).json(await storeSale(body, userId));
});

salesRoutes.patch("/sales/:id/cancel", async (request, response) => {
  const { id } = saleParamsSchema.parse(request.params);
  const body = validateBody(request, cancelSaleSchema);
  const userId = response.locals.authenticatedUser.id as string;

  response.status(200).json(await cancelCounterSale(id, body.reason, userId));
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
      ),
    );
});
