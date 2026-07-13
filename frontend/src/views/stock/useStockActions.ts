import type { FormEvent } from "react";
import {
  apiPost,
  apiPut,
  type ApiResult,
  type PurchaseInvoice,
  type PurchaseInvoiceDraft,
} from "../../api";
import { nullableFormValue } from "../../utils/forms";

type StockActionsOptions = {
  loadCatalog: () => Promise<void>;
  runAction: (action: () => Promise<void>) => Promise<boolean>;
};

export function useStockActions({
  loadCatalog,
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
      const result = await apiPost<ApiResult<PurchaseInvoiceDraft>>(
        "/purchase-invoices/parse-xml",
        { xmlContent },
      );

      parsedInvoice = result.data;
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
            {
              issueDate: input.issueDate,
              items: input.items,
              number: input.number,
              series: input.series,
              supplierDocument: input.supplierDocument,
              supplierId: input.supplierId,
              supplierName: input.supplierName,
              totalAmount: input.totalAmount,
            },
          )
        : await apiPost<ApiResult<PurchaseInvoice>>("/purchase-invoices", input);

      void result;
      await loadCatalog();
    });
  }

  return {
    createStockAdjustment,
    createStockEntry,
    parsePurchaseInvoiceXml,
    savePurchaseInvoiceReview,
  };
}
