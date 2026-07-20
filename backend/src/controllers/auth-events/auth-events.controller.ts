import {
  listAuthEvents,
  type AuthEventFilters,
} from "../../models/auth-events/auth-events.model.js";

export async function indexAuthEvents(filters: AuthEventFilters) {
  return {
    code: 200,
    status: "success",
    data: await listAuthEvents(filters),
  };
}
