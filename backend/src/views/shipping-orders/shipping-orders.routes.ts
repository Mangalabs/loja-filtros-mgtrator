import { Router } from "express";
import { z } from "zod";
import {
  approveQuotedShippingOrder,
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
  })
  .strict();

const shippingOrderParamsSchema = z.object({
  id: z.uuid(),
});

shippingOrdersRoutes.get("/shipping-orders", async (_request, response) => {
  response.status(200).json(await indexShippingOrders());
});

shippingOrdersRoutes.post("/shipping-orders", async (request, response) => {
  const body = validateBody(request, createShippingOrderSchema);
  const userId = response.locals.authenticatedUser.id as string;

  response.status(201).json(await storeShippingOrder(body, userId));
});

shippingOrdersRoutes.patch("/shipping-orders/:id/approve", async (request, response) => {
  const { id } = shippingOrderParamsSchema.parse(request.params);
  const userId = response.locals.authenticatedUser.id as string;

  response.status(200).json(await approveQuotedShippingOrder(id, userId));
});
