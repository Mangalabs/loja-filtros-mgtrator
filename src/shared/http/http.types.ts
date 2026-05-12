import type { IncomingMessage, ServerResponse } from "node:http";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RouteHandler = (
  request: IncomingMessage,
  response: ServerResponse,
) => Promise<void> | void;

export type Route = {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
};
