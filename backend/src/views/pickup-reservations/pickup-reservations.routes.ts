import { Router } from "express";
import { z } from "zod";
import {
  cancelOpenPickupReservation,
  completeReservedPickup,
  indexPickupReservations,
  storePickupReservation,
} from "../../controllers/pickup-reservations/pickup-reservations.controller.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const pickupReservationsRoutes = Router();

const createPickupReservationSchema = z
  .object({
    clientId: z.uuid(),
    productId: z.uuid().optional(),
    quantity: z.coerce.number().positive().optional(),
    allowInsufficientStock: z.boolean().optional(),
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
        message: "Informe ao menos um item para a reserva.",
        path: ["items"],
      });
    }
  })
  .transform((value) => ({
    clientId: value.clientId,
    allowInsufficientStock: value.allowInsufficientStock ?? false,
    items: value.items ?? [
      {
        productId: value.productId as string,
        quantity: value.quantity as number,
      },
    ],
  }));

const pickupReservationParamsSchema = z.object({
  id: z.uuid(),
});

const cancelPickupReservationSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

const completePickupReservationSchema = z.object({
  paymentMethodId: z.uuid(),
  allowInsufficientStock: z.boolean().optional(),
});

pickupReservationsRoutes.get(
  "/pickup-reservations",
  async (_request, response) => {
    response.status(200).json(await indexPickupReservations());
  },
);

pickupReservationsRoutes.post(
  "/pickup-reservations",
  async (request, response) => {
    const body = validateBody(request, createPickupReservationSchema);
    const userId = response.locals.authenticatedUser.id as string;

    response.status(201).json(await storePickupReservation(body, userId));
  },
);

pickupReservationsRoutes.patch(
  "/pickup-reservations/:id/cancel",
  async (request, response) => {
    const { id } = pickupReservationParamsSchema.parse(request.params);
    const body = validateBody(request, cancelPickupReservationSchema);
    const userId = response.locals.authenticatedUser.id as string;

    response
      .status(200)
      .json(await cancelOpenPickupReservation(id, body.reason, userId));
  },
);

pickupReservationsRoutes.patch(
  "/pickup-reservations/:id/complete",
  async (request, response) => {
    const { id } = pickupReservationParamsSchema.parse(request.params);
    const body = validateBody(request, completePickupReservationSchema);
    const userId = response.locals.authenticatedUser.id as string;

    response
      .status(200)
      .json(
        await completeReservedPickup(
          id,
          body.paymentMethodId,
          userId,
          body.allowInsufficientStock ?? false,
        ),
      );
  },
);
