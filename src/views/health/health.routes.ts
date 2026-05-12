import { showHealth } from "../../controllers/health/health.controller.js";
import { sendJson } from "../../shared/http/json-response.js";
import type { Route } from "../../shared/http/http.types.js";

export const healthRoutes: Route[] = [
  {
    method: "GET",
    path: "/health",
    handler: (_request, response) => {
      sendJson(response, 200, showHealth());
    },
  },
];
