import type { FormEvent } from "react";
import { apiPatch, apiPost, type PaymentMethod } from "../../api";

type FinanceActionsOptions = {
  loadCatalog: () => Promise<void>;
  requestConfirmation: (message: string, title?: string, confirmLabel?: string) => Promise<boolean>;
  runAction: (action: () => Promise<void>) => Promise<boolean>;
};

export function useFinanceActions({ loadCatalog, requestConfirmation, runAction }: FinanceActionsOptions) {
  async function openCashRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPost("/cash-register/open", {
        openingBalance: Number(form.get("openingBalance") || 0),
      });

      formElement.reset();
      await loadCatalog();
    });
  }

  async function closeCashRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const confirmed = await requestConfirmation(
      "Depois disso, novas vendas exigirao uma nova abertura.",
      "Fechar caixa?",
      "Fechar caixa",
    );

    if (!confirmed) {
      return;
    }

    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPatch("/cash-register/close", {
        closingBalance: Number(form.get("closingBalance") || 0),
      });

      formElement.reset();
      await loadCatalog();
    });
  }

  async function changePaymentMethodStatus(paymentMethod: PaymentMethod) {
    const nextStatus = paymentMethod.active ? "inativar" : "ativar";
    const confirmed = await requestConfirmation(
      `Confirmar ${nextStatus} a forma de pagamento "${paymentMethod.name}"?`,
      "Alterar forma de pagamento?",
    );

    if (!confirmed) {
      return;
    }

    await runAction(async () => {
      await apiPatch(`/payment-methods/${paymentMethod.id}/status`, {
        active: !paymentMethod.active,
      });
      await loadCatalog();
    });
  }

  return {
    changePaymentMethodStatus,
    closeCashRegister,
    openCashRegister,
  };
}
