import type { Knex } from 'knex'
import {
  findActivePaymentMethod,
  findOpenCashRegister,
  insertSale,
  type SaleInput,
} from '../../models/sales/sales.model.js'
import {
  completeShippingOrder,
  lockReservableProduct,
  lockShippingOrder,
  releaseShippingOrderReservation,
  type ShippingOrder,
} from '../../models/shipping-orders/shipping-orders.model.js'
import { AppError } from '../../shared/errors/app-error.js'

export type ShippingOrderCompletionInput = {
  paymentMethodId?: string | null
  payments?: SaleInput['payments']
  paymentInstallments?: SaleInput['paymentInstallments']
  billingIssueDate?: string | null
  billingDueDate?: string | null
  allowInsufficientStock?: boolean
}

export async function completeShippingOrderInTransaction(
  transaction: Knex.Transaction,
  id: string,
  input: ShippingOrderCompletionInput,
  completedByUserId: string,
  branchId: string,
): Promise<ShippingOrder> {
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
    throw new AppError('Abra o caixa antes de concluir a venda para envio.', 422)
  }

  const resolvedPaymentMethodId =
    input.paymentMethodId ?? currentOrder.paymentMethodId
  const resolvedPayments =
    input.payments ??
    currentOrder.payments.map((payment) => ({
      paymentMethodId: payment.paymentMethodId,
      amount: Number(payment.amount),
    }))
  const fallbackPayments =
    resolvedPayments.length > 0 ? resolvedPayments : undefined
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

  const paymentMethods = await validateSaleClosingPaymentMethods(
    transaction,
    normalizedPayments,
  )
  validateSalePaymentsTotal(normalizedPayments, Number(currentOrder.totalAmount))
  const billingIssueDate =
    input.billingIssueDate ?? currentOrder.billingIssueDate
  const billingDueDate = input.billingDueDate ?? currentOrder.billingDueDate
  const paymentInstallments = normalizeSaleClosingInstallments(
    input.paymentInstallments ??
      currentOrder.paymentInstallments.map((installment) => ({
        amount: Number(installment.amount),
        dueDate: installment.dueDate,
        position: installment.position,
      })),
    normalizedPayments,
    paymentMethods,
    billingIssueDate,
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
        !input.allowInsufficientStock)
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
    description: item.description,
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
      billingIssueDate,
      billingDueDate,
      discountAmount: saleDiscountAmount,
      paymentMethodId: resolvedPaymentMethodId ?? undefined,
      payments: normalizedPayments,
      paymentInstallments,
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

async function validateSaleClosingPaymentMethods(
  transaction: Knex.Transaction,
  payments: NonNullable<SaleInput['payments']>,
) {
  const paymentMethods: Array<{ id: string; code: string; name: string }> = []

  for (const payment of payments) {
    const paymentMethod = await findActivePaymentMethod(
      transaction,
      payment.paymentMethodId,
    )

    if (!paymentMethod) {
      throw new AppError('Forma de pagamento informada nao disponivel.', 422)
    }

    if (paymentMethod.code === 'TO_AGREE') {
      throw new AppError(
        'Forma de pagamento A combinar nao pode concluir venda.',
        422,
      )
    }

    paymentMethods.push(paymentMethod)
  }

  return paymentMethods
}

function normalizeSaleClosingInstallments(
  installments: NonNullable<SaleInput['paymentInstallments']>,
  payments: NonNullable<SaleInput['payments']>,
  paymentMethods: Array<{ id: string; code: string }>,
  billingIssueDate?: string | null,
) {
  if (installments.length === 0) {
    return []
  }

  const paymentMethodById = new Map(
    paymentMethods.map((paymentMethod) => [paymentMethod.id, paymentMethod]),
  )
  const usesBankSlip = payments.some(
    (payment) =>
      paymentMethodById.get(payment.paymentMethodId)?.code === 'BOLETO',
  )
  const installmentPaymentCode = usesBankSlip ? 'BOLETO' : 'CREDIT'
  const installmentTargetAmount = Number(
    payments
      .filter(
        (payment) =>
          paymentMethodById.get(payment.paymentMethodId)?.code ===
          installmentPaymentCode,
      )
      .reduce((sum, payment) => sum + payment.amount, 0)
      .toFixed(2),
  )

  if (installmentTargetAmount <= 0) {
    throw new AppError(
      'Parcelamento exige pagamento por boleto ou cartao de credito.',
      422,
    )
  }

  const sortedInstallments = [...installments].sort(
    (current, next) => current.position - next.position,
  )

  if (
    !sortedInstallments.every(
      (installment, index) => installment.position === index + 1,
    )
  ) {
    throw new AppError('Parcelas da venda devem ser sequenciais.', 422)
  }

  if (
    billingIssueDate &&
    sortedInstallments.some(
      (installment) => installment.dueDate < billingIssueDate,
    )
  ) {
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

  if (installmentsTotal !== installmentTargetAmount) {
    throw new AppError(
      'Total das parcelas deve ser igual ao valor parcelado da venda.',
      422,
    )
  }

  return sortedInstallments.map((installment) => ({
    ...installment,
    amount: Number(installment.amount.toFixed(2)),
  }))
}

export function aggregateShippingItems(
  items: Array<{ productId: string; quantity: string }>,
) {
  return items
    .reduce<Array<{ productId: string; quantity: number }>>(
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
    .sort((left, right) => left.productId.localeCompare(right.productId))
}
