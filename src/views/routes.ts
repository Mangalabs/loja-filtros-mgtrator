import type { Route } from "../shared/http/http.types.js";
import { healthRoutes } from "./health/health.routes.js";

export const routes: Route[] = [...healthRoutes];
