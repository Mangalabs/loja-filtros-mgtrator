import type { RequestHandler } from "express";
import { findActiveUserById } from "../../models/users/users.model.js";
import { AppError } from "../errors/app-error.js";
import { verifyAuthToken, type AuthenticatedUser } from "./token.js";

export const authCookieName = "auth_token";

export const requireAuthentication: RequestHandler = async (request, response, next) => {
  const token = readBearerToken(request.headers.authorization) ?? readCookieToken(request.headers.cookie);

  if (!token) {
    next(new AppError("Autenticacao necessaria.", 401));
    return;
  }

  const claims = await verifyAuthToken(token);
  const user = claims ? await findActiveUserById(claims.id) : undefined;

  if (!user) {
    next(new AppError("Sessao invalida ou expirada.", 401));
    return;
  }

  response.locals.authenticatedUser = user satisfies AuthenticatedUser;
  next();
};

function readBearerToken(authorization?: string): string | undefined {
  if (!authorization?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorization.slice("Bearer ".length).trim() || undefined;
}

function readCookieToken(cookieHeader?: string): string | undefined {
  return cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim().split("="))
    .find(([name]) => name === authCookieName)?.[1];
}
