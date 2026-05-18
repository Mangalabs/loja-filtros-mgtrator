import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { isDatabaseError } from "../database/database-error.js";
import { AppError } from "../errors/app-error.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      code: error.statusCode,
      status: "error",
      message: error.message,
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(422).json({
      code: 422,
      status: "error",
      message: "Invalid request data",
    });
    return;
  }

  if (isDatabaseError(error)) {
    if (error.code === "23505") {
      response.status(409).json({
        code: 409,
        status: "error",
        message: "Registro duplicado.",
      });
      return;
    }

    if (error.code === "23503") {
      response.status(422).json({
        code: 422,
        status: "error",
        message: "Registro relacionado nao encontrado.",
      });
      return;
    }
  }

  console.error(error);

  response.status(500).json({
    code: 500,
    status: "error",
    message: "Internal server error",
  });
};
