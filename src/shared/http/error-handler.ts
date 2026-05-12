import type { ErrorRequestHandler } from "express";
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

  response.status(500).json({
    code: 500,
    status: "error",
    message: "Internal server error",
  });
};
