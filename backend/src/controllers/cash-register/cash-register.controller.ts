import {
  createCashRegisterSession,
  getCurrentCashRegisterSession,
} from "../../models/cash-register/cash-register.model.js";

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
