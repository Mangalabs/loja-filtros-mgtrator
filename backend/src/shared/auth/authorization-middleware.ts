import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";
import type { EmployeePermission } from "./permissions.js";

export const requireAdmin: RequestHandler = (_request, response, next) => {
  const user = response.locals.authenticatedUser;

  if (user?.role === "ADMIN") {
    next();
    return;
  }

  next(new AppError("Acesso permitido apenas para administradores.", 403));
};

export function requirePermission(permission: EmployeePermission): RequestHandler {
  return (_request, response, next) => {
    const user = response.locals.authenticatedUser;

    if (user?.role === "ADMIN" || user?.permissions?.includes(permission)) {
      next();
      return;
    }

    next(new AppError("Acesso nao permitido para este usuario.", 403));
  };
}
