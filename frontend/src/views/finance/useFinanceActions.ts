import type { FormEvent } from "react";
import {
  apiDelete,
  apiPatch,
  apiPost,
  apiPut,
  openApiFile,
  type FiscalDocument,
  type FiscalSettings,
  type ManualFiscalDocumentDraft,
  type ManualFiscalDocumentInput,
  type PaymentMethod,
} from "../../api";

type FinanceActionsOptions = {
  refreshCashFlow: () => Promise<void>;
  refreshFiscalFlow: () => Promise<void>;
  refreshPaymentMethods: () => Promise<void>;
  requestConfirmation: (
    message: string,
    title?: string,
    confirmLabel?: string,
  ) => Promise<boolean>;
  runAction: (action: () => Promise<void>) => Promise<boolean>;
  showFiscalDocuments: () => void;
};

export function useFinanceActions({
  refreshCashFlow,
  refreshFiscalFlow,
  refreshPaymentMethods,
  requestConfirmation,
  runAction,
  showFiscalDocuments,
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
      await refreshCashFlow();
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
        closingPayments: cashRegisterClosingPayments(form),
      });

      formElement.reset();
      await refreshCashFlow();
    });
  }

  async function createCashRegisterMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const type = String(form.get("cashMovementType") ?? "");
    const amount = Number(form.get("cashMovementAmount") || 0);
    const reason = String(form.get("cashMovementReason") ?? "").trim();
    const movementLabelByType: Record<string, string> = {
      SUPPLY: "suprimento",
      WITHDRAWAL: "sangria",
    };
    const movementLabel = movementLabelByType[type] ?? "movimentacao";
    const confirmed = await requestConfirmation(
      `Registrar ${movementLabel} no valor de ${amount.toFixed(2)}?`,
      "Registrar movimentacao de caixa?",
      "Registrar",
    );

    if (!confirmed) {
      return;
    }

    await runAction(async () => {
      await apiPost("/cash-register/movements", {
        type,
        amount,
        reason,
      });

      formElement.reset();
      await refreshCashFlow();
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
      await refreshPaymentMethods();
    });
  }

  async function saveFiscalSettings(
    input: Pick<
      FiscalSettings,
      | "allowProduction"
      | "companyCnpj"
      | "defaultCofinsCst"
      | "defaultIcmsCst"
      | "defaultNatureOperation"
      | "defaultPisCst"
      | "defaultSaleCfop"
      | "environment"
      | "provider"
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
      await refreshFiscalFlow();
    });
  }

  async function syncFiscalDocuments(fiscalDocuments: FiscalDocument[]) {
    let firstError: unknown;

    for (const fiscalDocument of fiscalDocuments) {
      try {
        await apiPatch(`/fiscal-documents/${fiscalDocument.id}/sync`, {});
      } catch (error) {
        firstError ??= error;
      }
    }

    await refreshFiscalFlow();

    if (firstError) {
      throw firstError;
    }
  }

  async function issueManualFiscalDocument(
    input: ManualFiscalDocumentInput,
    draft?: ManualFiscalDocumentDraft,
  ) {
    const confirmed = await requestConfirmation(
      "A NF-e avulsa sera enviada ao provedor fiscal. Confira os dados antes de emitir.",
      "Emitir NF-e avulsa?",
      "Emitir NF-e",
    );

    if (!confirmed) {
      return;
    }

    await runAction(async () => {
      await apiPost("/fiscal-documents/manual", input);

      if (draft) {
        await apiDelete(`/fiscal-documents/manual/drafts/${draft.id}`);
      }

      await refreshFiscalFlow();
      showFiscalDocuments();
    });
  }

  async function previewManualFiscalDocument(input: ManualFiscalDocumentInput) {
    await runAction(async () => {
      await openApiFile("/fiscal-documents/manual/preview", input);
    });
  }

  async function saveManualFiscalDocumentDraft(
    input: ManualFiscalDocumentInput,
    draft?: ManualFiscalDocumentDraft,
  ) {
    await runAction(async () => {
      if (draft) {
        await apiPut(`/fiscal-documents/manual/drafts/${draft.id}`, input);
      } else {
        await apiPost("/fiscal-documents/manual/drafts", input);
      }

      await refreshFiscalFlow();
    });
  }

  async function deleteManualFiscalDocumentDraft(
    draft: ManualFiscalDocumentDraft,
  ) {
    const confirmed = await requestConfirmation(
      `Excluir o rascunho "${draft.title}"?`,
      "Excluir rascunho?",
      "Excluir",
    );

    if (!confirmed) {
      return;
    }

    await runAction(async () => {
      await apiDelete(`/fiscal-documents/manual/drafts/${draft.id}`);
      await refreshFiscalFlow();
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
      return false;
    }

    return runAction(async () => {
      await apiPatch(`/fiscal-documents/${fiscalDocument.id}/cancel`, {
        reason,
      });

      formElement.reset();
      await refreshFiscalFlow();
    });
  }

  async function issueFiscalDocumentCorrectionLetter(
    event: FormEvent<HTMLFormElement>,
    fiscalDocument: FiscalDocument,
  ) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const correctionText = String(
      form.get("fiscalCorrectionText") ?? "",
    ).trim();
    const confirmed = await requestConfirmation(
      "A carta de correcao sera enviada a SEFAZ e ficara vinculada a NF-e autorizada.",
      "Emitir carta de correcao?",
      "Emitir CC-e",
    );

    if (!confirmed) {
      return false;
    }

    return runAction(async () => {
      await apiPost(
        `/fiscal-documents/${fiscalDocument.id}/correction-letter`,
        { correctionText },
      );

      formElement.reset();
      await refreshFiscalFlow();
    });
  }

  return {
    cancelFiscalDocument,
    changePaymentMethodStatus,
    closeCashRegister,
    createCashRegisterMovement,
    issueManualFiscalDocument,
    issueFiscalDocumentCorrectionLetter,
    openCashRegister,
    previewManualFiscalDocument,
    saveManualFiscalDocumentDraft,
    deleteManualFiscalDocumentDraft,
    saveFiscalSettings,
    syncFiscalDocuments,
  };
}

function cashRegisterClosingPayments(form: FormData) {
  return Array.from(form.entries())
    .filter(([key]) => key.startsWith("closingPayment."))
    .map(([key, value]) => ({
      paymentMethodId: key.replace("closingPayment.", ""),
      amount: Number(value || 0),
    }));
}
