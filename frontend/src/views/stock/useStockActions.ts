import type { FormEvent } from "react";
import {
  apiPost,
  apiPut,
  type ApiResult,
  type PurchaseInvoice,
  type PurchaseInvoiceDraft,
  type Supplier,
} from "../../api";
import { nullableFormValue } from "../../utils/forms";
import { parsePurchaseXmlPreview } from "./purchaseXmlPreview";

type StockActionsOptions = {
  loadCatalog: () => Promise<void>;
  requestConfirmation: (
    message: string,
    title?: string,
    confirmLabel?: string,
  ) => Promise<boolean>;
  runAction: (action: () => Promise<void>) => Promise<boolean>;
};

export function useStockActions({
  loadCatalog,
  requestConfirmation,
  runAction,
}: StockActionsOptions) {
  async function createStockEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPost("/stock-entries", {
        productId: String(form.get("entryProductId") ?? ""),
        supplierId: String(form.get("entrySupplierId") ?? ""),
        quantity: Number(form.get("entryQuantity")),
        unitCost: Number(form.get("entryUnitCost")),
        notes: nullableFormValue(form, "entryNotes"),
      });

      formElement.reset();
      await loadCatalog();
    });
  }

  async function createStockAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPost("/stock-adjustments", {
        productId: String(form.get("adjustmentProductId") ?? ""),
        quantity: Number(form.get("adjustmentQuantity")),
        reason: String(form.get("adjustmentReason") ?? "").trim(),
      });

      formElement.reset();
      await loadCatalog();
    });
  }

  async function parsePurchaseInvoiceXml(xmlContent: string) {
    let parsedInvoice: PurchaseInvoiceDraft | null = null;

    await runAction(async () => {
      const result = await parsePurchaseInvoiceXmlWithFallback(xmlContent);

      parsedInvoice = result;
    });

    return parsedInvoice;
  }

  async function savePurchaseInvoiceReview(
    input: PurchaseInvoiceDraft,
    invoiceId?: string,
  ) {
    await runAction(async () => {
      const result = invoiceId
        ? await apiPut<ApiResult<PurchaseInvoice>>(
            `/purchase-invoices/${invoiceId}`,
            await purchaseInvoiceReviewPayload(input),
          )
        : await apiPost<ApiResult<PurchaseInvoice>>(
            "/purchase-invoices",
            await purchaseInvoiceReviewPayload(input, true),
          );

      void result;
      await loadCatalog();
    });
  }

  async function postPurchaseInvoice(invoice: PurchaseInvoice) {
    const confirmed = await requestConfirmation(
      "Esta acao vai lancar os itens da compra no estoque e atualizar o custo dos produtos vinculados.",
      "Lancar compra no estoque",
      "Lancar estoque",
    );

    if (!confirmed) {
      return;
    }

    await runAction(async () => {
      await apiPost<ApiResult<PurchaseInvoice>>(
        `/purchase-invoices/${invoice.id}/post`,
        {},
      );

      await loadCatalog();
    });
  }

  return {
    createStockAdjustment,
    createStockEntry,
    parsePurchaseInvoiceXml,
    postPurchaseInvoice,
    savePurchaseInvoiceReview,
  };
}

async function purchaseInvoiceReviewPayload(
  input: PurchaseInvoiceDraft,
  includeAccessKey = false,
) {
  const supplierId =
    input.createSupplierFromXml && !input.supplierId
      ? await createSupplierFromPurchaseInvoice(input)
      : input.supplierId;
  const payload = {
    issueDate: input.issueDate,
    installments: input.installments,
    items: input.items,
    number: input.number,
    series: input.series,
    supplierDocument: input.supplierDocument,
    supplierId,
    supplierName: input.supplierName,
    totalAmount: input.totalAmount,
    transporterDocument: input.transporterDocument,
    transporterName: input.transporterName,
    xmlContent: input.xmlContent,
  };

  return includeAccessKey ? { ...payload, accessKey: input.accessKey } : payload;
}

async function createSupplierFromPurchaseInvoice(input: PurchaseInvoiceDraft) {
  const result = await apiPost<ApiResult<Supplier>>("/suppliers", {
    document: input.supplierDocument ?? "",
    name: input.supplierName,
  });

  return result.data.id;
}

async function parsePurchaseInvoiceXmlWithFallback(xmlContent: string) {
  try {
    const result = await apiPost<ApiResult<PurchaseInvoiceDraft>>(
      "/purchase-invoices/parse-xml",
      { xmlContent },
    );

    return result.data;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Route not found")) {
      return parsePurchaseXmlPreview(xmlContent);
    }

    throw error;
  }
}
