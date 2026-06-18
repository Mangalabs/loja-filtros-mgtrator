import { db } from "../../database/knex.js";
import {
  closeCashRegisterSession,
  createCashRegisterSession,
  getCurrentCashRegisterSession,
  insertCashRegisterMovement,
  lockOpenCashRegisterSession,
  type CashRegisterClosingPaymentInput,
  type CashRegisterMovementInput,
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

export async function openCashRegister(
  openedByUserId: string,
  openingBalance: number,
) {
  const session = await createCashRegisterSession(
    openedByUserId,
    openingBalance,
  );

  return {
    code: 201,
    status: "success",
    data: session,
  };
}

export async function closeCurrentCashRegister(
  closedByUserId: string,
  closingBalance: number,
  closingPayments: CashRegisterClosingPaymentInput[] = [],
) {
  const session = await db.transaction(async (transaction) => {
    const currentSession = await lockOpenCashRegisterSession(transaction);

    if (!currentSession) {
      throw new AppError("Nao existe caixa aberto para fechamento.", 422);
    }

    return closeCashRegisterSession(
      transaction,
      currentSession.id,
      closedByUserId,
      closingBalance,
      closingPayments,
    );
  });

  return {
    code: 200,
    status: "success",
    data: session,
  };
}

export async function recordCashRegisterMovement(
  createdByUserId: string,
  input: CashRegisterMovementInput,
) {
  const session = await db.transaction(async (transaction) => {
    const currentSession = await lockOpenCashRegisterSession(transaction);

    if (!currentSession) {
      throw new AppError("Abra o caixa antes de registrar movimentacoes.", 422);
    }

    return insertCashRegisterMovement(
      transaction,
      currentSession.id,
      createdByUserId,
      input,
    );
  });

  return {
    code: 201,
    status: "success",
    data: session,
  };
}
