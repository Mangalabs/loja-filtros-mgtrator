import type { Knex } from 'knex'
import { db } from '../../database/knex.js'

export type QuoteItemInput = {
  productId: string
  description?: string | null
  quantity: number
  unitPrice?: number | null
  discountPercentage?: number
}

export type QuoteInput = {
  clientId: string
  paymentMethodId: string
  billingIssueDate?: string | null
  billingDueDate?: string | null
  validUntil?: string | null
  notes?: string | null
  showBrand?: boolean
  discountPercentage?: number
  paymentInstallments?: QuotePaymentInstallmentInput[]
  items: QuoteItemInput[]
}

export type QuotePaymentInstallmentInput = {
  dueDate: string
  amount: number
  position: number
}

export type QuoteItem = {
  id: string
  productId: string
  productInternalCode: string | null
  productName: string
  productBrandName: string | null
  productNcm: string | null
  productAvailableStock: string
  description: string
  quantity: string
  unitPrice: string
  discountPercentage: string
  discountAmount: string
  totalAmount: string
  position: number
}

export type Quote = {
  id: string
  quoteNumber: number
  branchId: string | null
  branchName: string | null
  clientId: string
  clientName: string
  clientPhone: string | null
  clientDocument: string | null
  clientEmail: string | null
  paymentMethodId: string | null
  paymentMethodName: string | null
  status: 'DRAFT' | 'CANCELLED'
  showBrand: boolean
  subtotalAmount: string
  discountPercentage: string
  discountAmount: string
  totalAmount: string
  billingIssueDate: string | null
  billingDueDate: string | null
  validUntil: string | null
  notes: string | null
  cancelledByUserName: string | null
  cancelledAt: Date | null
  cancellationReason: string | null
  shippingOrderId: string | null
  shippingOrderStatus:
    | 'QUOTED'
    | 'APPROVED'
    | 'SEPARATED'
    | 'CANCELLED'
    | 'COMPLETED'
    | null
  createdByUserName: string
  createdByUserEmail: string
  createdByUserPhone: string | null
  createdAt: Date
  updatedAt: Date
  items: QuoteItem[]
  paymentInstallments: QuotePaymentInstallment[]
}

export type QuotePaymentInstallment = {
  id: string
  quoteId: string
  position: number
  dueDate: string
  amount: string
}

type QuoteProduct = {
  id: string
  name: string
  description: string | null
  salePrice: string
  active: boolean
}

type QuoteRow = Omit<Quote, 'items'>
type QuoteItemRow = QuoteItem & {
  quoteId: string
}
type QuotePaymentInstallmentRow = QuotePaymentInstallment
type LockedQuote = {
  id: string
  status: Quote['status']
}

const quoteColumns = [
  'quotes.id',
  'quotes.quote_number as quoteNumber',
  'quotes.branch_id as branchId',
  'branches.name as branchName',
  'quotes.client_id as clientId',
  'clients.name as clientName',
  'clients.phone as clientPhone',
  'clients.document as clientDocument',
  'clients.email as clientEmail',
  'payment_methods.id as paymentMethodId',
  'payment_methods.name as paymentMethodName',
  'quotes.status',
  'quotes.show_brand as showBrand',
  'quotes.subtotal_amount as subtotalAmount',
  'quotes.discount_percentage as discountPercentage',
  'quotes.discount_amount as discountAmount',
  'quotes.total_amount as totalAmount',
  'quotes.billing_issue_date as billingIssueDate',
  'quotes.billing_due_date as billingDueDate',
  'quotes.valid_until as validUntil',
  'quotes.notes',
  'cancelled_users.name as cancelledByUserName',
  'quotes.cancelled_at as cancelledAt',
  'quotes.cancellation_reason as cancellationReason',
  'shipping_orders.id as shippingOrderId',
  'shipping_orders.status as shippingOrderStatus',
  'created_users.name as createdByUserName',
  'created_users.email as createdByUserEmail',
  'created_users.phone as createdByUserPhone',
  'quotes.created_at as createdAt',
  'quotes.updated_at as updatedAt',
]

const quoteItemColumns = [
  'quote_items.id',
  'quote_items.quote_id as quoteId',
  'quote_items.product_id as productId',
  'products.internal_code as productInternalCode',
  'products.name as productName',
  'brands.name as productBrandName',
  'products.ncm as productNcm',
  db.raw(
    '(products.current_stock - products.reserved_stock) as "productAvailableStock"',
  ),
  'quote_items.description',
  'quote_items.quantity',
  'quote_items.unit_price as unitPrice',
  'quote_items.discount_percentage as discountPercentage',
  'quote_items.discount_amount as discountAmount',
  'quote_items.total_amount as totalAmount',
  'quote_items.position',
]

