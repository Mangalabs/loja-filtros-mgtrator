import { Router } from "express";
import { z } from "zod";
import {
  changePaymentMethodStatus,
  indexPaymentMethods,
} from "../../controllers/payment-methods/payment-methods.controller.js";
import { parseBooleanFilter } from "../../shared/http/query-params.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const paymentMethodsRoutes = Router();

const paymentMethodParamsSchema = z.object({
  id: z.uuid(),
});

const updatePaymentMethodStatusSchema = z.object({
  active: z.boolean(),
});

paymentMethodsRoutes.get("/payment-methods", async (request, response) => {
  const result = await indexPaymentMethods({
    active: parseBooleanFilter(request.query.active),
  });

  response.status(200).json(result);
});

paymentMethodsRoutes.patch(
  "/payment-methods/:id/status",
  async (request, response) => {
    const { id } = paymentMethodParamsSchema.parse(request.params);
    const body = validateBody(request, updatePaymentMethodStatusSchema);
    const result = await changePaymentMethodStatus(id, body.active);

    response.status(200).json(result);
  },
);
