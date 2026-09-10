import type { FormEvent } from 'react'
import {
  apiDelete,
  apiPatch,
  apiPost,
  apiPut,
  type Quote,
  type QuoteFormDraft,
} from '../../api'
import type { QuoteDraftInput, QuoteFormDraftPayload } from './QuotesPage'

type QuoteActionsOptions = {
  refreshQuoteFlow: () => Promise<void>
  requestConfirmation: (
    message: string,
    title?: string,
    confirmLabel?: string,
  ) => Promise<boolean>
  runAction: (action: () => Promise<void>) => Promise<boolean>
  showShippingOrders: () => void
}

export function useQuoteActions({
  refreshQuoteFlow,
  requestConfirmation,
  runAction,
  showShippingOrders,
}: QuoteActionsOptions) {
  async function createQuote(input: QuoteDraftInput) {
    return runAction(async () => {
      await apiPost('/quotes', input)
      await refreshQuoteFlow()
    })
  }

  async function updateQuote(id: string, input: QuoteDraftInput) {
    return runAction(async () => {
      await apiPut(`/quotes/${id}`, input)
      await refreshQuoteFlow()
    })
  }

  async function saveQuoteFormDraft(
    input: QuoteFormDraftPayload,
    draft?: QuoteFormDraft,
  ) {
    return runAction(async () => {
      if (draft) {
        await apiPut(`/quotes/drafts/${draft.id}`, input)
      } else {
        await apiPost('/quotes/drafts', input)
      }

      await refreshQuoteFlow()
    })
  }

  async function deleteQuoteFormDraft(draft: QuoteFormDraft) {
    const confirmed = await requestConfirmation(
      `Excluir o rascunho "${draft.title}"?`,
      'Excluir rascunho?',
      'Excluir',
    )

    if (!confirmed) {
      return false
    }

    return runAction(async () => {
      await apiDelete(`/quotes/drafts/${draft.id}`)
      await refreshQuoteFlow()
    })
  }

  async function discardQuoteFormDraft(draft: QuoteFormDraft) {
    return runAction(async () => {
      await apiDelete(`/quotes/drafts/${draft.id}`)
      await refreshQuoteFlow()
    })
  }

  async function createShippingOrderFromQuote(quote: Quote) {
    const confirmed = await requestConfirmation(
      `Criar venda a partir do orçamento de ${quote.clientName}?`,
      'Criar venda?',
      'Criar venda',
    )

    if (!confirmed) {
      return
    }

    await runAction(async () => {
      await apiPost(`/quotes/${quote.id}/shipping-order`, {})
      showShippingOrders()
      await refreshQuoteFlow()
    })
  }

  async function cancelQuote(event: FormEvent<HTMLFormElement>, quote: Quote) {
    event.preventDefault()
    const formElement = event.currentTarget
    const confirmed = await requestConfirmation(
      `Cancelar o orçamento de ${quote.clientName}?`,
      'Cancelar orçamento?',
      'Cancelar orçamento',
    )

    if (!confirmed) {
      return
    }

    const form = new FormData(formElement)

    await runAction(async () => {
      await apiPatch(`/quotes/${quote.id}/cancel`, {
        reason: String(form.get('quoteCancellationReason') ?? '').trim(),
      })
      await refreshQuoteFlow()
    })
  }

  return {
    cancelQuote,
    createQuote,
    createShippingOrderFromQuote,
    deleteQuoteFormDraft,
    discardQuoteFormDraft,
    saveQuoteFormDraft,
    updateQuote,
  }
}
