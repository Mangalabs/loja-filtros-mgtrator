import type { FormEvent } from 'react'
import { apiPatch, apiPost, apiPut, type Quote } from '../../api'
import type { QuoteDraftInput } from './QuotesPage'

type QuoteActionsOptions = {
  loadCatalog: () => Promise<void>
  requestConfirmation: (
    message: string,
    title?: string,
    confirmLabel?: string,
  ) => Promise<boolean>
  runAction: (action: () => Promise<void>) => Promise<boolean>
  showShippingOrders: () => void
}

export function useQuoteActions({
  loadCatalog,
  requestConfirmation,
  runAction,
  showShippingOrders,
}: QuoteActionsOptions) {
  async function createQuote(input: QuoteDraftInput) {
    return runAction(async () => {
      await apiPost('/quotes', input)
      await loadCatalog()
    })
  }

  async function updateQuote(id: string, input: QuoteDraftInput) {
    return runAction(async () => {
      await apiPut(`/quotes/${id}`, input)
      await loadCatalog()
    })
  }

  async function createShippingOrderFromQuote(quote: Quote) {
    const confirmed = await requestConfirmation(
      `Criar pedido para envio a partir do orçamento de ${quote.clientName}?`,
      'Criar pedido para envio?',
      'Criar pedido',
    )

    if (!confirmed) {
      return
    }

    await runAction(async () => {
      await apiPost(`/quotes/${quote.id}/shipping-order`, {})
      await loadCatalog()
      showShippingOrders()
    })
  }

  async function cancelQuote(event: FormEvent<HTMLFormElement>, quote: Quote) {
    event.preventDefault()
    const formElement = event.currentTarget
    const confirmed = await requestConfirmation(
      `Cancelar o orcamento de ${quote.clientName}?`,
      'Cancelar orcamento?',
      'Cancelar orcamento',
    )

    if (!confirmed) {
      return
    }

    const form = new FormData(formElement)

    await runAction(async () => {
      await apiPatch(`/quotes/${quote.id}/cancel`, {
        reason: String(form.get('quoteCancellationReason') ?? '').trim(),
      })
      await loadCatalog()
    })
  }

  return {
    cancelQuote,
    createQuote,
    createShippingOrderFromQuote,
    updateQuote,
  }
}
