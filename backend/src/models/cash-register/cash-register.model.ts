import type { Knex } from "knex";
import { db } from "../../database/knex.js";

export type CashRegisterSession = {
  id: string;
  openedByUserId: string;
  openedByUserName: string;
  openingBalance: string;
  closingBalance: string | null;
  closedByUserId: string | null;
  closedByUserName: string | null;
  status: "OPEN" | "CLOSED";
  openedAt: Date;
  closedAt: Date | null;
  salesTotal: string;
  supplyTotal: string;
  withdrawalTotal: string;
  expectedClosingBalance: string;
  difference: string | null;
  paymentSummary: CashRegisterPaymentSummary[];
  closingPaymentSummary: CashRegisterClosingPaymentSummary[];
  movements: CashRegisterMovement[];
};

export type CashRegisterPaymentSummary = {
  paymentMethodId: string;
  paymentMethodName: string;
  paymentMethodCode: string;
  amount: string;
};

export type CashRegisterClosingPaymentSummary = CashRegisterPaymentSummary & {
  expectedAmount: string;
  difference: string;
};

export type CashRegisterMovementType = "SUPPLY" | "WITHDRAWAL";

export type CashRegisterMovement = {
  id: string;
  cashRegisterSessionId: string;
  type: CashRegisterMovementType;
  amount: string;
  reason: string;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: Date;
};

export type CashRegisterMovementInput = {
  type: CashRegisterMovementType;
  amount: number;
  reason: string;
};

export type CashRegisterClosingPaymentInput = {
  paymentMethodId: string;
  amount: number;
};

const sessionColumns = [
  "cash_register_sessions.id",
  "cash_register_sessions.opened_by_user_id as openedByUserId",
  "opened_users.name as openedByUserName",
  "cash_register_sessions.opening_balance as openingBalance",
  "cash_register_sessions.closing_balance as closingBalance",
  "cash_register_sessions.closed_by_user_id as closedByUserId",
  "closed_users.name as closedByUserName",
  "cash_register_sessions.status",
  "cash_register_sessions.opened_at as openedAt",
  "cash_register_sessions.closed_at as closedAt",
];

export async function getCurrentCashRegisterSession(): Promise<
  CashRegisterSession | undefined
> {
  const session = await sessionQuery(db)
    .where("cash_register_sessions.status", "OPEN")
    .first();

  return session ? withCashRegisterTotals(db, session) : undefined;
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

  const session = await sessionQuery(db)
    .where("cash_register_sessions.id", created.id)
    .first();

  if (!session) {
    throw new Error("Cash register session was not found after creation");
  }

  return withCashRegisterTotals(db, session);
}

export async function lockOpenCashRegisterSession(
  transaction: Knex.Transaction,
): Promise<CashRegisterSession | undefined> {
  const session = await sessionQuery(transaction)
    .where("cash_register_sessions.status", "OPEN")
    .forUpdate("cash_register_sessions")
    .first();

  return session ? withCashRegisterTotals(transaction, session) : undefined;
}

export async function closeCashRegisterSession(
  transaction: Knex.Transaction,
  id: string,
  closedByUserId: string,
  closingBalance: number,
  closingPayments: CashRegisterClosingPaymentInput[],
): Promise<CashRegisterSession> {
  await transaction("cash_register_sessions").where("id", id).update({
    status: "CLOSED",
    closed_by_user_id: closedByUserId,
    closing_balance: closingBalance,
    closed_at: transaction.fn.now(),
  });

  await transaction("cash_register_closing_payments")
    .where("cash_register_session_id", id)
    .del();

  if (closingPayments.length > 0) {
    await transaction("cash_register_closing_payments").insert(
      closingPayments.map((payment) => ({
        cash_register_session_id: id,
        payment_method_id: payment.paymentMethodId,
        amount: payment.amount,
      })),
    );
  }

  const session = await sessionQuery(transaction)
    .where("cash_register_sessions.id", id)
    .first();

  if (!session) {
    throw new Error("Cash register session was not found after closing");
  }

  return withCashRegisterTotals(transaction, session);
}

export async function insertCashRegisterMovement(
  transaction: Knex.Transaction,
  cashRegisterSessionId: string,
  createdByUserId: string,
  input: CashRegisterMovementInput,
): Promise<CashRegisterSession> {
  await transaction("cash_register_movements").insert({
    cash_register_session_id: cashRegisterSessionId,
    created_by_user_id: createdByUserId,
    type: input.type,
    amount: input.amount,
    reason: input.reason,
  });

  const session = await sessionQuery(transaction)
    .where("cash_register_sessions.id", cashRegisterSessionId)
    .first();

  if (!session) {
    throw new Error("Cash register session was not found after movement");
  }

  return withCashRegisterTotals(transaction, session);
}

function sessionQuery(database: Knex | Knex.Transaction) {
  return database("cash_register_sessions")
    .join(
      { opened_users: "users" },
      "opened_users.id",
      "cash_register_sessions.opened_by_user_id",
    )
    .leftJoin(
      { closed_users: "users" },
      "closed_users.id",
      "cash_register_sessions.closed_by_user_id",
    )
    .select(sessionColumns);
}

