import type { FormEvent } from "react";
import {
  apiPost,
  apiPut,
  type ApiResult,
  type CommercialSettings,
  type Product,
  type PurchaseInvoice,
  type PurchaseInvoiceDraft,
  type PurchaseInvoiceItemDraft,
  type Supplier,
} from "../../api";
import { nullableFormValue } from "../../utils/forms";

type StockActionsOptions = {
  commercialSettings: CommercialSettings | null;
  refreshStockFlow: () => Promise<void>;
  requestConfirmation: (
    message: string,
    title?: string,
    confirmLabel?: string,
  ) => Promise<boolean>;
  runAction: (action: () => Promise<void>) => Promise<boolean>;
};

export function useStockActions({
  commercialSettings,
  refreshStockFlow,
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
      await refreshStockFlow();
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
      await refreshStockFlow();
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
      try {
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
        await refreshStockFlow();
      } catch (error) {
        handleMissingPurchaseInvoiceRoutes(error);
      }
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

      await refreshStockFlow();
    });
  }

  async function cancelPurchaseInvoice(invoice: PurchaseInvoice) {
    const confirmed = await requestConfirmation(
      "Esta acao cancela a compra importada antes de qualquer lancamento no estoque.",
      "Cancelar compra importada",
      "Cancelar compra",
    );

    if (!confirmed) {
      return;
    }

    await runAction(async () => {
      await apiPost<ApiResult<PurchaseInvoice>>(
        `/purchase-invoices/${invoice.id}/cancel`,
        {},
      );

      await refreshStockFlow();
    });
  }

  async function createProductFromPurchaseItem(
    item: PurchaseInvoiceItemDraft,
  ) {
    let createdProduct: Product | null = null;

    await runAction(async () => {
      const result = await apiPost<ApiResult<Product>>(
        "/products",
        productPayloadFromPurchaseItem(item, commercialSettings),
      );

      createdProduct = result.data;
      await refreshStockFlow();
    });

    return createdProduct;
  }

  return {
    cancelPurchaseInvoice,
    createProductFromPurchaseItem,
    createStockAdjustment,
    createStockEntry,
    parsePurchaseInvoiceXml,
    postPurchaseInvoice,
    savePurchaseInvoiceReview,
  };
}

function productPayloadFromPurchaseItem(
  item: PurchaseInvoiceItemDraft,
  commercialSettings: CommercialSettings | null,
) {
  const profitMarginPercentage = Number(
    commercialSettings?.defaultProfitMarginPercentage ?? 0,
  );

  return {
    active: true,
    costPrice: item.unitCost,
    internalCode: item.supplierProductCode ?? "",
    minimumStock: 0,
    name: item.description,
    cest: item.cest ?? "",
    ncm: item.ncm ?? "",
    profitMarginPercentage,
    salePrice: suggestedSalePrice(item.unitCost, profitMarginPercentage),
    unit: productUnitFromPurchaseItem(item.unit),
  };
}

function suggestedSalePrice(costPrice: number, profitMarginPercentage: number) {
  if (
    !Number.isFinite(costPrice) ||
    !Number.isFinite(profitMarginPercentage) ||
    costPrice <= 0
  ) {
    return 0;
  }

  return Number((costPrice * (1 + profitMarginPercentage / 100)).toFixed(2));
}

function productUnitFromPurchaseItem(unit: string | null) {
  const normalizedUnit = unit?.trim().toUpperCase();
  const allowedUnits = new Set(["UN", "KIT", "CJ"]);

  return normalizedUnit && allowedUnits.has(normalizedUnit)
    ? normalizedUnit
    : "UN";
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

function handleMissingPurchaseInvoiceRoutes(error: unknown) {
  if (error instanceof Error && error.message.includes("Route not found")) {
    throw new Error(
      "As rotas de compras ainda nao estao ativas no backend em execucao. Reinicie o backend atualizado e rode as migrations antes de salvar a revisao.",
    );
  }

  throw error;
}
