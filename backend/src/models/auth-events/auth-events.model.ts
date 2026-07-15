import type { Knex } from "knex";
import { db } from "../../database/knex.js";

export type AuthEventType =
  | "SETUP_SUCCESS"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGOUT"
  | "PASSWORD_CHANGED"
  | "PASSWORD_RESET"
  | "EMPLOYEE_CREATED"
  | "EMPLOYEE_UPDATED"
  | "EMPLOYEE_STATUS_CHANGED";

export const authEventTypeValues = [
  "SETUP_SUCCESS",
  "LOGIN_SUCCESS",
  "LOGIN_FAILURE",
  "LOGOUT",
  "PASSWORD_CHANGED",
  "PASSWORD_RESET",
  "EMPLOYEE_CREATED",
  "EMPLOYEE_UPDATED",
  "EMPLOYEE_STATUS_CHANGED",
] as const satisfies AuthEventType[];

export type AuthEventInput = {
  userId?: string | null;
  email: string;
  eventType: AuthEventType;
  ipAddress?: string | null;
  userAgent?: string | null;
  reason?: string | null;
};

export type AuthEvent = {
  id: string;
  userId: string | null;
  email: string;
  eventType: AuthEventType;
  ipAddress: string | null;
  userAgent: string | null;
  reason: string | null;
  createdAt: string;
};

export type AuthEventFilters = {
  email?: string;
  eventType?: AuthEventType;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  limit: number;
};

export type AuthEventPage = {
  items: AuthEvent[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
};

type Database = Knex | Knex.Transaction;

export async function createAuthEvent(
  input: AuthEventInput,
  database: Database = db,
): Promise<void> {
  await database("auth_events").insert({
    user_id: input.userId ?? null,
    email: input.email,
    event_type: input.eventType,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
    reason: input.reason ?? null,
  });
}

export async function listAuthEvents(
  filters: AuthEventFilters,
  database: Database = db,
): Promise<AuthEventPage> {
  const query = applyAuthEventFilters(database("auth_events"), filters);
  const [{ count }] = await query
    .clone()
    .clearSelect()
    .clearOrder()
    .count<{ count: string }[]>({ count: "*" });
  const total = Number(count);
  const items = await query
    .select<AuthEvent[]>([
      "id",
      "user_id as userId",
      "email",
      "event_type as eventType",
      "ip_address as ipAddress",
      "user_agent as userAgent",
      "reason",
      "created_at as createdAt",
    ])
    .orderBy("created_at", "desc")
    .limit(filters.limit)
    .offset((filters.page - 1) * filters.limit);

  return {
    items,
    pagination: {
      total,
      page: filters.page,
      limit: filters.limit,
    },
  };
}

function applyAuthEventFilters(
  query: Knex.QueryBuilder,
  filters: AuthEventFilters,
) {
  const filteredQuery = filters.email
    ? query.whereILike("email", `%${filters.email}%`)
    : query;
  const eventTypeQuery = filters.eventType
    ? filteredQuery.where("event_type", filters.eventType)
    : filteredQuery;
  const dateFromQuery = filters.dateFrom
    ? eventTypeQuery.where("created_at", ">=", filters.dateFrom)
    : eventTypeQuery;

  return filters.dateTo
    ? dateFromQuery.where("created_at", "<=", normalizeEndDate(filters.dateTo))
    : dateFromQuery;
}

function normalizeEndDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T23:59:59.999Z`
    : value;
}
