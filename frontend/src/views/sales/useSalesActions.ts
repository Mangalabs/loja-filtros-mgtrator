import type { FormEvent } from "react";
import {
  apiPatch,
  apiPost,
  apiPut,
  openApiFile,
  type Sale,
  type PickupReservation,
  type Product,
  type ShippingOrder,
} from "../../api";
import { formatQuantity } from "../../utils/format";
import type { PickupReservationDraftInput, SaleDraftInput } from "./SalesPages";

type SalesActionsOptions = {
  refreshSalesFlow: () => Promise<void>;
  requestConfirmation: (
    message: string,
    title?: string,
    confirmLabel?: string,
  ) => Promise<boolean>;
  products: Product[];
  runAction: (action: () => Promise<void>) => Promise<boolean>;
  showFiscalDocuments: () => void;
  showSalesHistory: () => void;
};

export function useSalesActions({
  products,
  refreshSalesFlow,
  requestConfirmation,
  runAction,
  showFiscalDocuments,
  showSalesHistory,
}: SalesActionsOptions) {
  async function createSale(input: SaleDraftInput) {
    const allowInsufficientStock = await confirmInsufficientStockIfNeeded(
      input.items,
      "availableStock",
      "A venda possui item(ns) sem saldo disponivel. Deseja concluir mesmo assim?",
    );

    if (allowInsufficientStock === null) {
      return false;
    }

    return runAction(async () => {
      await apiPost("/sales", {
        ...input,
        allowInsufficientStock,
      });
      showSalesHistory();
      await refreshSalesFlow();
    });
  }

  async function issueSaleFiscalDocument(
    sale: Sale,
    additionalInformation?: string,
  ) {
    const confirmed = await requestConfirmation(
      `Emitir NF-e para a venda de ${sale.clientName ?? "cliente nao identificado"} no valor de ${sale.totalAmount}?`,
      "Emitir NF-e?",
      "Emitir NF-e",
    );

    if (!confirmed) {
      return;
    }

    await runAction(async () => {
      await apiPost(`/sales/${sale.id}/fiscal-documents`, {
        ...fiscalDocumentPayload(additionalInformation),
      });
      showFiscalDocuments();
      await refreshSalesFlow();
    });
  }

  async function previewSaleFiscalDocument(
    sale: Sale,
    additionalInformation?: string,
  ) {
    await openApiFile(`/sales/${sale.id}/fiscal-documents/preview`, {
      ...fiscalDocumentPayload(additionalInformation),
    });
  }

  async function returnSaleItem(
    event: FormEvent<HTMLFormElement>,
    sale: Sale,
  ) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const saleItemId = String(form.get("saleReturnItemId") ?? "");
    const quantity = Number(form.get("saleReturnQuantity") ?? 0);
    const reason = String(form.get("saleReturnReason") ?? "").trim();
    const refundAmount = formNumberValue(form, "saleReturnRefundAmount");
    const refundPaymentMethodId = formStringValue(
      form,
      "saleReturnRefundPaymentMethodId",
    );
    const refundedAt = formDateValue(form, "saleReturnRefundedAt");
    const refundReference = formStringValue(form, "saleReturnRefundReference");
    const saleItem = sale.items.find((item) => item.id === saleItemId);
    const confirmed = await requestConfirmation(
      `Registrar devolucao de ${formatQuantity(String(quantity))} item(ns) de ${saleItem?.productName ?? "produto"}?`,
      "Registrar devolucao?",
      "Registrar",
    );

    if (!confirmed) {
      return false;
    }

    return runAction(async () => {
      await apiPost(`/sales/${sale.id}/returns`, {
        saleItemId,
        quantity,
        reason,
        ...optionalPayloadField("refundAmount", refundAmount),
        ...optionalPayloadField(
          "refundPaymentMethodId",
          refundPaymentMethodId,
        ),
        ...optionalPayloadField("refundedAt", refundedAt),
        ...optionalPayloadField("refundReference", refundReference),
      });
      formElement.reset();
      await refreshSalesFlow();
    });
  }

  async function updateSaleCommercialDetails(
    event: FormEvent<HTMLFormElement>,
    sale: Sale,
  ) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const confirmed = await requestConfirmation(
      `Atualizar dados comerciais da venda Nº ${sale.saleNumber}?`,
      "Atualizar venda?",
      "Atualizar",
    );

    if (!confirmed) {
      return false;
    }

    return runAction(async () => {
      await apiPatch(`/sales/${sale.id}/commercial-details`, {
        billingIssueDate: formDateValue(form, "saleBillingIssueDate"),
        billingDueDate: formDateValue(form, "saleBillingDueDate"),
        payments: formSalePayments(
          form,
          "saleCommercial",
          Number(sale.totalAmount),
        ),
      });
      await refreshSalesFlow();
    });
  }

  async function reopenSale(sale: Sale) {
    const confirmed = await requestConfirmation(
      `Reabrir a venda Nº ${sale.saleNumber} para correcao antes da NF-e?`,
      "Reabrir venda?",
      "Reabrir",
    );

    if (!confirmed) {
      return false;
    }

    return runAction(async () => {
      await apiPatch(`/sales/${sale.id}/reopen`, {});
      await refreshSalesFlow();
    });
  }

  async function completeReopenedSale(sale: Sale) {
    const confirmed = await requestConfirmation(
      `Concluir novamente a venda Nº ${sale.saleNumber}?`,
      "Concluir venda?",
      "Concluir",
    );

    if (!confirmed) {
      return false;
    }

    return runAction(async () => {
      await apiPatch(`/sales/${sale.id}/complete`, {});
      await refreshSalesFlow();
    });
  }

  async function updateOpenSale(sale: Sale, input: SaleDraftInput) {
    const allowInsufficientStock = await confirmSaleEditInsufficientStockIfNeeded(
      sale,
      input,
    );

    if (allowInsufficientStock === null) {
      return false;
    }

    const confirmed = await requestConfirmation(
      `Salvar correcoes da venda Nº ${sale.saleNumber}?`,
      "Salvar correção?",
      "Salvar",
    );

    if (!confirmed) {
      return false;
    }

    return runAction(async () => {
      await apiPut(`/sales/${sale.id}`, {
        ...input,
        allowInsufficientStock,
      });
      showSalesHistory();
      await refreshSalesFlow();
    });
  }

  async function issueShippingOrderFiscalDocument(
    order: ShippingOrder,
    additionalInformation?: string,
  ) {
    const confirmed = await requestConfirmation(
      `Emitir NF-e para o pedido com envio de ${order.clientName} no valor de ${order.totalAmount}?`,
      "Emitir NF-e?",
      "Emitir NF-e",
    );

    if (!confirmed) {
      return;
    }

    await runAction(async () => {
      await apiPost(`/shipping-orders/${order.id}/fiscal-documents`, {
        ...fiscalDocumentPayload(additionalInformation),
      });
      showFiscalDocuments();
      await refreshSalesFlow();
    });
  }

  async function previewShippingOrderFiscalDocument(
    order: ShippingOrder,
    additionalInformation?: string,
  ) {
    await openApiFile(`/shipping-orders/${order.id}/fiscal-documents/preview`, {
      ...fiscalDocumentPayload(additionalInformation),
    });
  }

  async function issuePickupReservationFiscalDocument(
    reservation: PickupReservation,
    additionalInformation?: string,
  ) {
    const confirmed = await requestConfirmation(
      `Emitir NF-e para a retirada de ${reservation.clientName} no valor de ${reservation.totalAmount}?`,
      "Emitir NF-e?",
      "Emitir NF-e",
    );

    if (!confirmed) {
      return;
    }

    await runAction(async () => {
      await apiPost(`/pickup-reservations/${reservation.id}/fiscal-documents`, {
        ...fiscalDocumentPayload(additionalInformation),
      });
      showFiscalDocuments();
      await refreshSalesFlow();
    });
  }

  async function previewPickupReservationFiscalDocument(
    reservation: PickupReservation,
    additionalInformation?: string,
  ) {
    await openApiFile(
      `/pickup-reservations/${reservation.id}/fiscal-documents/preview`,
      {
        ...fiscalDocumentPayload(additionalInformation),
      },
    );
  }

  async function approveShippingOrder(order: ShippingOrder) {
    const orderQuantity = order.items.reduce(
      (sum, item) => sum + Number(item.quantity),
      0,
    );
    const confirmed = await requestConfirmation(
      `Aprovar o pedido de ${order.clientName} e reservar ${formatQuantity(String(orderQuantity))} item(ns)?`,
      "Aprovar pedido?",
      "Aprovar e reservar",
    );

    if (!confirmed) {
      return;
    }

    const allowInsufficientStock = await confirmInsufficientStockIfNeeded(
      order.items,
      "availableStock",
      "Este pedido possui item(ns) sem saldo disponivel para reservar. Deseja aprovar mesmo assim?",
    );

    if (allowInsufficientStock === null) {
      return;
    }

    await runAction(async () => {
      await apiPatch(`/shipping-orders/${order.id}/approve`, {
        allowInsufficientStock,
      });
      await refreshSalesFlow();
    });
  }

  async function cancelShippingOrder(
    event: FormEvent<HTMLFormElement>,
    order: ShippingOrder,
  ) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const confirmed = await requestConfirmation(
      `Cancelar o pedido de ${order.clientName}? A reserva sera liberada, se existir.`,
      "Cancelar pedido?",
      "Cancelar pedido",
    );

    if (!confirmed) {
      return;
    }

    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPatch(`/shipping-orders/${order.id}/cancel`, {
        reason: String(form.get("shippingCancellationReason") ?? "").trim(),
      });
      await refreshSalesFlow();
    });
  }

  async function separateShippingOrder(order: ShippingOrder) {
    const confirmed = await requestConfirmation(
      `Confirmar separacao do pedido de ${order.clientName}?`,
      "Confirmar separacao?",
      "Confirmar",
    );

    if (!confirmed) {
      return;
    }

    await runAction(async () => {
      await apiPatch(`/shipping-orders/${order.id}/separate`, {});
      await refreshSalesFlow();
    });
  }

  async function completeShippingOrder(
    event: FormEvent<HTMLFormElement>,
    order: ShippingOrder,
  ) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const confirmed = await requestConfirmation(
      `Concluir o pedido de ${order.clientName} como venda e baixar o estoque?`,
      "Concluir venda?",
      "Concluir venda",
    );

    if (!confirmed) {
      return;
    }

    const form = new FormData(formElement);
    const allowInsufficientStock = await confirmInsufficientStockIfNeeded(
      order.items,
      "currentStock",
      "Este pedido possui item(ns) sem estoque fisico suficiente. Deseja concluir a venda mesmo assim?",
    );

    if (allowInsufficientStock === null) {
      return;
    }

    await runAction(async () => {
      const payments = formSalePayments(
        form,
        "shipping",
        Number(order.totalAmount),
      );

      await apiPatch(`/shipping-orders/${order.id}/complete`, {
        paymentMethodId: formStringValue(form, "shippingPaymentMethodId"),
        ...optionalPayloadField("payments", payments.length ? payments : null),
        billingIssueDate: formDateValue(form, "shippingBillingIssueDate"),
        billingDueDate: formDateValue(form, "shippingBillingDueDate"),
        allowInsufficientStock,
      });
      showSalesHistory();
      await refreshSalesFlow();
    });
  }

  async function createPickupReservation(input: PickupReservationDraftInput) {
    const allowInsufficientStock = await confirmInsufficientStockIfNeeded(
      input.items,
      "availableStock",
      "A reserva possui item(ns) sem saldo disponivel. Deseja reservar mesmo assim?",
    );

    if (allowInsufficientStock === null) {
      return false;
    }

    return runAction(async () => {
      await apiPost("/pickup-reservations", {
        ...input,
        allowInsufficientStock,
      });
      await refreshSalesFlow();
    });
  }

  async function cancelPickupReservation(
    event: FormEvent<HTMLFormElement>,
    reservation: PickupReservation,
  ) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const confirmed = await requestConfirmation(
      `Cancelar a reserva de ${reservation.clientName}? O estoque reservado sera liberado.`,
      "Cancelar reserva?",
      "Cancelar reserva",
    );

    if (!confirmed) {
      return;
    }

    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPatch(`/pickup-reservations/${reservation.id}/cancel`, {
        reason: String(form.get("pickupCancellationReason") ?? "").trim(),
      });
      await refreshSalesFlow();
    });
  }

  async function completePickupReservation(
    event: FormEvent<HTMLFormElement>,
    reservation: PickupReservation,
  ) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const confirmed = await requestConfirmation(
      `Concluir a reserva de ${reservation.clientName} como venda e baixar o estoque?`,
      "Concluir retirada?",
      "Concluir venda",
    );

    if (!confirmed) {
      return;
    }

    const form = new FormData(formElement);
    const allowInsufficientStock = await confirmInsufficientStockIfNeeded(
      reservation.items,
      "currentStock",
      "Esta retirada possui item(ns) sem estoque fisico suficiente. Deseja concluir mesmo assim?",
    );

    if (allowInsufficientStock === null) {
      return;
    }

    await runAction(async () => {
      const payments = formSalePayments(
        form,
        "pickup",
        Number(reservation.totalAmount),
      );

      await apiPatch(`/pickup-reservations/${reservation.id}/complete`, {
        paymentMethodId: formStringValue(form, "pickupPaymentMethodId"),
        ...optionalPayloadField("payments", payments.length ? payments : null),
        billingIssueDate: formDateValue(form, "pickupBillingIssueDate"),
        billingDueDate: formDateValue(form, "pickupBillingDueDate"),
        allowInsufficientStock,
      });
      showSalesHistory();
      await refreshSalesFlow();
    });
  }

  return {
    approveShippingOrder,
    cancelPickupReservation,
    cancelShippingOrder,
    completeReopenedSale,
    completePickupReservation,
    completeShippingOrder,
    createPickupReservation,
    createSale,
    issuePickupReservationFiscalDocument,
    issueSaleFiscalDocument,
    issueShippingOrderFiscalDocument,
    previewPickupReservationFiscalDocument,
    previewSaleFiscalDocument,
    previewShippingOrderFiscalDocument,
    reopenSale,
    returnSaleItem,
    separateShippingOrder,
    updateOpenSale,
    updateSaleCommercialDetails,
  };

  async function confirmInsufficientStockIfNeeded(
    items: Array<{ productId: string; quantity: number | string }>,
    stockField: "availableStock" | "currentStock",
    message: string,
  ) {
    if (!hasInsufficientStock(items, stockField, products)) {
      return false;
    }

    const confirmed = await requestConfirmation(
      message,
      "Continuar sem estoque?",
      "Continuar",
    );

    return confirmed ? true : null;
  }

  async function confirmSaleEditInsufficientStockIfNeeded(
    sale: Sale,
    input: SaleDraftInput,
  ) {
    if (!hasInsufficientSaleCorrectionStock(sale, input, products)) {
      return false;
    }

    const confirmed = await requestConfirmation(
      "A correção aumenta item(ns) sem estoque fisico suficiente. Deseja salvar mesmo assim?",
      "Continuar sem estoque?",
      "Continuar",
    );

    return confirmed ? true : null;
  }
}

