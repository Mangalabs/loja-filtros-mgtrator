import { db } from '../../database/knex.js'
import { generateQuotePdf } from '../../integrations/pdf/quote-pdf.js'
import { findBranchById } from '../../models/branches/branches.model.js'
import {
  activeQuoteClientExists,
  activeQuotePaymentMethodExists,
  cancelQuote,
  getQuoteById,
  insertQuote,
  listActiveQuoteProducts,
  listQuotes,
  lockQuoteForCancellation,
  updateQuote,
  type QuoteInput,
} from '../../models/quotes/quotes.model.js'
import {
  findShippingOrderByQuoteId,
  insertShippingOrderFromQuote,
} from '../../models/shipping-orders/shipping-orders.model.js'
import { AppError } from '../../shared/errors/app-error.js'

export async function indexQuotes(filters: { branchId: string }) {
  return {
    code: 200,
    status: 'success',
    data: await listQuotes(filters),
  }
}

export async function showQuote(id: string, branchId: string) {
  const quote = await getQuoteById(id, db, { branchId })

  if (!quote) {
    throw new AppError('Orçamento nao encontrado.', 404)
  }

  return {
    code: 200,
    status: 'success',
    data: quote,
  }
}

export async function showQuotePdf(id: string, branchId: string) {
  const quote = await getQuoteById(id, db, { branchId })

  if (!quote) {
    throw new AppError('Orçamento nao encontrado.', 404)
  }

  return {
    filename: `orçamento-${quote.id}.pdf`,
    pdf: await generateQuotePdf(quote, await pdfStoreProfile(quote.branchId)),
  }
}

async function pdfStoreProfile(branchId: string | null) {
  return branchId ? findBranchById(branchId) : null
}

export async function storeQuote(
  input: QuoteInput,
  createdByUserId: string,
  branchId: string,
) {
  const quote = await db.transaction(async (transaction) => {
    const {
      discountAmount,
      discountPercentage,
      quoteItems,
      paymentInstallments,
      subtotalAmount,
      totalAmount,
    } = await prepareQuoteInput(transaction, input, branchId)

    return insertQuote(
      transaction,
      input,
      createdByUserId,
      branchId,
      quoteItems,
      subtotalAmount,
      discountPercentage,
      discountAmount,
      totalAmount,
      paymentInstallments,
    )
  })

  return {
    code: 201,
    status: 'success',
    data: quote,
  }
}

export async function updateDraftQuote(
  id: string,
  input: QuoteInput,
  branchId: string,
) {
  const quote = await db.transaction(async (transaction) => {
    const currentQuote = await getQuoteById(id, transaction, { branchId })

    if (!currentQuote) {
      throw new AppError('Orçamento nao encontrado.', 404)
    }

    if (currentQuote.status === 'CANCELLED') {
      throw new AppError('Orçamento cancelado nao pode ser editado.', 409)
    }

    const existingOrder = await findShippingOrderByQuoteId(transaction, id)

    if (existingOrder) {
      throw new AppError(
        'Orçamento enviado para pedido de envio deve seguir o fluxo do pedido.',
        409,
      )
    }

    const {
      discountAmount,
      discountPercentage,
      quoteItems,
      paymentInstallments,
      subtotalAmount,
      totalAmount,
    } = await prepareQuoteInput(transaction, input, branchId)

    return updateQuote(
      transaction,
      id,
      input,
      quoteItems,
      subtotalAmount,
      discountPercentage,
      discountAmount,
      totalAmount,
      paymentInstallments,
    )
  })

  return {
    code: 200,
    status: 'success',
    data: quote,
  }
}

export async function createShippingOrderFromQuote(
  id: string,
  createdByUserId: string,
  branchId: string,
) {
  const order = await db.transaction(async (transaction) => {
    const quote = await getQuoteById(id, transaction, { branchId })

    if (!quote) {
      throw new AppError('Orçamento nao encontrado.', 404)
    }

    const existingOrder = await findShippingOrderByQuoteId(transaction, id)

    if (existingOrder) {
      throw new AppError(
        'Este orçamento ja foi enviado para pedidos de envio.',
        409,
      )
    }

    if (quote.items.length === 0) {
      throw new AppError(
        'Orçamento sem itens nao pode gerar pedido de envio.',
        422,
      )
    }

    if (quote.status === 'CANCELLED') {
      throw new AppError(
        'Orçamento cancelado nao pode gerar pedido de envio.',
        409,
      )
    }

    return insertShippingOrderFromQuote(transaction, quote, createdByUserId)
  })

  return {
    code: 201,
    status: 'success',
    data: order,
  }
}

