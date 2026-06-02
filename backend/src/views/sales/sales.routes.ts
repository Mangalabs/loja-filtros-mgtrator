import { Router } from "express";
import { z } from "zod";
import { indexSales, storeSale } from "../../controllers/sales/sales.controller.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const salesRoutes = Router();

const createSaleSchema = z
  .object({
    productId: z.uuid().optional(),
    quantity: z.coerce.number().positive().optional(),
    paymentMethodId: z.uuid(),
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
    items: value.items ?? [
      {
        productId: value.productId as string,
        quantity: value.quantity as number,
      },
    ],
  }));

salesRoutes.get("/sales", async (_request, response) => {
  response.status(200).json(await indexSales());
});

salesRoutes.post("/sales", async (request, response) => {
  const body = validateBody(request, createSaleSchema);
  const userId = response.locals.authenticatedUser.id as string;

  response.status(201).json(await storeSale(body, userId));
});
