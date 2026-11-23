import type { FormEvent } from 'react'
import {
  apiDelete,
  apiPatch,
  apiPost,
  apiPut,
  type Quote,
  type QuoteFormDraft,
} from '../../api'
import type {
  QuoteDraftInput,
  QuoteFormDraftPayload,
  QuoteSaleClosingInput,
} from './QuotesPage'

type QuoteActionsOptions = {
  refreshQuoteFlow: () => Promise<void>
  refreshSalesFlow: () => Promise<void>
  requestConfirmation: (
    message: string,
    title?: string,
    confirmLabel?: string,
  ) => Promise<boolean>
  runAction: (action: () => Promise<void>) => Promise<boolean>
  showQuotes: () => void
  showShippingOrders: () => void
}

export function useQuoteActions({
  refreshQuoteFlow,
  refreshSalesFlow,
  requestConfirmation,
  runAction,
  showQuotes,
  showShippingOrders,
}: QuoteActionsOptions) {
  async function createQuote(input: QuoteDraftInput) {
    return runAction(async () => {
      await apiPost('/quotes', input)
      await refreshQuoteFlow()
      showQuotes()
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

  async function completeQuoteAsSale(
    quote: Quote,
    input: QuoteSaleClosingInput,
  ) {
    const stockWarning =
      'Este orçamento possui item(ns) sem estoque físico suficiente. Deseja concluir a venda mesmo assim?'
    const hasInsufficientStock = quote.items.some(
      (item) => Number(item.productAvailableStock) < Number(item.quantity),
    )
    let allowInsufficientStock = false

    if (hasInsufficientStock) {
      allowInsufficientStock = await requestConfirmation(
        stockWarning,
        'Estoque insuficiente',
        'Concluir mesmo assim',
      )

      if (!allowInsufficientStock) {
        return false
      }
    }

    return runAction(async () => {
      try {
        await completeQuoteSaleRequest(allowInsufficientStock)
      } catch (error) {
        if (allowInsufficientStock || !isInsufficientStockError(error)) {
          throw error
        }

        const confirmed = await requestConfirmation(
          stockWarning,
          'Estoque insuficiente',
          'Concluir mesmo assim',
        )

        if (!confirmed) {
          throw error
        }

        await completeQuoteSaleRequest(true)
      }

      await Promise.all([refreshQuoteFlow(), refreshSalesFlow()])
      showShippingOrders()
    })

    function completeQuoteSaleRequest(confirmedInsufficientStock: boolean) {
      return apiPost(`/quotes/${quote.id}/sale`, {
        ...input,
        allowInsufficientStock: confirmedInsufficientStock,
      })
    }
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
    completeQuoteAsSale,
    deleteQuoteFormDraft,
    discardQuoteFormDraft,
    openShippingOrders: showShippingOrders,
    saveQuoteFormDraft,
    updateQuote,
  }
}

function isInsufficientStockError(error: unknown) {
  return (
    error instanceof Error &&
    error.message === 'Estoque insuficiente para concluir esta venda.'
  )
}