export async function cancelDraftQuote(
  id: string,
  reason: string,
  cancelledByUserId: string,
  branchId: string,
) {
  const quote = await db.transaction(async (transaction) => {
    const currentQuote = await lockQuoteForCancellation(
      transaction,
      id,
      branchId,
    )

    if (!currentQuote) {
      throw new AppError('Orçamento nao encontrado.', 404)
    }

    if (currentQuote.status === 'CANCELLED') {
      throw new AppError('Este orçamento ja foi cancelado.', 409)
    }

    const existingOrder = await findShippingOrderByQuoteId(transaction, id)

    if (existingOrder) {
      throw new AppError(
        'Orçamento enviado para pedido de envio deve seguir o fluxo do pedido.',
        409,
      )
    }

    return cancelQuote(transaction, id, cancelledByUserId, reason)
  })

  return {
    code: 200,
    status: 'success',
    data: quote,
  }
}

async function prepareQuoteInput(
  transaction: Parameters<typeof activeQuoteClientExists>[0],
  input: QuoteInput,
  branchId: string,
) {
  if (!(await activeQuoteClientExists(transaction, input.clientId, branchId))) {
    throw new AppError('Cliente informado nao disponivel.', 422)
  }

  if (
    !(await activeQuotePaymentMethodExists(transaction, input.paymentMethodId))
  ) {
    throw new AppError('Forma de pagamento informada nao disponivel.', 422)
  }

  const productIds = [...new Set(input.items.map((item) => item.productId))]
  const products = await listActiveQuoteProducts(
    transaction,
    productIds,
    branchId,
  )

  if (products.length !== productIds.length) {
    throw new AppError(
      'Um ou mais produtos informados nao estao disponiveis para orçamento.',
      422,
    )
  }

  const quoteItems = input.items.map((item, index) => {
    const product = products.find(
      (currentProduct) => currentProduct.id === item.productId,
    )

    if (!product) {
      throw new AppError(
        'Produto informado nao disponivel para orçamento.',
        422,
      )
    }

    const unitPrice = item.unitPrice ?? Number(product.salePrice)
    const itemSubtotalAmount = Number((unitPrice * item.quantity).toFixed(2))
    const discountPercentage = Number((item.discountPercentage ?? 0).toFixed(2))
    const discountAmount = percentageAmount(
      itemSubtotalAmount,
      discountPercentage,
    )

    return {
      productId: item.productId,
      description:
        item.description?.trim() || product.description || product.name,
      quantity: item.quantity,
      unitPrice,
      discountPercentage,
      discountAmount,
      position: index + 1,
      totalAmount: Number((itemSubtotalAmount - discountAmount).toFixed(2)),
    }
  })
  const subtotalAmount = Number(
    quoteItems
      .reduce(
        (sum, item) =>
          sum + Number((item.unitPrice * item.quantity).toFixed(2)),
        0,
      )
      .toFixed(2),
  )
  const totalBeforeGeneralDiscount = Number(
    quoteItems.reduce((sum, item) => sum + item.totalAmount, 0).toFixed(2),
  )
  const discountPercentage = Number((input.discountPercentage ?? 0).toFixed(2))
  const discountAmount = percentageAmount(
    totalBeforeGeneralDiscount,
    discountPercentage,
  )

  const totalAmount = Number(
    (totalBeforeGeneralDiscount - discountAmount).toFixed(2),
  )
  const paymentInstallments = normalizePaymentInstallments(
    input.paymentInstallments ?? [],
    totalAmount,
    input.billingIssueDate,
  )

  return {
    discountAmount,
    discountPercentage,
    paymentInstallments,
    quoteItems,
    subtotalAmount,
    totalAmount,
  }
}

function percentageAmount(baseAmount: number, percentage: number) {
  return Number(((baseAmount * percentage) / 100).toFixed(2))
}

function normalizePaymentInstallments(
  installments: NonNullable<QuoteInput['paymentInstallments']>,
  totalAmount: number,
  billingIssueDate?: string | null,
) {
  if (installments.length === 0) {
    return []
  }

  const sortedInstallments = [...installments].sort(
    (current, next) => current.position - next.position,
  )
  const hasSequentialPositions = sortedInstallments.every(
    (installment, index) => installment.position === index + 1,
  )

  if (!hasSequentialPositions) {
    throw new AppError('Parcelas do orçamento devem ser sequenciais.', 422)
  }

  const hasInvalidDueDate =
    Boolean(billingIssueDate) &&
    sortedInstallments.some(
      (installment) => installment.dueDate < String(billingIssueDate),
    )

  if (hasInvalidDueDate) {
    throw new AppError(
      'Vencimento das parcelas nao pode ser anterior a data da fatura.',
      422,
    )
  }

  const installmentsTotal = Number(
    sortedInstallments
      .reduce((sum, installment) => sum + installment.amount, 0)
      .toFixed(2),
  )

  if (installmentsTotal !== totalAmount) {
    throw new AppError(
      'Total das parcelas deve ser igual ao total do orçamento.',
      422,
    )
  }

  return sortedInstallments.map((installment) => ({
    ...installment,
    amount: Number(installment.amount.toFixed(2)),
  }))
}
