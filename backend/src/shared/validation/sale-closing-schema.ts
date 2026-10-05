import { z } from 'zod'

const salePaymentSchema = z
  .object({
    paymentMethodId: z.uuid(),
    amount: z.coerce.number().positive(),
  })
  .strict()

const salePaymentInstallmentSchema = z
  .object({
    position: z.coerce.number().int().positive(),
    dueDate: z.iso.date(),
    amount: z.coerce.number().positive(),
  })
  .strict()

export const saleClosingSchema = z
  .object({
    paymentMethodId: z
      .union([z.uuid(), z.literal(''), z.null()])
      .transform((value) => value || null)
      .optional(),
    payments: z.array(salePaymentSchema).min(1).optional(),
    paymentInstallments: z.array(salePaymentInstallmentSchema).optional(),
    billingIssueDate: z
      .union([z.iso.date(), z.literal(''), z.null()])
      .transform((value) => value || null)
      .optional(),
    billingDueDate: z
      .union([z.iso.date(), z.literal(''), z.null()])
      .transform((value) => value || null)
      .optional(),
    allowInsufficientStock: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    const hasValidBillingDates =
      !value.billingIssueDate ||
      !value.billingDueDate ||
      value.billingDueDate >= value.billingIssueDate

    if (hasValidBillingDates) {
      return
    }

    context.addIssue({
      code: 'custom',
      message: 'Vencimento nao pode ser anterior a data da fatura.',
      path: ['billingDueDate'],
    })
  })
