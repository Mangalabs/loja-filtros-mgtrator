import { db } from "../../database/knex.js";
import { getHealthStatus } from "../../models/health/health.model.js";

export function showHealth() {
  return getHealthStatus();
}

export async function showDatabaseHealth() {
  await db.raw("select 1");

  return {
    status: "ok",
    checkedAt: new Date().toISOString(),
  };
}
