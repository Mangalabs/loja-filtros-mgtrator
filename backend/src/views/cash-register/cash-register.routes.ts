import { Router } from "express";
import { z } from "zod";
import {
  closeCurrentCashRegister,
  openCashRegister,
  recordCashRegisterMovement,
  showCurrentCashRegister,
} from "../../controllers/cash-register/cash-register.controller.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const cashRegisterRoutes = Router();

const openCashRegisterSchema = z
  .object({
    openingBalance: z.coerce.number().min(0),
  })
  .strict();

const closeCashRegisterSchema = z
  .object({
    closingBalance: z.coerce.number().min(0),
    closingPayments: z
      .array(
        z
          .object({
            paymentMethodId: z.uuid(),
            amount: z.coerce.number().min(0),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

const cashRegisterMovementSchema = z
  .object({
    type: z.enum(["SUPPLY", "WITHDRAWAL"]),
    amount: z.coerce.number().positive(),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

cashRegisterRoutes.get("/cash-register/current", async (_request, response) => {
  const result = await showCurrentCashRegister();

  response.status(200).json(result);
});

cashRegisterRoutes.post("/cash-register/open", async (request, response) => {
  const body = validateBody(request, openCashRegisterSchema);
  const userId = response.locals.authenticatedUser.id as string;
  const result = await openCashRegister(userId, body.openingBalance);

  response.status(201).json(result);
});

cashRegisterRoutes.patch("/cash-register/close", async (request, response) => {
  const body = validateBody(request, closeCashRegisterSchema);
  const userId = response.locals.authenticatedUser.id as string;
  const result = await closeCurrentCashRegister(
    userId,
    body.closingBalance,
    body.closingPayments ?? [],
  );

  response.status(200).json(result);
});

cashRegisterRoutes.post(
  "/cash-register/movements",
  async (request, response) => {
    const body = validateBody(request, cashRegisterMovementSchema);
    const userId = response.locals.authenticatedUser.id as string;
    const result = await recordCashRegisterMovement(userId, body);

    response.status(201).json(result);
  },
);
