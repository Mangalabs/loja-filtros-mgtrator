import type { RequestHandler } from "express";
import { env } from "../../config/env.js";

export const corsMiddleware: RequestHandler = (request, response, next) => {
  const origin = request.headers.origin;

  if (!origin || env.cors.allowedOrigins.length === 0) {
    next();
    return;
  }

  if (!isAllowedOrigin(origin)) {
    next();
    return;
  }

  response.header("Access-Control-Allow-Origin", origin);
  response.header("Access-Control-Allow-Credentials", "true");
  response.header(
    "Access-Control-Allow-Headers",
    request.headers["access-control-request-headers"] ?? "content-type",
  );
  response.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  response.header("Vary", "Origin");

  if (request.method === "OPTIONS") {
    response.status(204).send();
    return;
  }

  next();
};

function isAllowedOrigin(origin: string) {
  return (
    env.cors.allowedOrigins.includes("*") ||
    env.cors.allowedOrigins.includes(origin)
  );
}