async function withCashRegisterTotals(
  database: Knex | Knex.Transaction,
  session: Omit<
    CashRegisterSession,
    | "difference"
    | "closingPaymentSummary"
    | "expectedClosingBalance"
    | "movements"
    | "paymentSummary"
    | "salesTotal"
    | "supplyTotal"
    | "withdrawalTotal"
  >,
): Promise<CashRegisterSession> {
  const paymentSummary = await listPaymentSummary(database, session.id);
  const closingPaymentSummary = await listClosingPaymentSummary(
    database,
    session.id,
    paymentSummary,
  );
  const movements = await listCashRegisterMovements(database, session.id);
  const salesTotalInCents = paymentSummary.reduce(
    (total, payment) => total + toCents(payment.amount),
    0,
  );
  const supplyTotalInCents = movementTotalInCents(movements, "SUPPLY");
  const withdrawalTotalInCents = movementTotalInCents(movements, "WITHDRAWAL");
  const expectedClosingBalanceInCents =
    toCents(session.openingBalance) +
    salesTotalInCents +
    supplyTotalInCents -
    withdrawalTotalInCents;
  const difference =
    session.closingBalance === null
      ? null
      : toCents(session.closingBalance) - expectedClosingBalanceInCents;

  return {
    ...session,
    salesTotal: fromCents(salesTotalInCents),
    supplyTotal: fromCents(supplyTotalInCents),
    withdrawalTotal: fromCents(withdrawalTotalInCents),
    expectedClosingBalance: fromCents(expectedClosingBalanceInCents),
    difference: difference === null ? null : fromCents(difference),
    paymentSummary,
    closingPaymentSummary,
    movements,
  };
}

async function listPaymentSummary(
  database: Knex | Knex.Transaction,
  cashRegisterSessionId: string,
): Promise<CashRegisterPaymentSummary[]> {
  return database("sale_payments")
    .join("sales", "sales.id", "sale_payments.sale_id")
    .join(
      "payment_methods",
      "payment_methods.id",
      "sale_payments.payment_method_id",
    )
    .where("sales.cash_register_session_id", cashRegisterSessionId)
    .where("sales.status", "COMPLETED")
    .groupBy([
      "payment_methods.id",
      "payment_methods.name",
      "payment_methods.code",
    ])
    .select([
      "payment_methods.id as paymentMethodId",
      "payment_methods.name as paymentMethodName",
      "payment_methods.code as paymentMethodCode",
      database.raw("sum(sale_payments.amount)::numeric(12, 2) as amount"),
    ])
    .orderByRaw(
      "case payment_methods.code when 'PIX' then 1 when 'DEBIT' then 2 when 'BOLETO' then 3 else 4 end",
    )
    .orderBy("payment_methods.name", "asc");
}

async function listClosingPaymentSummary(
  database: Knex | Knex.Transaction,
  cashRegisterSessionId: string,
  paymentSummary: CashRegisterPaymentSummary[],
): Promise<CashRegisterClosingPaymentSummary[]> {
  const closingPayments = await database("cash_register_closing_payments")
    .join(
      "payment_methods",
      "payment_methods.id",
      "cash_register_closing_payments.payment_method_id",
    )
    .where(
      "cash_register_closing_payments.cash_register_session_id",
      cashRegisterSessionId,
    )
    .select<
      Array<{
        paymentMethodId: string;
        paymentMethodName: string;
        paymentMethodCode: string;
        amount: string;
      }>
    >([
      "payment_methods.id as paymentMethodId",
      "payment_methods.name as paymentMethodName",
      "payment_methods.code as paymentMethodCode",
      "cash_register_closing_payments.amount",
    ]);

  return closingPayments.map((payment) => {
    const expectedAmount =
      paymentSummary.find(
        (summary) => summary.paymentMethodId === payment.paymentMethodId,
      )?.amount ?? "0.00";
    const difference = toCents(payment.amount) - toCents(expectedAmount);

    return {
      ...payment,
      expectedAmount,
      difference: fromCents(difference),
    };
  });
}

async function listCashRegisterMovements(
  database: Knex | Knex.Transaction,
  cashRegisterSessionId: string,
): Promise<CashRegisterMovement[]> {
  return database("cash_register_movements")
    .join("users", "users.id", "cash_register_movements.created_by_user_id")
    .where(
      "cash_register_movements.cash_register_session_id",
      cashRegisterSessionId,
    )
    .select([
      "cash_register_movements.id",
      "cash_register_movements.cash_register_session_id as cashRegisterSessionId",
      "cash_register_movements.type",
      "cash_register_movements.amount",
      "cash_register_movements.reason",
      "cash_register_movements.created_by_user_id as createdByUserId",
      "users.name as createdByUserName",
      "cash_register_movements.created_at as createdAt",
    ])
    .orderBy("cash_register_movements.created_at", "desc");
}

function movementTotalInCents(
  movements: CashRegisterMovement[],
  type: CashRegisterMovementType,
) {
  return movements
    .filter((movement) => movement.type === type)
    .reduce((total, movement) => total + toCents(movement.amount), 0);
}

function toCents(value: string) {
  return Math.round(Number(value) * 100);
}

function fromCents(value: number) {
  return (value / 100).toFixed(2);
}
