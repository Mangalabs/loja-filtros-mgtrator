import { db } from "../../database/knex.js";
import {
  closeCashRegisterSession,
  createCashRegisterSession,
  getCurrentCashRegisterSession,
  lockOpenCashRegisterSession,
} from "../../models/cash-register/cash-register.model.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function showCurrentCashRegister() {
  const session = await getCurrentCashRegisterSession();

  return {
    code: 200,
    status: "success",
    data: session ?? null,
  };
}

export async function openCashRegister(openedByUserId: string, openingBalance: number) {
  const session = await createCashRegisterSession(openedByUserId, openingBalance);

  return {
    code: 201,
    status: "success",
    data: session,
  };
}

export async function closeCurrentCashRegister(closedByUserId: string, closingBalance: number) {
  const session = await db.transaction(async (transaction) => {
    const currentSession = await lockOpenCashRegisterSession(transaction);

    if (!currentSession) {
      throw new AppError("Nao existe caixa aberto para fechamento.", 422);
    }

    return closeCashRegisterSession(transaction, currentSession.id, closedByUserId, closingBalance);
  });

  return {
    code: 200,
    status: "success",
    data: session,
  };
}
