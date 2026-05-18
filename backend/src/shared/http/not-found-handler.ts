import type { RequestHandler } from "express";

export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({
    code: 404,
    status: "error",
    message: "Route not found",
  });
};
