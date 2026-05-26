import { db } from "../../database/knex.js";

export type CashRegisterSession = {
  id: string;
  openedByUserId: string;
  openedByUserName: string;
  openingBalance: string;
  status: "OPEN" | "CLOSED";
  openedAt: Date;
};

const sessionColumns = [
  "cash_register_sessions.id",
  "cash_register_sessions.opened_by_user_id as openedByUserId",
  "users.name as openedByUserName",
  "cash_register_sessions.opening_balance as openingBalance",
  "cash_register_sessions.status",
  "cash_register_sessions.opened_at as openedAt",
];

export async function getCurrentCashRegisterSession(): Promise<CashRegisterSession | undefined> {
  return db("cash_register_sessions")
    .join("users", "users.id", "cash_register_sessions.opened_by_user_id")
    .select(sessionColumns)
    .where("cash_register_sessions.status", "OPEN")
    .first();
}

export async function createCashRegisterSession(
  openedByUserId: string,
  openingBalance: number,
): Promise<CashRegisterSession> {
  const [created] = await db("cash_register_sessions")
    .insert({
      opened_by_user_id: openedByUserId,
      opening_balance: openingBalance,
    })
    .returning("id");

  const session = await db("cash_register_sessions")
    .join("users", "users.id", "cash_register_sessions.opened_by_user_id")
    .select(sessionColumns)
    .where("cash_register_sessions.id", created.id)
    .first();

  if (!session) {
    throw new Error("Cash register session was not found after creation");
  }

  return session;
}
