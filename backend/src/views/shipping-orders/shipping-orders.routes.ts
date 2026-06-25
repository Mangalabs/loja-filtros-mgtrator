import { Router } from "express";
import { z } from "zod";
import {
  approveQuotedShippingOrder,
  cancelOpenShippingOrder,
  completeSeparatedShippingOrder,
  confirmShippingOrderSeparation,
  indexShippingOrders,
  storeShippingOrder,
} from "../../controllers/shipping-orders/shipping-orders.controller.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const shippingOrdersRoutes = Router();

const createShippingOrderSchema = z
  .object({
    clientId: z.uuid(),
    productId: z.uuid(),
    quantity: z.coerce.number().positive(),
    allowInsufficientStock: z.boolean().optional(),
  })
  .strict();

const shippingOrderParamsSchema = z.object({
  id: z.uuid(),
});

const cancelShippingOrderSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

const completeShippingOrderSchema = z.object({
  paymentMethodId: z.uuid(),
  allowInsufficientStock: z.boolean().optional(),
});

const approveShippingOrderSchema = z.object({
  allowInsufficientStock: z.boolean().optional(),
});

shippingOrdersRoutes.get("/shipping-orders", async (_request, response) => {
  response.status(200).json(await indexShippingOrders());
});

shippingOrdersRoutes.post("/shipping-orders", async (request, response) => {
  const body = validateBody(request, createShippingOrderSchema);
  const userId = response.locals.authenticatedUser.id as string;

  response.status(201).json(await storeShippingOrder(body, userId));
});

shippingOrdersRoutes.patch(
  "/shipping-orders/:id/approve",
  async (request, response) => {
    const { id } = shippingOrderParamsSchema.parse(request.params);
    const body = validateBody(request, approveShippingOrderSchema);
    const userId = response.locals.authenticatedUser.id as string;

    response
      .status(200)
      .json(
        await approveQuotedShippingOrder(
          id,
          userId,
          body.allowInsufficientStock ?? false,
        ),
      );
  },
);

shippingOrdersRoutes.patch(
  "/shipping-orders/:id/cancel",
  async (request, response) => {
    const { id } = shippingOrderParamsSchema.parse(request.params);
    const body = validateBody(request, cancelShippingOrderSchema);
    const userId = response.locals.authenticatedUser.id as string;

    response
      .status(200)
      .json(await cancelOpenShippingOrder(id, body.reason, userId));
  },
);

shippingOrdersRoutes.patch(
  "/shipping-orders/:id/separate",
  async (request, response) => {
    const { id } = shippingOrderParamsSchema.parse(request.params);
    const userId = response.locals.authenticatedUser.id as string;

    response.status(200).json(await confirmShippingOrderSeparation(id, userId));
  },
);

shippingOrdersRoutes.patch(
  "/shipping-orders/:id/complete",
  async (request, response) => {
    const { id } = shippingOrderParamsSchema.parse(request.params);
    const body = validateBody(request, completeShippingOrderSchema);
    const userId = response.locals.authenticatedUser.id as string;

    response
      .status(200)
      .json(
        await completeSeparatedShippingOrder(
          id,
          body.paymentMethodId,
          userId,
          body.allowInsufficientStock ?? false,
        ),
      );
  },
);