const quotePaymentInstallmentColumns = [
  'quote_payment_installments.id',
  'quote_payment_installments.quote_id as quoteId',
  'quote_payment_installments.position',
  'quote_payment_installments.due_date as dueDate',
  'quote_payment_installments.amount',
]

export async function listQuotes(filters: { branchId: string }): Promise<Quote[]> {
  const quoteRows = await quoteQuery(db)
    .where('quotes.branch_id', filters.branchId)
    .orderBy('quotes.created_at', 'desc')
  return withQuoteItems(db, quoteRows)
}

export async function getQuoteById(
  id: string,
  database: Knex | Knex.Transaction = db,
  filters?: { branchId?: string | null },
): Promise<Quote | undefined> {
  const quote = await quoteQuery(database)
    .where('quotes.id', id)
    .modify((query) => {
      if (filters?.branchId) {
        query.where('quotes.branch_id', filters.branchId)
      }
    })
    .first()

  if (!quote) {
    return undefined
  }

  const [withItems] = await withQuoteItems(database, [quote])
  return withItems
}

export async function activeQuoteClientExists(
  transaction: Knex.Transaction,
  clientId: string,
  branchId: string,
): Promise<boolean> {
  const client = await transaction('clients')
    .select('id')
    .where({ id: clientId, branch_id: branchId, active: true })
    .first()

  return Boolean(client)
}

export async function activeQuotePaymentMethodExists(
  transaction: Knex.Transaction,
  paymentMethodId: string,
): Promise<boolean> {
  const paymentMethod = await transaction('payment_methods')
    .select('id')
    .where({ id: paymentMethodId, active: true })
    .first()

  return Boolean(paymentMethod)
}

export async function listActiveQuoteProducts(
  transaction: Knex.Transaction,
  productIds: string[],
  branchId: string,
): Promise<QuoteProduct[]> {
  return transaction('products')
    .select(['id', 'name', 'description', 'sale_price as salePrice', 'active'])
    .whereIn('id', productIds)
    .andWhere('active', true)
    .andWhere('branch_id', branchId)
}

export async function insertQuote(
  transaction: Knex.Transaction,
  input: QuoteInput,
  createdByUserId: string,
  branchId: string,
  items: Array<{
    productId: string
    description: string
    quantity: number
    unitPrice: number
    discountPercentage: number
    discountAmount: number
    totalAmount: number
    position: number
  }>,
  subtotalAmount: number,
  discountPercentage: number,
  discountAmount: number,
  totalAmount: number,
  paymentInstallments: QuotePaymentInstallmentInput[],
): Promise<Quote> {
  const [created] = await transaction('quotes')
    .insert({
      quote_number: await nextQuoteNumber(transaction, branchId),
      client_id: input.clientId,
      payment_method_id: input.paymentMethodId,
      created_by_user_id: createdByUserId,
      branch_id: branchId,
      status: 'DRAFT',
      show_brand: input.showBrand ?? true,
      subtotal_amount: subtotalAmount,
      discount_percentage: discountPercentage,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      billing_issue_date: input.billingIssueDate,
      billing_due_date: input.billingDueDate,
      valid_until: input.validUntil,
      notes: input.notes,
    })
    .returning('id')

  await transaction('quote_items').insert(
    items.map((item) => ({
      quote_id: created.id,
      product_id: item.productId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      discount_percentage: item.discountPercentage,
      discount_amount: item.discountAmount,
      total_amount: item.totalAmount,
      position: item.position,
    })),
  )

  await insertQuotePaymentInstallments(
    transaction,
    created.id,
    paymentInstallments,
  )

  const quote = await quoteQuery(transaction)
    .where('quotes.id', created.id)
    .first()

  if (!quote) {
    throw new Error('Quote was not found after creation')
  }

  const [withItems] = await withQuoteItems(transaction, [quote])
  return withItems
}

async function nextQuoteNumber(
  transaction: Knex.Transaction,
  branchId: string,
): Promise<number> {
  await transaction.raw('select pg_advisory_xact_lock(hashtext(?))', [
    `quote-number:${branchId}`,
  ])

  const current = await transaction('quotes')
    .where('branch_id', branchId)
    .max<{ max: string | null }>('quote_number as max')
    .first()

  return Number(current?.max ?? 0) + 1
}

