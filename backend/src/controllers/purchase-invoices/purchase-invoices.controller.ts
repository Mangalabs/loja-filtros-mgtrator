import { db } from "../../database/knex.js";
import { parseNfePurchaseXml } from "../../integrations/purchase-xml/nfe-purchase-xml-parser.js";
import {
  insertPurchaseInvoice,
  findPurchaseInvoiceStatus,
  listPurchaseInvoices,
  productsExist,
  supplierExists,
  type PurchaseInvoiceInput,
  type PurchaseInvoiceUpdateInput,
  updatePurchaseInvoiceReview,
} from "../../models/purchase-invoices/purchase-invoices.model.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function indexPurchaseInvoices() {
  const invoices = await listPurchaseInvoices();

  return {
    code: 200,
    status: "success",
    data: invoices,
  };
}

export function parsePurchaseInvoiceXml(xmlContent: string) {
  return {
    code: 200,
    status: "success",
    data: parseNfePurchaseXml(xmlContent),
  };
}

export async function importPurchaseInvoiceXml(
  xmlContent: string,
  createdByUserId: string,
) {
  return storePurchaseInvoice(parseNfePurchaseXml(xmlContent), createdByUserId);
}

export async function updatePurchaseInvoice(
  id: string,
  input: PurchaseInvoiceUpdateInput,
) {
  const invoice = await db.transaction(async (transaction) => {
    const status = await findPurchaseInvoiceStatus(transaction, id);

    if (!status) {
      throw new AppError("Compra importada nao encontrada.", 404);
    }

    if (status !== "IMPORTED") {
      throw new AppError(
        "Somente compras importadas podem ser revisadas antes da entrada no estoque.",
        409,
      );
    }

    if (
      input.supplierId &&
      !(await supplierExists(transaction, input.supplierId))
    ) {
      throw new AppError("Fornecedor informado nao encontrado.", 422);
    }

    const productIds = input.items.flatMap((item) =>
      item.productId ? [item.productId] : [],
    );

    if (!(await productsExist(transaction, productIds))) {
      throw new AppError(
        "Um ou mais produtos vinculados nao foram encontrados.",
        422,
      );
    }

    return updatePurchaseInvoiceReview(transaction, id, input);
  });

  return {
    code: 200,
    status: "success",
    data: invoice,
  };
}

export async function storePurchaseInvoice(
  input: PurchaseInvoiceInput,
  createdByUserId: string,
) {
  const invoice = await db.transaction(async (transaction) => {
    if (
      input.supplierId &&
      !(await supplierExists(transaction, input.supplierId))
    ) {
      throw new AppError("Fornecedor informado nao encontrado.", 422);
    }

    const productIds = input.items.flatMap((item) =>
      item.productId ? [item.productId] : [],
    );

    if (!(await productsExist(transaction, productIds))) {
      throw new AppError(
        "Um ou mais produtos vinculados nao foram encontrados.",
        422,
      );
    }

    return insertPurchaseInvoice(transaction, input, createdByUserId);
  });

  return {
    code: 201,
    status: "success",
    data: invoice,
  };
}