function formDateValue(form: FormData, field: string) {
  return String(form.get(field) ?? "") || null;
}

function formStringValue(form: FormData, field: string) {
  return String(form.get(field) ?? "").trim() || null;
}

function formNumberValue(form: FormData, field: string) {
  const value = String(form.get(field) ?? "");
  return value ? Number(value) : null;
}

function formSalePayments(form: FormData, prefix: string, totalAmount: number) {
  const methodIds = form
    .getAll(`${prefix}PaymentMethodId`)
    .map((value) => String(value).trim())
    .filter(Boolean);
  const amounts = form
    .getAll(`${prefix}PaymentAmount`)
    .map((value) => String(value).trim());
  const usesSinglePaymentTotal = methodIds.length === 1 && !amounts[0];

  return methodIds.map((paymentMethodId, index) => ({
    paymentMethodId,
    amount: usesSinglePaymentTotal
      ? Number(totalAmount.toFixed(2))
      : Number(amounts[index] || 0),
  }));
}

function optionalPayloadField<T>(field: string, value: T | null) {
  return value === null ? {} : { [field]: value };
}

function fiscalDocumentPayload(additionalInformation?: string) {
  const notes = additionalInformation?.trim();

  return {
    documentType: "NFE",
    ...(notes ? { additionalInformation: notes } : {}),
  };
}

