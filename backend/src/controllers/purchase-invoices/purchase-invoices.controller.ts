import { db } from "../../database/knex.js";
import { parseNfePurchaseXml } from "../../integrations/purchase-xml/nfe-purchase-xml-parser.js";
import {
  findPurchaseInvoiceForPosting,
  insertPurchaseInvoice,
  findPurchaseInvoiceStatus,
  listPurchaseInvoices,
  markPurchaseInvoiceAsPosted,
  productsExist,
  supplierExists,
  type PurchaseInvoiceDraftInput,
  type PurchaseInvoiceInput,
  type PurchaseInvoiceUpdateInput,
  updatePurchaseInvoiceReview,
} from "../../models/purchase-invoices/purchase-invoices.model.js";
import {
  applyStockEntryToProduct,
  insertStockEntry,
  lockProduct,
  saveLastSupplierCost,
} from "../../models/stock-entries/stock-entries.model.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function indexPurchaseInvoices(filters: { branchId: string }) {
  const invoices = await listPurchaseInvoices(filters);

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
  branchId: string,
) {
  return storePurchaseInvoice(
    parseNfePurchaseXml(xmlContent),
    createdByUserId,
    branchId,
  );
}

export async function updatePurchaseInvoice(
  id: string,
  input: PurchaseInvoiceUpdateInput,
  branchId: string,
) {
  const invoice = await db.transaction(async (transaction) => {
    const status = await findPurchaseInvoiceStatus(transaction, id, branchId);

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
      !(await supplierExists(transaction, input.supplierId, branchId))
    ) {
      throw new AppError("Fornecedor informado nao encontrado.", 422);
    }

    const productIds = input.items.flatMap((item) =>
      item.productId ? [item.productId] : [],
    );

    if (!(await productsExist(transaction, productIds, branchId))) {
      throw new AppError(
        "Um ou mais produtos vinculados nao foram encontrados.",
        422,
      );
    }

    return updatePurchaseInvoiceReview(transaction, id, branchId, input);
  });

  return {
    code: 200,
    status: "success",
    data: invoice,
  };
}

export async function postPurchaseInvoice(
  id: string,
  createdByUserId: string,
  branchId: string,
) {
  const invoice = await db.transaction(async (transaction) => {
    const purchaseInvoice = await findPurchaseInvoiceForPosting(
      transaction,
      id,
      branchId,
    );

    if (!purchaseInvoice) {
      throw new AppError("Compra importada nao encontrada.", 404);
    }

    if (purchaseInvoice.status !== "IMPORTED") {
      throw new AppError("Somente compras importadas podem ser lancadas.", 409);
    }

    if (!purchaseInvoice.supplierId) {
      throw new AppError(
        "Vincule um fornecedor cadastrado antes de lancar a compra.",
        422,
      );
    }

    const invalidItem = purchaseInvoice.items.find((item) => !item.productId);

    if (invalidItem) {
      throw new AppError(
        "Vincule todos os itens a produtos antes de lancar a compra.",
        422,
      );
    }

    for (const item of purchaseInvoice.items) {
      const productId = item.productId as string;
      const input = {
        productId,
        supplierId: purchaseInvoice.supplierId,
        purchaseInvoiceId: purchaseInvoice.id,
        quantity: Number(item.quantity),
        unitCost: Number(item.unitCost),
        notes: `Entrada por XML NF-e ${purchaseInvoice.number ?? purchaseInvoice.accessKey}`,
      };

      if (!(await lockProduct(transaction, productId, branchId))) {
        throw new AppError("Produto informado nao pertence a filial ativa.", 422);
      }

      await insertStockEntry(transaction, input, createdByUserId);
      await applyStockEntryToProduct(transaction, input);
      await saveLastSupplierCost(transaction, input);
    }

    return markPurchaseInvoiceAsPosted(transaction, id, branchId);
  });

  return {
    code: 200,
    status: "success",
    data: invoice,
  };
}

export async function storePurchaseInvoice(
  input: PurchaseInvoiceDraftInput,
  createdByUserId: string,
  branchId: string,
) {
  const invoice = await db.transaction(async (transaction) => {
    if (
      input.supplierId &&
      !(await supplierExists(transaction, input.supplierId, branchId))
    ) {
      throw new AppError("Fornecedor informado nao encontrado.", 422);
    }

    const productIds = input.items.flatMap((item) =>
      item.productId ? [item.productId] : [],
    );

    if (!(await productsExist(transaction, productIds, branchId))) {
      throw new AppError(
        "Um ou mais produtos vinculados nao foram encontrados.",
        422,
      );
    }

    return insertPurchaseInvoice(
      transaction,
      { ...input, branchId },
      createdByUserId,
    );
  });

  return {
    code: 201,
    status: "success",
    data: invoice,
  };
}
