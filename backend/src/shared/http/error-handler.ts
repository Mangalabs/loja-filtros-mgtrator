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
      ...(error.details ? { errors: error.details } : {}),
    });
    return;
  }

  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      field: issue.path.join(".") || undefined,
      message: issue.message,
    }));

    response.status(422).json({
      code: 422,
      status: "error",
      message: "Dados invalidos.",
      errors: details,
    });
    return;
  }

  if (isDatabaseError(error)) {
    if (error.code === "23505") {
      const message = getUniqueConstraintMessage(error.constraint);

      response.status(409).json({
        code: 409,
        status: "error",
        message,
      });
      return;
    }

    if (error.code === "23503") {
      const message = getForeignKeyConstraintMessage(error.constraint);

      response.status(422).json({
        code: 422,
        status: "error",
        message,
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

function getUniqueConstraintMessage(constraint?: string) {
  const messages: Record<string, string> = {
    brands_name_unique: "Ja existe um fabricante com esse nome.",
    product_groups_name_unique: "Ja existe um grupo de produto com esse nome.",
    products_barcode_unique_not_empty: "Ja existe um produto com esse codigo de barras.",
  };

  return constraint ? messages[constraint] ?? "Registro duplicado." : "Registro duplicado.";
}

function getForeignKeyConstraintMessage(constraint?: string) {
  const messages: Record<string, string> = {
    products_brand_id_foreign: "Fabricante informado nao encontrado.",
    products_group_id_foreign: "Grupo de produto informado nao encontrado.",
    product_suppliers_product_id_foreign: "Produto informado nao encontrado.",
    product_suppliers_supplier_id_foreign: "Fornecedor informado nao encontrado.",
  };

  return constraint
    ? messages[constraint] ?? "Registro relacionado nao encontrado."
    : "Registro relacionado nao encontrado.";
}