function hasInsufficientStock(
  items: Array<{ productId: string; quantity: number | string }>,
  stockField: "availableStock" | "currentStock",
  products: Product[],
) {
  return aggregateItems(items).some((item) => {
    const product = products.find(
      (currentProduct) => currentProduct.id === item.productId,
    );

    return Number(product?.[stockField] ?? 0) < item.quantity;
  });
}

function aggregateItems(
  items: Array<{ productId: string; quantity: number | string }>,
) {
  return items.reduce<Array<{ productId: string; quantity: number }>>(
    (aggregatedItems, item) => {
      const existing = aggregatedItems.find(
        (currentItem) => currentItem.productId === item.productId,
      );

      if (existing) {
        existing.quantity += Number(item.quantity);
        return aggregatedItems;
      }

      aggregatedItems.push({
        productId: item.productId,
        quantity: Number(item.quantity),
      });

      return aggregatedItems;
    },
    [],
  );
}

function hasInsufficientSaleCorrectionStock(
  sale: Sale,
  input: SaleDraftInput,
  products: Product[],
) {
  const currentItems = aggregateItems(
    sale.items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
    })),
  );
  const nextItems = aggregateItems(input.items);
  const productIds = new Set([
    ...currentItems.map((item) => item.productId),
    ...nextItems.map((item) => item.productId),
  ]);

  return [...productIds].some((productId) => {
    const currentQuantity =
      currentItems.find((item) => item.productId === productId)?.quantity ?? 0;
    const nextQuantity =
      nextItems.find((item) => item.productId === productId)?.quantity ?? 0;
    const increase = nextQuantity - currentQuantity;
    const product = products.find(
      (currentProduct) => currentProduct.id === productId,
    );

    return increase > 0 && Number(product?.currentStock ?? 0) < increase;
  });
}
