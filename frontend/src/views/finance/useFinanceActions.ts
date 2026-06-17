import type { FormEvent } from "react";
import {
  apiPatch,
  apiPost,
  apiPut,
  type FiscalDocument,
  type FiscalSettings,
  type PaymentMethod,
} from "../../api";

type FinanceActionsOptions = {
  loadCatalog: () => Promise<void>;
  requestConfirmation: (
    message: string,
    title?: string,
    confirmLabel?: string,
  ) => Promise<boolean>;
  runAction: (action: () => Promise<void>) => Promise<boolean>;
};

export function useFinanceActions({
  loadCatalog,
  requestConfirmation,
  runAction,
}: FinanceActionsOptions) {
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

  async function saveFiscalSettings(
    input: Pick<
      FiscalSettings,
      "allowProduction" | "companyCnpj" | "environment" | "provider"
    > & { productionConfirmation?: string | null },
  ) {
    const productionWarning =
      input.environment === "PRODUCTION"
        ? "Voce esta habilitando ambiente de producao. Use somente quando a loja estiver pronta para emitir notas com validade fiscal."
        : "Salvar configuracao fiscal da loja?";
    const confirmed = await requestConfirmation(
      productionWarning,
      "Salvar configuracao fiscal?",
      "Salvar configuracao",
    );

    if (!confirmed) {
      return;
    }

    await runAction(async () => {
      await apiPut("/fiscal-settings", input);
      await loadCatalog();
    });
  }

  async function syncFiscalDocument(fiscalDocument: FiscalDocument) {
    await runAction(async () => {
      await apiPatch(`/fiscal-documents/${fiscalDocument.id}/sync`, {});
      await loadCatalog();
    });
  }

  async function cancelFiscalDocument(
    event: FormEvent<HTMLFormElement>,
    fiscalDocument: FiscalDocument,
  ) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const reason = String(form.get("fiscalCancellationReason") ?? "").trim();
    const confirmed = await requestConfirmation(
      "A nota sera enviada ao provedor fiscal para cancelamento.",
      "Cancelar NF-e?",
      "Cancelar NF-e",
    );

    if (!confirmed) {
      return;
    }

    await runAction(async () => {
      await apiPatch(`/fiscal-documents/${fiscalDocument.id}/cancel`, {
        reason,
      });

      formElement.reset();
      await loadCatalog();
    });
  }

  return {
    cancelFiscalDocument,
    changePaymentMethodStatus,
    closeCashRegister,
    openCashRegister,
    saveFiscalSettings,
    syncFiscalDocument,
  };
}
