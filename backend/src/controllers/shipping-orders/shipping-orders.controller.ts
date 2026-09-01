import { db } from '../../database/knex.js'
import {
  activePaymentMethodExists,
  findOpenCashRegister,
  insertSale,
  type SaleInput,
} from '../../models/sales/sales.model.js'
import {
  activeShippingClientExists,
  approveShippingOrder,
  cancelShippingOrder,
  completeShippingOrder,
  insertShippingOrder,
  listShippingOrders,
  lockShippingOrder,
  lockReservableProduct,
  releaseShippingOrderReservation,
  separateShippingOrder,
  type ShippingOrderInput,
} from '../../models/shipping-orders/shipping-orders.model.js'
import { AppError } from '../../shared/errors/app-error.js'

export async function indexShippingOrders(filters: { branchId: string }) {
  return {
    code: 200,
    status: 'success',
    data: await listShippingOrders(filters),
  }
}

export async function storeShippingOrder(
  input: ShippingOrderInput,
  createdByUserId: string,
  branchId: string,
) {
  const order = await db.transaction(async (transaction) => {
    if (
      !(await activeShippingClientExists(transaction, input.clientId, branchId))
    ) {
      throw new AppError('Cliente informado nao disponivel.', 422)
    }

    const product = await lockReservableProduct(
      transaction,
      input.productId,
      branchId,
    )

    if (!product || !product.active) {
      throw new AppError(
        'Produto informado nao disponivel para orçamento.',
        422,
      )
    }

    const availableStock =
      Number(product.currentStock) - Number(product.reservedStock)

    if (availableStock < input.quantity && !input.allowInsufficientStock) {
      throw new AppError('Quantidade indisponivel para este orçamento.', 422)
    }

    const unitPrice = Number(product.salePrice)
    const totalAmount = Number((unitPrice * input.quantity).toFixed(2))

    return insertShippingOrder(
      transaction,
      input,
      createdByUserId,
      branchId,
      unitPrice,
      totalAmount,
    )
  })

  return {
    code: 201,
    status: 'success',
    data: order,
  }
}

export async function approveQuotedShippingOrder(
  id: string,
  approvedByUserId: string,
  branchId: string,
  allowInsufficientStock = false,
) {
  const order = await db.transaction(async (transaction) => {
    const quotedOrder = await lockShippingOrder(transaction, id, branchId)

    if (!quotedOrder) {
      throw new AppError('Orçamento para envio nao encontrado.', 404)
    }

    if (quotedOrder.status === 'CANCELLED') {
      throw new AppError(
        'Pedido cancelado nao pode ser aprovado para separacao.',
        409,
      )
    }

    if (quotedOrder.status === 'APPROVED') {
      throw new AppError('Este orçamento ja foi aprovado para separacao.', 409)
    }

    if (quotedOrder.status === 'SEPARATED') {
      throw new AppError('A separacao deste pedido ja foi confirmada.', 409)
    }

    if (quotedOrder.status === 'COMPLETED') {
      throw new AppError('Este pedido ja foi concluido como venda.', 409)
    }

    const reservedItems = aggregateShippingItems(quotedOrder.items)

    for (const item of reservedItems) {
      const product = await lockReservableProduct(
        transaction,
        item.productId,
        branchId,
      )

      if (!product || !product.active) {
        throw new AppError(
          'Produto informado nao disponivel para separacao.',
          422,
        )
      }

      const availableStock =
        Number(product.currentStock) - Number(product.reservedStock)

      if (availableStock < item.quantity && !allowInsufficientStock) {
        throw new AppError(
          'Estoque insuficiente para separar este pedido.',
          422,
        )
      }
    }

    return approveShippingOrder(
      transaction,
      id,
      reservedItems,
      approvedByUserId,
    )
  })

  return {
    code: 200,
    status: 'success',
    data: order,
  }
}

export async function cancelOpenShippingOrder(
  id: string,
  reason: string,
  cancelledByUserId: string,
  branchId: string,
) {
  const order = await db.transaction(async (transaction) => {
    const currentOrder = await lockShippingOrder(transaction, id, branchId)

    if (!currentOrder) {
      throw new AppError('Pedido para envio nao encontrado.', 404)
    }

    if (currentOrder.status === 'CANCELLED') {
      throw new AppError('Este pedido para envio ja foi cancelado.', 409)
    }

    if (currentOrder.status === 'COMPLETED') {
      throw new AppError(
        'Venda concluida nao pode ser cancelada por este fluxo.',
        409,
      )
    }

    const reservedItems = aggregateShippingItems(currentOrder.items)

    if (
      currentOrder.status === 'APPROVED' ||
      currentOrder.status === 'SEPARATED'
    ) {
      for (const item of reservedItems) {
        await lockReservableProduct(transaction, item.productId, branchId)
      }
    }

    return cancelShippingOrder(
      transaction,
      id,
      reservedItems,
      currentOrder.status === 'APPROVED' || currentOrder.status === 'SEPARATED',
      cancelledByUserId,
      reason,
    )
  })

  return {
    code: 200,
    status: 'success',
    data: order,
  }
}

export async function confirmShippingOrderSeparation(
  id: string,
  separatedByUserId: string,
  branchId: string,
) {
  const order = await db.transaction(async (transaction) => {
    const currentOrder = await lockShippingOrder(transaction, id, branchId)

    if (!currentOrder) {
      throw new AppError('Pedido para envio nao encontrado.', 404)
    }

    if (currentOrder.status === 'QUOTED') {
      throw new AppError(
        'Aprove o orçamento antes de confirmar a separacao.',
        409,
      )
    }

    if (currentOrder.status === 'CANCELLED') {
      throw new AppError('Pedido cancelado nao pode ser separado.', 409)
    }

    if (currentOrder.status === 'SEPARATED') {
      throw new AppError('A separacao deste pedido ja foi confirmada.', 409)
    }

    if (currentOrder.status === 'COMPLETED') {
      throw new AppError('Este pedido ja foi concluido como venda.', 409)
    }

    return separateShippingOrder(transaction, id, separatedByUserId)
  })

  return {
    code: 200,
    status: 'success',
    data: order,
  }
}

