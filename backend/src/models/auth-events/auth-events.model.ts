import type { Knex } from "knex";
import { db } from "../../database/knex.js";

export type AuthEventType =
  | "SETUP_SUCCESS"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGOUT";

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
  database: Database = db,
): Promise<AuthEvent[]> {
  return database("auth_events")
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
    .orderBy("created_at", "desc");
}
