import type { PaymentMethod } from '../../api'

type PaymentDraft = {
  paymentMethodId: string
}

const billablePaymentMethodCodes = new Set(['BOLETO', 'CREDIT'])

export function salePaymentsAllowBilling(
  paymentMethods: PaymentMethod[],
  payments: PaymentDraft[],
) {
  return payments.some((payment) => {
    const paymentMethod = paymentMethods.find(
      (method) => method.id === payment.paymentMethodId,
    )

    return paymentMethodAllowsBilling(paymentMethod)
  })
}

export function paymentMethodAllowsBilling(
  paymentMethod: Pick<PaymentMethod, 'code'> | null | undefined,
) {
  return Boolean(
    paymentMethod && billablePaymentMethodCodes.has(paymentMethod.code),
  )
}