export async function updateQuote(
  transaction: Knex.Transaction,
  id: string,
  input: QuoteInput,
  items: Array<{
    productId: string
    description: string
    quantity: number
    unitPrice: number
    discountPercentage: number
    discountAmount: number
    totalAmount: number
    position: number
  }>,
  subtotalAmount: number,
  discountPercentage: number,
  discountAmount: number,
  totalAmount: number,
  paymentInstallments: QuotePaymentInstallmentInput[],
): Promise<Quote> {
  await transaction('quotes').where('id', id).update({
    client_id: input.clientId,
    payment_method_id: input.paymentMethodId,
    show_brand: input.showBrand ?? true,
    subtotal_amount: subtotalAmount,
    discount_percentage: discountPercentage,
    discount_amount: discountAmount,
    total_amount: totalAmount,
    billing_issue_date: input.billingIssueDate,
    billing_due_date: input.billingDueDate,
    valid_until: input.validUntil,
    notes: input.notes,
    updated_at: transaction.fn.now(),
  })

  await transaction('quote_items').where('quote_id', id).delete()
  await transaction('quote_payment_installments').where('quote_id', id).delete()
  await transaction('quote_items').insert(
    items.map((item) => ({
      quote_id: id,
      product_id: item.productId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      discount_percentage: item.discountPercentage,
      discount_amount: item.discountAmount,
      total_amount: item.totalAmount,
      position: item.position,
    })),
  )
  await insertQuotePaymentInstallments(
    transaction,
    id,
    paymentInstallments,
  )

  const quote = await getQuoteById(id, transaction)

  if (!quote) {
    throw new Error('Quote was not found after update')
  }

  return quote
}

export async function lockQuoteForCancellation(
  transaction: Knex.Transaction,
  id: string,
  branchId: string,
): Promise<LockedQuote | undefined> {
  return transaction('quotes')
    .select(['id', 'status'])
    .where({ id, branch_id: branchId })
    .forUpdate()
    .first()
}

export async function cancelQuote(
  transaction: Knex.Transaction,
  id: string,
  cancelledByUserId: string,
  reason: string,
): Promise<Quote> {
  await transaction('quotes').where('id', id).update({
    status: 'CANCELLED',
    cancelled_by_user_id: cancelledByUserId,
    cancelled_at: transaction.fn.now(),
    cancellation_reason: reason,
    updated_at: transaction.fn.now(),
  })

  const quote = await getQuoteById(id, transaction)

  if (!quote) {
    throw new Error('Quote was not found after cancellation')
  }

  return quote
}

function quoteQuery(database: Knex | Knex.Transaction) {
  return database('quotes')
    .leftJoin('branches', 'branches.id', 'quotes.branch_id')
    .join('clients', 'clients.id', 'quotes.client_id')
    .join(
      { created_users: 'users' },
      'created_users.id',
      'quotes.created_by_user_id',
    )
    .leftJoin(
      'payment_methods',
      'payment_methods.id',
      'quotes.payment_method_id',
    )
    .leftJoin(
      { cancelled_users: 'users' },
      'cancelled_users.id',
      'quotes.cancelled_by_user_id',
    )
    .leftJoin('shipping_orders', 'shipping_orders.quote_id', 'quotes.id')
    .select<QuoteRow[]>(quoteColumns)
}

async function withQuoteItems(
  database: Knex | Knex.Transaction,
  quotes: QuoteRow[],
): Promise<Quote[]> {
  if (quotes.length === 0) {
    return []
  }

  const quoteIds = quotes.map((quote) => quote.id)
  const items = await database('quote_items')
    .join('products', 'products.id', 'quote_items.product_id')
    .leftJoin('brands', 'brands.id', 'products.brand_id')
    .select<QuoteItemRow[]>(quoteItemColumns)
    .whereIn('quote_items.quote_id', quoteIds)
    .orderBy('quote_items.position', 'asc')
  const installments = await database('quote_payment_installments')
    .select<QuotePaymentInstallmentRow[]>(quotePaymentInstallmentColumns)
    .whereIn('quote_payment_installments.quote_id', quoteIds)
    .orderBy('quote_payment_installments.position', 'asc')

  return quotes.map((quote) => ({
    ...quote,
    items: items
      .filter((item) => item.quoteId === quote.id)
      .map(({ quoteId: _quoteId, ...item }) => item),
    paymentInstallments: installments.filter(
      (installment) => installment.quoteId === quote.id,
    ),
  }))
}

async function insertQuotePaymentInstallments(
  transaction: Knex.Transaction,
  quoteId: string,
  installments: QuotePaymentInstallmentInput[],
) {
  if (installments.length === 0) {
    return
  }

  await transaction('quote_payment_installments').insert(
    installments.map((installment) => ({
      quote_id: quoteId,
      position: installment.position,
      due_date: installment.dueDate,
      amount: installment.amount,
    })),
  )
}
