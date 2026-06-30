import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";

export const requireAdmin: RequestHandler = (_request, response, next) => {
  const user = response.locals.authenticatedUser;

  if (user?.role === "ADMIN") {
    next();
    return;
  }

  next(new AppError("Acesso permitido apenas para administradores.", 403));
};
