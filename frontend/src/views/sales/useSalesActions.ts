import type { FormEvent } from "react";
import {
  apiPatch,
  apiPost,
  type Sale,
  type PickupReservation,
  type ShippingOrder,
} from "../../api";
import { formatQuantity } from "../../utils/format";
import type { PickupReservationDraftInput, SaleDraftInput } from "./SalesPages";

type SalesActionsOptions = {
  loadCatalog: () => Promise<void>;
  requestConfirmation: (
    message: string,
    title?: string,
    confirmLabel?: string,
  ) => Promise<boolean>;
  runAction: (action: () => Promise<void>) => Promise<boolean>;
};

export function useSalesActions({
  loadCatalog,
  requestConfirmation,
  runAction,
}: SalesActionsOptions) {
  async function createSale(input: SaleDraftInput) {
    return runAction(async () => {
      await apiPost("/sales", input);
      await loadCatalog();
    });
  }

  async function issueSaleFiscalDocument(sale: Sale) {
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
        documentType: "NFE",
      });
      await loadCatalog();
    });
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

    await runAction(async () => {
      await apiPatch(`/shipping-orders/${order.id}/approve`, {});
      await loadCatalog();
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
      await loadCatalog();
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
      await loadCatalog();
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

    await runAction(async () => {
      await apiPatch(`/shipping-orders/${order.id}/complete`, {
        paymentMethodId: String(form.get("shippingPaymentMethodId") ?? ""),
      });
      await loadCatalog();
    });
  }

  async function createPickupReservation(input: PickupReservationDraftInput) {
    return runAction(async () => {
      await apiPost("/pickup-reservations", input);
      await loadCatalog();
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
      await loadCatalog();
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

    await runAction(async () => {
      await apiPatch(`/pickup-reservations/${reservation.id}/complete`, {
        paymentMethodId: String(form.get("pickupPaymentMethodId") ?? ""),
      });
      await loadCatalog();
    });
  }

  return {
    approveShippingOrder,
    cancelPickupReservation,
    cancelShippingOrder,
    completePickupReservation,
    completeShippingOrder,
    createPickupReservation,
    createSale,
    issueSaleFiscalDocument,
    separateShippingOrder,
  };
}
