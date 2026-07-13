import { db } from "../../database/knex.js";
import { parseNfePurchaseXml } from "../../integrations/purchase-xml/nfe-purchase-xml-parser.js";
import {
  insertPurchaseInvoice,
  listPurchaseInvoices,
  productsExist,
  supplierExists,
  type PurchaseInvoiceInput,
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
      throw new AppError("Um ou mais produtos vinculados nao foram encontrados.", 422);
    }

    return insertPurchaseInvoice(transaction, input, createdByUserId);
  });

  return {
    code: 201,
    status: "success",
    data: invoice,
  };
}
