import { listAuthEvents } from "../../models/auth-events/auth-events.model.js";

export async function indexAuthEvents() {
  return {
    code: 200,
    status: "success",
    data: await listAuthEvents(),
  };
}
