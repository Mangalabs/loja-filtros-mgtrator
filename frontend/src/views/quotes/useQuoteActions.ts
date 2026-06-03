import { apiPost, type Quote } from "../../api";
import type { QuoteDraftInput } from "./QuotesPage";

type QuoteActionsOptions = {
  loadCatalog: () => Promise<void>;
  requestConfirmation: (message: string, title?: string, confirmLabel?: string) => Promise<boolean>;
  runAction: (action: () => Promise<void>) => Promise<boolean>;
  showShippingOrders: () => void;
};

export function useQuoteActions({
  loadCatalog,
  requestConfirmation,
  runAction,
  showShippingOrders,
}: QuoteActionsOptions) {
  async function createQuote(input: QuoteDraftInput) {
    return runAction(async () => {
      await apiPost("/quotes", input);
      await loadCatalog();
    });
  }

  async function createShippingOrderFromQuote(quote: Quote) {
    const confirmed = await requestConfirmation(
      `Enviar o orcamento de ${quote.clientName} para a fila de pedidos para envio?`,
      "Enviar para envio?",
      "Enviar para envio",
    );

    if (!confirmed) {
      return;
    }

    await runAction(async () => {
      await apiPost(`/quotes/${quote.id}/shipping-order`, {});
      await loadCatalog();
      showShippingOrders();
    });
  }

  return {
    createQuote,
    createShippingOrderFromQuote,
  };
}
