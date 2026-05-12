import { getHealthStatus } from "../../models/health/health.model.js";

export function showHealth() {
  return getHealthStatus();
}