export async function completeSeparatedShippingOrder(
  id: string,
  paymentMethodId: string | null | undefined,
  payments: SaleInput['payments'] | undefined,
  completedByUserId: string,
  branchId: string,
  allowInsufficientStock = false,
  billingDates: {
    billingIssueDate?: string | null
    billingDueDate?: string | null
  } = {},
) {
  const order = await db.transaction(async (transaction) => {
    const currentOrder = await lockShippingOrder(transaction, id, branchId)

    if (!currentOrder) {
      throw new AppError('Pedido para envio nao encontrado.', 404)
    }

    if (currentOrder.status === 'CANCELLED') {
      throw new AppError('Pedido cancelado nao pode ser concluido.', 409)
    }

    if (currentOrder.status === 'COMPLETED') {
      throw new AppError('Este pedido ja foi concluido como venda.', 409)
    }

    const cashRegister = await findOpenCashRegister(transaction, branchId)

    if (!cashRegister) {
      throw new AppError(
        'Abra o caixa antes de concluir a venda para envio.',
        422,
      )
    }

    const resolvedPaymentMethodId =
      paymentMethodId ?? currentOrder.paymentMethodId
    const resolvedPayments =
      payments ??
      currentOrder.payments.map((payment) => ({
        paymentMethodId: payment.paymentMethodId,
        amount: Number(payment.amount),
      }))
    const fallbackPayments =
      resolvedPayments.length > 0
        ? resolvedPayments
        : undefined
    const normalizedPayments =
      fallbackPayments ??
      (resolvedPaymentMethodId
        ? [
            {
              paymentMethodId: resolvedPaymentMethodId,
              amount: Number(currentOrder.totalAmount),
            },
          ]
        : undefined)

    if (!normalizedPayments) {
      throw new AppError('Forma de pagamento informada nao disponivel.', 422)
    }

    for (const payment of normalizedPayments) {
      if (
        !(await activePaymentMethodExists(transaction, payment.paymentMethodId))
      ) {
        throw new AppError('Forma de pagamento informada nao disponivel.', 422)
      }
    }

    validateSalePaymentsTotal(
      normalizedPayments,
      Number(currentOrder.totalAmount),
    )

    const reservedItems = aggregateShippingItems(currentOrder.items)
    const hasReservation = currentOrder.status !== 'QUOTED'

    for (const item of reservedItems) {
      const product = await lockReservableProduct(
        transaction,
        item.productId,
        branchId,
      )

      if (
        !product ||
        (hasReservation && Number(product.reservedStock) < item.quantity) ||
        (Number(product.currentStock) < item.quantity &&
          !allowInsufficientStock)
      ) {
        throw new AppError(
          hasReservation
            ? 'Reserva insuficiente para concluir esta venda.'
            : 'Estoque insuficiente para concluir esta venda.',
          422,
        )
      }
    }

    if (hasReservation) {
      for (const item of reservedItems) {
        await releaseShippingOrderReservation(
          transaction,
          item.productId,
          item.quantity,
        )
      }
    }

    const saleItems = currentOrder.items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      totalAmount: Number(item.totalAmount),
      position: item.position,
    }))
    const saleSubtotalAmount = Number(
      saleItems.reduce((sum, item) => sum + item.totalAmount, 0).toFixed(2),
    )
    const saleTotalAmount = Number(currentOrder.totalAmount)
    const saleDiscountAmount = Number(
      (saleSubtotalAmount - saleTotalAmount).toFixed(2),
    )

    const sale = await insertSale(
      transaction,
      {
        clientId: currentOrder.clientId,
        billingIssueDate:
          billingDates.billingIssueDate ?? currentOrder.billingIssueDate,
        billingDueDate:
          billingDates.billingDueDate ?? currentOrder.billingDueDate,
        discountAmount: saleDiscountAmount,
        paymentMethodId: resolvedPaymentMethodId ?? undefined,
        payments: normalizedPayments,
        paymentInstallments: currentOrder.paymentInstallments.map(
          (installment) => ({
            amount: Number(installment.amount),
            dueDate: installment.dueDate,
            position: installment.position,
          }),
        ),
        items: currentOrder.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
        })),
      },
      cashRegister.id,
      completedByUserId,
      branchId,
      saleItems,
      saleSubtotalAmount,
      saleTotalAmount,
    )

    return completeShippingOrder(transaction, id, sale.id, completedByUserId)
  })

  return {
    code: 200,
    status: 'success',
    data: order,
  }
}

function validateSalePaymentsTotal(
  payments: NonNullable<SaleInput['payments']>,
  totalAmount: number,
) {
  const paymentsAmount = Number(
    payments.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2),
  )

  if (paymentsAmount !== totalAmount) {
    throw new AppError(
      'Total dos pagamentos deve ser igual ao total da venda.',
      422,
    )
  }
}

function aggregateShippingItems(
  items: Array<{ productId: string; quantity: string }>,
) {
  return items.reduce<Array<{ productId: string; quantity: number }>>(
    (aggregatedItems, item) => {
      const existing = aggregatedItems.find(
        (currentItem) => currentItem.productId === item.productId,
      )

      if (existing) {
        existing.quantity += Number(item.quantity)
        return aggregatedItems
      }

      aggregatedItems.push({
        productId: item.productId,
        quantity: Number(item.quantity),
      })

      return aggregatedItems
    },
    [],
  )
}
