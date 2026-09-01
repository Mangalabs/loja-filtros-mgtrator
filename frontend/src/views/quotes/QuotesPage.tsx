import Autocomplete from '@mui/material/Autocomplete'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import { CreditCard, List as ListIcon, Plus } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import type {
  Client,
  CommercialSettings,
  PaymentMethod,
  Product,
  Quote,
} from '../../api'
import { downloadApiFile } from '../../api'
import { ProductSearchField } from '../../components/ProductSearchField'
import {
  ActionGroup,
  ActionStack,
  FormCard,
  FormGrid,
  FormRow,
  InlineNote,
  PageHeader,
  PagePanel,
  ResponsiveTable,
} from '../../components/layout'
import {
  PrimaryButton,
  SecondaryButton,
  StatusChip,
  TableActionButton,
  TableActionsMenu,
  type TableActionsMenuAction,
} from '../../components/ui'
import { usePaginatedRows } from '../../hooks/usePaginatedRows'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format'

type QuoteDraftItem = {
  productId: string
  description: string
  quantity: string
  unitPrice: string
  discountPercentage: string
}

type QuotePaymentInstallmentDraft = {
  amount: string
  dueDate: string
  position: number
}

type QuotePaymentDraft = {
  paymentMethodId: string
  amount: string
}

export type QuoteDraftInput = {
  clientId: string
  paymentMethodId: string
  payments: Array<{
    paymentMethodId: string
    amount: number
    position: number
  }>
  billingIssueDate?: string | null
  billingDueDate?: string | null
  validUntil?: string | null
  notes?: string | null
  showBrand?: boolean
  discountPercentage?: number
  paymentInstallments?: Array<{
    amount: number
    dueDate: string
    position: number
  }>
  items: Array<{
    productId: string
    description?: string | null
    quantity: number
    unitPrice?: number | null
    discountPercentage?: number
  }>
}

export function QuotesPage({
  clients,
  commercialSettings,
  paymentMethods,
  products,
  quotes,
  onSubmit,
  onUpdate,
  onCancelQuote,
  onCreateShippingOrder,
}: {
  clients: Client[]
  commercialSettings: CommercialSettings | null
  paymentMethods: PaymentMethod[]
  products: Product[]
  quotes: Quote[]
  onSubmit: (input: QuoteDraftInput) => Promise<boolean>
  onUpdate: (id: string, input: QuoteDraftInput) => Promise<boolean>
  onCancelQuote: (event: FormEvent<HTMLFormElement>, quote: Quote) => void
  onCreateShippingOrder: (quote: Quote) => void
}) {
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null)
  const [clientId, setClientId] = useState('')
  const [payments, setPayments] = useState<QuotePaymentDraft[]>([
    emptyQuotePayment(),
  ])
  const [billingIssueDate, setBillingIssueDate] = useState(todayInputDate)
  const [billingDueDate, setBillingDueDate] = useState(() =>
    quoteDueDate(todayInputDate(), commercialSettings),
  )
  const [billingDueDateTouched, setBillingDueDateTouched] = useState(false)
  const [validUntil, setValidUntil] = useState(() =>
    quoteValidityDate(todayInputDate(), commercialSettings),
  )
  const [notes, setNotes] = useState('')
  const [showBrand, setShowBrand] = useState(true)
  const [discountPercentage, setDiscountPercentage] = useState('')
  const [installmentCount, setInstallmentCount] = useState(1)
  const [items, setItems] = useState<QuoteDraftItem[]>([emptyQuoteItem()])
  const { pagination, visibleItems } = usePaginatedRows<Quote>(quotes)
  const activeProducts = products.filter((product) => product.active)
  const activeClients = clients.filter((client) => client.active)
  const selectedClient =
    activeClients.find((client) => client.id === clientId) ?? null
  const activePaymentMethods = paymentMethods.filter(
    (paymentMethod) => paymentMethod.active,
  )
  const selectedPaymentMethods = payments
    .map((payment) =>
      paymentMethods.find(
        (paymentMethod) => paymentMethod.id === payment.paymentMethodId,
      ),
    )
    .filter((paymentMethod): paymentMethod is PaymentMethod =>
      Boolean(paymentMethod),
    )
  const primaryPaymentMethodId = payments[0]?.paymentMethodId ?? ''
  const usesBankSlip = selectedPaymentMethods.some(
    (paymentMethod) => paymentMethod.code === 'BOLETO',
  )
  const isEditing = Boolean(editingQuoteId)
  const quoteSubtotal = items.reduce((sum, item) => {
    return sum + Number(item.quantity || 0) * Number(item.unitPrice || 0)
  }, 0)
  const itemDiscountTotal = items.reduce(
    (sum, item) => sum + quoteItemDiscountAmount(item),
    0,
  )
  const totalBeforeGeneralDiscount = quoteSubtotal - itemDiscountTotal
  const generalDiscount = percentageAmount(
    totalBeforeGeneralDiscount,
    Number(discountPercentage || 0),
  )
  const quoteTotal = Math.max(totalBeforeGeneralDiscount - generalDiscount, 0)
  const bankSlipAmount = usesBankSlip
    ? quotePaymentMethodAmount(payments, quoteTotal, paymentMethods, 'BOLETO')
    : 0
  const paymentInstallments = usesBankSlip
    ? quotePaymentInstallments(
        installmentCount,
        billingDueDate || billingIssueDate,
        bankSlipAmount,
      )
    : []
  const paymentTotal = quotePaymentDraftTotal(payments, quoteTotal)
  const paymentDifference = Number((quoteTotal - paymentTotal).toFixed(2))
  const hasPaymentDifference = Math.abs(paymentDifference) >= 0.01
  const quoteFormIssues = quoteBlockingIssues({
    clientId,
    hasPaymentDifference,
    items,
    paymentDifference,
    primaryPaymentMethodId,
    quoteTotal,
  })
  const hasQuoteBlockingIssues = quoteFormIssues.length > 0

  useEffect(() => {
    if (isEditing) {
      return
    }

    setValidUntil(quoteValidityDate(billingIssueDate, commercialSettings))
  }, [
    billingIssueDate,
    commercialSettings?.defaultQuoteValidityDays,
    isEditing,
  ])

  useEffect(() => {
    if (isEditing || billingDueDateTouched) {
      return
    }

    setBillingDueDate(quoteDueDate(billingIssueDate, commercialSettings))
  }, [
    billingDueDateTouched,
    billingIssueDate,
    commercialSettings?.defaultQuoteDueDays,
    isEditing,
  ])

  function updateItem(index: number, changes: Partial<QuoteDraftItem>) {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item
        }

        if (changes.productId) {
          const product = activeProducts.find(
            (currentProduct) => currentProduct.id === changes.productId,
          )

          return {
            ...item,
            ...changes,
            description:
              product?.description ??
              product?.name ??
              changes.description ??
              item.description,
            unitPrice: product?.salePrice ?? changes.unitPrice ?? item.unitPrice,
          }
        }

        return { ...item, ...changes }
      }),
    )
  }

  function removeItem(index: number) {
    setItems((currentItems) =>
      currentItems.filter((_item, itemIndex) => itemIndex !== index),
    )
  }

  function resetQuoteForm() {
    setEditingQuoteId(null)
    setClientId('')
    setPayments([emptyQuotePayment()])
    const issueDate = todayInputDate()

    setBillingIssueDate(issueDate)
    setBillingDueDate(quoteDueDate(issueDate, commercialSettings))
    setBillingDueDateTouched(false)
    setValidUntil(quoteValidityDate(issueDate, commercialSettings))
    setNotes('')
    setShowBrand(true)
    setDiscountPercentage('')
    setInstallmentCount(1)
    setItems([emptyQuoteItem()])
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const input = {
      clientId,
      paymentMethodId: primaryPaymentMethodId,
      payments: quotePaymentPayloads(payments, quoteTotal),
      billingIssueDate: billingIssueDate || null,
      billingDueDate: billingDueDate || null,
      validUntil: validUntil || null,
      notes: notes.trim() || null,
      showBrand,
      discountPercentage: Number(discountPercentage || 0),
      paymentInstallments: paymentInstallments.map((installment) => ({
        amount: Number(installment.amount),
        dueDate: installment.dueDate,
        position: installment.position,
      })),
      items: items.map((item) => ({
        productId: item.productId,
        description: item.description.trim() || null,
        quantity: Number(item.quantity),
        unitPrice: item.unitPrice === '' ? null : Number(item.unitPrice),
        discountPercentage: Number(item.discountPercentage || 0),
      })),
    }
    const saved = editingQuoteId
      ? await onUpdate(editingQuoteId, input)
      : await onSubmit(input)

    if (saved) {
      resetQuoteForm()
    }
  }

  function editQuote(quote: Quote) {
    setEditingQuoteId(quote.id)
    setClientId(quote.clientId)
    setPayments(quotePaymentDrafts(quote))
    setBillingIssueDate(quote.billingIssueDate?.slice(0, 10) ?? '')
    setBillingDueDate(quote.billingDueDate?.slice(0, 10) ?? '')
    setBillingDueDateTouched(true)
    setValidUntil(quote.validUntil?.slice(0, 10) ?? '')
    setNotes(quote.notes ?? '')
    setShowBrand(quote.showBrand)
    setDiscountPercentage(quote.discountPercentage)
    setInstallmentCount(Math.max(quote.paymentInstallments.length, 1))
    setItems(
      quote.items.map((item) => ({
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercentage: item.discountPercentage,
      })),
    )
  }

  return (
    <section className='grid gap-4'>
      <FormGrid className='gap-5 sm:gap-6' onSubmit={submit}>
        <PageHeader
          description={
            isEditing
              ? 'Ajuste os dados antes de reenviar ou baixar o PDF atualizado.'
              : 'Monte itens, valores e dados comerciais antes do PDF.'
          }
          icon={<ListIcon size={18} />}
          title={isEditing ? 'Editar orçamento' : 'Novo orçamento'}
        />
        <Autocomplete
          getOptionLabel={(client) =>
            `${client.name}${client.phone ? ` - ${client.phone}` : ''}`
          }
          isOptionEqualToValue={(option, value) => option.id === value.id}
          noOptionsText='Nenhum cliente encontrado'
          options={activeClients}
          value={selectedClient}
          onChange={(_event, client) => setClientId(client?.id ?? '')}
          renderInput={(params) => (
            <TextField {...params} label='Cliente' required size='medium' />
          )}
        />
        <QuotePaymentFields
          paymentMethods={activePaymentMethods}
          payments={payments}
          totalAmount={quoteTotal}
          onChange={setPayments}
        />
        <QuotePaymentHighlight
          paymentMethodName={quotePaymentSummary(selectedPaymentMethods)}
        />
        {usesBankSlip ? (
          <FormCard>
            <PageHeader
              description='As parcelas são divididas igualmente a partir do primeiro vencimento do boleto.'
              title='Parcelamento do boleto'
            />
            <TextField
              label='Número de parcelas'
              value={installmentCount}
              type='number'
              size='medium'
              onChange={(event) =>
                setInstallmentCount(
                  normalizeInstallmentCount(Number(event.target.value || 1)),
                )
              }
              slotProps={{ htmlInput: { min: '1', max: '24', step: '1' } }}
              required
            />
            <div className='grid gap-2'>
              {paymentInstallments.map((installment) => (
                <InlineNote key={installment.position}>
                  Parcela {installment.position}:{' '}
                  {formatDate(installment.dueDate)} -{' '}
                  {formatCurrency(installment.amount)}
                </InlineNote>
              ))}
            </div>
          </FormCard>
        ) : null}
        <FormRow>
          <TextField
            label='Data de emissão do orçamento'
            size='medium'
            type='date'
            value={billingIssueDate}
            onChange={(event) => setBillingIssueDate(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label='Primeiro vencimento do boleto/fatura'
            size='medium'
            type='date'
            value={billingDueDate}
            onChange={(event) => {
              setBillingDueDate(event.target.value)
              setBillingDueDateTouched(true)
            }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </FormRow>
        <FormRow>
          <TextField
            disabled
            helperText={`Calculada pela configuração comercial: ${quoteValidityDays(commercialSettings)} dia(s).`}
            label='Validade do orçamento'
            size='medium'
            value={quoteValidityLabel(validUntil, commercialSettings)}
          />
          <TextField
            disabled
            label='Subtotal'
            size='medium'
            value={formatCurrency(quoteSubtotal)}
          />
        </FormRow>
        <FormRow>
          <TextField
            label='Desconto geral (%)'
            value={discountPercentage}
            type='number'
            size='medium'
            onChange={(event) => setDiscountPercentage(event.target.value)}
            slotProps={{ htmlInput: { min: '0', max: '100', step: '0.01' } }}
          />
          <TextField
            disabled
            label='Total final'
            size='medium'
            value={formatCurrency(quoteTotal)}
          />
        </FormRow>
        <InlineNote>
          Desconto nos itens: {formatCurrency(itemDiscountTotal)} | Desconto
          geral: {formatCurrency(generalDiscount)}
        </InlineNote>
        <TextField
          label='Observações do orçamento'
          multiline
          value={notes}
          rows={3}
          size='medium'
          onChange={(event) => setNotes(event.target.value)}
          slotProps={{ htmlInput: { maxLength: 1000 } }}
        />
        <FormControlLabel
          className='m-0'
          control={
            <Checkbox
              checked={showBrand}
              color='primary'
              onChange={(event) => setShowBrand(event.target.checked)}
            />
          }
          label='Exibir fabricante na coluna Marca do PDF'
        />

        <div className='grid gap-4'>
          {items.map((item, index) => (
            <FormCard key={index}>
              <div className='flex items-center justify-between gap-3'>
                <strong>Item {index + 1}</strong>
                {items.length > 1 ? (
                  <TableActionButton
                    type='button'
                    onClick={() => removeItem(index)}>
                    Remover
                  </TableActionButton>
                ) : null}
              </div>
              <ProductSearchField
                label='Produto'
                name={`quoteItems.${index}.productId`}
                products={activeProducts}
                required
                stockLabel='available'
                value={item.productId}
                onSelect={(product) =>
                  updateItem(index, {
                    productId: product?.id ?? '',
                    description: product?.description ?? product?.name ?? '',
                    unitPrice: product?.salePrice ?? '',
                  })
                }
              />
              <TextField
                label='Descrição comercial'
                value={item.description}
                size='medium'
                onChange={(event) =>
                  updateItem(index, { description: event.target.value })
                }
                slotProps={{ htmlInput: { maxLength: 500 } }}
              />
              <FormRow>
                <TextField
                  label='Quantidade'
                  value={item.quantity}
                  type='number'
                  size='medium'
                  onChange={(event) =>
                    updateItem(index, { quantity: event.target.value })
                  }
                  slotProps={{ htmlInput: { min: '1', step: '1' } }}
                  required
                />
                <TextField
                  label='Valor unitario'
                  value={item.unitPrice}
                  type='number'
                  size='medium'
                  onChange={(event) =>
                    updateItem(index, { unitPrice: event.target.value })
                  }
                  slotProps={{ htmlInput: { min: '0', step: '0.01' } }}
                  required
                />
              </FormRow>
              <TextField
                label='Desconto do item (%)'
                value={item.discountPercentage}
                type='number'
                size='medium'
                onChange={(event) =>
                  updateItem(index, { discountPercentage: event.target.value })
                }
                helperText={`Valor: ${formatCurrency(quoteItemDiscountAmount(item))}`}
                slotProps={{
                  htmlInput: { min: '0', max: '100', step: '0.01' },
                }}
              />
            </FormCard>
          ))}
        </div>

        <ActionGroup className='pt-1'>
          {hasQuoteBlockingIssues ? (
            <InlineNote>{quoteFormIssues[0]}</InlineNote>
          ) : null}
          {isEditing ? (
            <SecondaryButton type='button' onClick={resetQuoteForm}>
              Cancelar edição
            </SecondaryButton>
          ) : null}
          <SecondaryButton
            type='button'
            onClick={() =>
              setItems((currentItems) => [...currentItems, emptyQuoteItem()])
            }>
            Adicionar item
          </SecondaryButton>
          <PrimaryButton
            disabled={hasQuoteBlockingIssues}
            icon={<Plus size={17} />}
            type='submit'>
            {isEditing ? 'Atualizar orçamento' : 'Salvar orçamento'}
          </PrimaryButton>
        </ActionGroup>
      </FormGrid>

      <PagePanel wide>
        <PageHeader
          actions={<StatusChip label='PDF disponível' tone='success' />}
          description={`${quotes.length} registros`}
          title='Orçamentos salvos'
        />
        <ResponsiveTable
          columns={[
            {
              header: 'Nº do orçamento',
              render: (quote) => quote.quoteNumber,
            },
            {
              header: 'Data',
              render: (quote) => formatDateTime(quote.createdAt),
            },
            {
              header: 'Cliente',
              render: (quote) => quote.clientName,
            },
            {
              header: 'Vendedor',
              render: (quote) => quote.createdByUserName,
            },
            {
              header: 'Pagamento',
              render: (quote) => (
                <>
                  <QuotePaymentHighlight
                    compact
                    paymentMethodName={quotePaymentListSummary(quote)}
                  />
                  {quote.paymentInstallments.length > 0 ? (
                    <InlineNote>
                      {quote.paymentInstallments.length} parcela(s)
                    </InlineNote>
                  ) : null}
                </>
              ),
            },
            {
              header: 'Itens',
              render: (quote) => (
                <>
                  {quote.items.length} item(ns)
                  <InlineNote>
                    {quote.items.map((item) => item.description).join(', ')}
                  </InlineNote>
                </>
              ),
            },
            {
              header: 'Fatura',
              render: (quote) => (
                <>
                  {quote.billingIssueDate
                    ? formatDate(quote.billingIssueDate)
                    : '-'}
                  <InlineNote>
                    Primeiro vencimento:{' '}
                    {quote.billingDueDate
                      ? formatDate(quote.billingDueDate)
                      : '-'}
                  </InlineNote>
                </>
              ),
            },
            {
              header: 'Validade do orçamento',
              render: (quote) =>
                quote.validUntil ? formatDate(quote.validUntil) : '-',
            },
            {
              header: 'Total',
              render: (quote) => (
                <>
                  {formatCurrency(quote.totalAmount)}
                  {Number(quote.discountAmount) > 0 ||
                  quote.items.some(
                    (item) => Number(item.discountAmount) > 0,
                  ) ? (
                    <InlineNote>
                      Subtotal {formatCurrency(quote.subtotalAmount)} | Desc.{' '}
                      {formatCurrency(totalQuoteDiscount(quote))}
                      {Number(quote.discountPercentage) > 0
                        ? ` (${quote.discountPercentage}% geral)`
                        : ''}
                    </InlineNote>
                  ) : null}
                </>
              ),
            },
            {
              header: 'Status',
              render: (quote) => <QuoteStatusSummary quote={quote} />,
            },
            {
              align: 'right',
              header: 'Ações',
              render: (quote) => (
                <QuoteActions
                  quote={quote}
                  onEditQuote={editQuote}
                  onCancelQuote={onCancelQuote}
                  onCreateShippingOrder={onCreateShippingOrder}
                />
              ),
            },
          ]}
          emptyMessage='Nenhum orçamento salvo.'
          getRowId={(quote) => quote.id}
          items={visibleItems}
          pagination={pagination}
        />
      </PagePanel>
    </section>
  )
}

function QuotePaymentHighlight({
  compact,
  paymentMethodName,
}: {
  compact?: boolean
  paymentMethodName: string | null
}) {
  const label = paymentMethodName ?? 'Não informada'

  return (
    <div
      className={
        compact
          ? 'inline-flex min-w-36 items-center gap-2 rounded-xl border border-[#d8b769]/70 bg-[#fff8e6] px-3 py-2 text-[#203466]'
          : 'flex items-center gap-3 rounded-xl border border-[#d8b769]/70 bg-[#fff8e6] p-3 text-[#203466]'
      }>
      <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#203466] text-white'>
        <CreditCard size={16} />
      </span>
      <span className='min-w-0'>
        <span className='block text-xs font-bold uppercase text-[#7c6a36]'>
          Pagamento
        </span>
        <strong className='block truncate text-sm'>{label}</strong>
      </span>
    </div>
  )
}

function quoteShippingStatusLabel(status: Quote['shippingOrderStatus']) {
  return quoteShippingStatusLabels[status ?? 'QUOTED']
}

function QuoteStatusSummary({ quote }: { quote: Quote }) {
  return (
    <ActionStack>
      <StatusChip
        label={quoteStatusPresentation(quote).label}
        tone={quoteStatusPresentation(quote).tone}
      />
      <StatusChip
        label={quoteBrandPresentation(quote.showBrand).label}
        tone={quoteBrandPresentation(quote.showBrand).tone}
      />
      {quote.cancelledByUserName ? (
        <InlineNote>Cancelado por {quote.cancelledByUserName}</InlineNote>
      ) : null}
      {quote.cancellationReason ? (
        <InlineNote>{quote.cancellationReason}</InlineNote>
      ) : null}
    </ActionStack>
  )
}

function QuoteActions({
  quote,
  onEditQuote,
  onCancelQuote,
  onCreateShippingOrder,
}: {
  quote: Quote
  onEditQuote: (quote: Quote) => void
  onCancelQuote: (event: FormEvent<HTMLFormElement>, quote: Quote) => void
  onCreateShippingOrder: (quote: Quote) => void
}) {
  const [showCancellationForm, setShowCancellationForm] = useState(false)
  const actions = quoteActions({
    onCancelQuote: () => setShowCancellationForm(true),
    onCreateShippingOrder: () => onCreateShippingOrder(quote),
    onEditQuote: () => onEditQuote(quote),
    quote,
  })

  if (quote.shippingOrderId) {
    return (
      <ActionStack className='ml-auto w-fit justify-items-end'>
        <div className='inline-flex justify-end'>
          <TableActionsMenu actions={actions} />
        </div>
        <InlineNote>Pedido criado</InlineNote>
      </ActionStack>
    )
  }

  if (quote.status !== 'DRAFT') {
    return (
      <ActionStack className='ml-auto w-fit justify-items-end'>
        <div className='inline-flex justify-end'>
          <TableActionsMenu actions={actions} />
        </div>
        <InlineNote>Orçamento cancelado</InlineNote>
      </ActionStack>
    )
  }

  return (
    <ActionStack className='ml-auto w-fit justify-items-end'>
      <div className='inline-flex justify-end'>
        <TableActionsMenu actions={actions} />
      </div>
      {showCancellationForm ? (
        <form
          className='grid w-full max-w-72 gap-2'
          onSubmit={(event) => onCancelQuote(event, quote)}>
          <TextField
            label='Motivo do cancelamento'
            name='quoteCancellationReason'
            size='small'
            slotProps={{ htmlInput: { maxLength: 500 } }}
            required
          />
          <div className='flex flex-wrap gap-2'>
            <TableActionButton type='submit'>Cancelar</TableActionButton>
            <TableActionButton
              type='button'
              onClick={() => setShowCancellationForm(false)}>
              Fechar
            </TableActionButton>
          </div>
        </form>
      ) : null}
    </ActionStack>
  )
}

function quoteActions({
  onCancelQuote,
  onCreateShippingOrder,
  onEditQuote,
  quote,
}: {
  onCancelQuote: () => void
  onCreateShippingOrder: () => void
  onEditQuote: () => void
  quote: Quote
}) {
  const actions: TableActionsMenuAction[] = [
    {
      label: 'Baixar PDF',
      onSelect: () => void downloadQuotePdf(quote),
    },
  ]

  quote.status === 'DRAFT' &&
    !quote.shippingOrderId &&
    actions.push(
      {
        label: 'Editar',
        onSelect: onEditQuote,
      },
      {
        label: 'Criar venda',
        onSelect: onCreateShippingOrder,
      },
      {
        label: 'Cancelar orçamento',
        onSelect: onCancelQuote,
      },
    )

  return actions
}

function downloadQuotePdf(quote: Quote) {
  return downloadApiFile(`/quotes/${quote.id}/pdf`, `orçamento-${quote.id}.pdf`)
}

const quoteShippingStatusLabels: Record<
  NonNullable<Quote['shippingOrderStatus']>,
  string
> = {
  APPROVED: 'Pedido aprovado',
  CANCELLED: 'Pedido cancelado',
  COMPLETED: 'Venda concluída',
  QUOTED: 'Pedido criado',
  SEPARATED: 'Separado para envio',
}

type QuoteStatusPresentation = {
  label: string
  tone: 'neutral' | 'success' | 'warning'
}

type QuoteBrandPresentation = {
  label: string
  tone: 'neutral' | 'success'
}

function quoteBrandPresentation(showBrand: boolean): QuoteBrandPresentation {
  return quoteBrandPresentations[String(showBrand)]
}

function quoteStatusPresentation(quote: Quote): QuoteStatusPresentation {
  return (
    quoteStatusPresentationStrategies
      .find((strategy) => strategy.matches(quote))
      ?.present(quote) ?? quoteStatusPresentations.DRAFT
  )
}

const quoteStatusPresentations: Record<
  'CANCELLED' | 'DRAFT',
  QuoteStatusPresentation
> = {
  CANCELLED: {
    label: 'Cancelado',
    tone: 'neutral',
  },
  DRAFT: {
    label: 'Rascunho',
    tone: 'warning',
  },
}

const quoteStatusPresentationStrategies: Array<{
  matches: (quote: Quote) => boolean
  present: (quote: Quote) => QuoteStatusPresentation
}> = [
  {
    matches: (quote) => Boolean(quote.shippingOrderId),
    present: (quote) => ({
      label: quoteShippingStatusLabel(quote.shippingOrderStatus),
      tone: 'success',
    }),
  },
  {
    matches: (quote) => quote.status === 'CANCELLED',
    present: () => quoteStatusPresentations.CANCELLED,
  },
  {
    matches: () => true,
    present: () => quoteStatusPresentations.DRAFT,
  },
]

const quoteBrandPresentations: Record<string, QuoteBrandPresentation> = {
  false: {
    label: 'PDF sem Marca',
    tone: 'neutral',
  },
  true: {
    label: 'PDF com Marca',
    tone: 'success',
  },
}

function emptyQuoteItem(): QuoteDraftItem {
  return {
    productId: '',
    description: '',
    quantity: '1',
    unitPrice: '',
    discountPercentage: '',
  }
}

function todayInputDate() {
  return new Date().toLocaleDateString('en-CA')
}

function QuotePaymentFields({
  paymentMethods,
  payments,
  totalAmount,
  onChange,
}: {
  paymentMethods: PaymentMethod[]
  payments: QuotePaymentDraft[]
  totalAmount: number
  onChange: (payments: QuotePaymentDraft[]) => void
}) {
  const paymentTotal = quotePaymentDraftTotal(payments, totalAmount)
  const difference = Number((totalAmount - paymentTotal).toFixed(2))

  function updatePayment(index: number, changes: Partial<QuotePaymentDraft>) {
    onChange(
      payments.map((payment, paymentIndex) =>
        paymentIndex === index ? { ...payment, ...changes } : payment,
      ),
    )
  }

  function removePayment(index: number) {
    onChange(
      payments.filter((_payment, paymentIndex) => paymentIndex !== index),
    )
  }

  return (
    <FormCard>
      <div>
        <strong>Formas de pagamento</strong>
        <InlineNote>
          Divida o total quando o cliente pagar em mais de uma forma.
        </InlineNote>
      </div>
      {payments.map((payment, index) => (
        <FormRow key={index} className='items-start'>
          <TextField
            label={`Pagamento ${index + 1}`}
            onChange={(event) =>
              updatePayment(index, { paymentMethodId: event.target.value })
            }
            required
            select
            size='medium'
            value={payment.paymentMethodId}>
            <MenuItem value='' disabled>
              Pagamento
            </MenuItem>
            {paymentMethods.map((method) => (
              <MenuItem key={method.id} value={method.id}>
                {method.name}
              </MenuItem>
            ))}
          </TextField>
          <div className='grid gap-2'>
            <TextField
              helperText={
                payments.length === 1 && index === 0
                  ? 'Vazio usa o total final.'
                  : undefined
              }
              label='Valor'
              onChange={(event) =>
                updatePayment(index, { amount: event.target.value })
              }
              required={payments.length > 1}
              size='medium'
              slotProps={{ htmlInput: { min: '0', step: '0.01' } }}
              type='number'
              value={payment.amount}
            />
            {payments.length > 1 ? (
              <TableActionButton type='button' onClick={() => removePayment(index)}>
                Remover pagamento
              </TableActionButton>
            ) : null}
          </div>
        </FormRow>
      ))}
      <ActionGroup align='start'>
        <TableActionButton
          type='button'
          onClick={() => onChange([...payments, emptyQuotePayment()])}>
          Adicionar forma
        </TableActionButton>
      </ActionGroup>
      <InlineNote>
        Total dos pagamentos: {formatCurrency(paymentTotal)}. Diferença:{' '}
        {formatCurrency(Math.abs(difference))}.
      </InlineNote>
    </FormCard>
  )
}

function quoteDueDate(issueDate: string, settings: CommercialSettings | null) {
  const date = new Date(`${issueDate}T00:00:00`)
  date.setDate(date.getDate() + Number(settings?.defaultQuoteDueDays ?? 0))

  return date.toLocaleDateString('en-CA')
}

function quoteValidityDate(
  issueDate: string,
  settings: CommercialSettings | null,
) {
  const date = new Date(`${issueDate}T00:00:00`)
  date.setDate(date.getDate() + quoteValidityDays(settings))

  return date.toLocaleDateString('en-CA')
}

function quoteValidityDays(settings: CommercialSettings | null) {
  return Number(settings?.defaultQuoteValidityDays ?? 7)
}

function quoteValidityLabel(
  validUntil: string,
  settings: CommercialSettings | null,
) {
  const days = quoteValidityDays(settings)
  const dateLabel = validUntil ? `, até ${formatDate(validUntil)}` : ''

  return `${days} dia(s)${dateLabel}`
}

function quotePaymentInstallments(
  count: number,
  firstDueDate: string,
  totalAmount: number,
): QuotePaymentInstallmentDraft[] {
  const installmentCount = normalizeInstallmentCount(count)
  const baseAmount = Math.floor((totalAmount / installmentCount) * 100) / 100
  const baseTotal = Number((baseAmount * installmentCount).toFixed(2))
  const lastAmount = Number((baseAmount + totalAmount - baseTotal).toFixed(2))

  return Array.from({ length: installmentCount }, (_item, index) => ({
    amount: String(index === installmentCount - 1 ? lastAmount : baseAmount),
    dueDate: installmentDueDate(firstDueDate, index),
    position: index + 1,
  }))
}

function quotePaymentPayloads(
  payments: QuotePaymentDraft[],
  totalAmount: number,
) {
  const filledPayments = payments.filter((payment) => payment.paymentMethodId)
  const usesSinglePaymentTotal =
    filledPayments.length === 1 && !filledPayments[0].amount

  return filledPayments.map((payment, index) => ({
    paymentMethodId: payment.paymentMethodId,
    amount: usesSinglePaymentTotal
      ? Number(totalAmount.toFixed(2))
      : moneyInputValue(payment.amount),
    position: index + 1,
  }))
}

function quotePaymentDraftTotal(
  payments: QuotePaymentDraft[],
  totalAmount: number,
) {
  const payloads = quotePaymentPayloads(payments, totalAmount)

  return Number(
    payloads.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2),
  )
}

function quotePaymentMethodAmount(
  payments: QuotePaymentDraft[],
  totalAmount: number,
  paymentMethods: PaymentMethod[],
  code: string,
) {
  const paymentMethodIds = new Set(
    paymentMethods
      .filter((paymentMethod) => paymentMethod.code === code)
      .map((paymentMethod) => paymentMethod.id),
  )
  const payloads = quotePaymentPayloads(payments, totalAmount)

  return Number(
    payloads
      .filter((payment) => paymentMethodIds.has(payment.paymentMethodId))
      .reduce((sum, payment) => sum + payment.amount, 0)
      .toFixed(2),
  )
}

function quoteBlockingIssues({
  clientId,
  hasPaymentDifference,
  items,
  paymentDifference,
  primaryPaymentMethodId,
  quoteTotal,
}: {
  clientId: string
  hasPaymentDifference: boolean
  items: QuoteDraftItem[]
  paymentDifference: number
  primaryPaymentMethodId: string
  quoteTotal: number
}) {
  const selectedItems = items.filter((item) => item.productId)
  const zeroPriceItem = selectedItems.find(
    (item) => Number(item.unitPrice || 0) <= 0,
  )

  return [
    clientId ? null : 'Selecione o cliente do orçamento.',
    primaryPaymentMethodId ? null : 'Informe ao menos uma forma de pagamento.',
    selectedItems.length === items.length
      ? null
      : 'Selecione o produto de todos os itens.',
    zeroPriceItem
      ? 'Existe item com valor unitario zerado. Preencha o valor de venda antes de salvar.'
      : null,
    quoteTotal > 0 ? null : 'O total do orçamento precisa ser maior que zero.',
    hasPaymentDifference
      ? `A soma dos pagamentos precisa bater com o total final. Diferença atual: ${formatCurrency(Math.abs(paymentDifference))}.`
      : null,
  ].filter((issue): issue is string => Boolean(issue))
}

function quotePaymentDrafts(quote: Quote): QuotePaymentDraft[] {
  return quote.payments.length
    ? quote.payments.map((payment) => ({
        amount: payment.amount,
        paymentMethodId: payment.paymentMethodId,
      }))
    : [
        {
          amount: quote.totalAmount,
          paymentMethodId: quote.paymentMethodId ?? '',
        },
      ]
}

function quotePaymentSummary(paymentMethods: PaymentMethod[]) {
  if (paymentMethods.length === 0) {
    return null
  }

  return paymentMethods.map((paymentMethod) => paymentMethod.name).join(' + ')
}

function quotePaymentListSummary(quote: Quote) {
  return quote.payments.length
    ? quote.payments.map((payment) => payment.paymentMethodName).join(' + ')
    : quote.paymentMethodName
}

function normalizeInstallmentCount(count: number) {
  return Math.max(Math.min(Math.trunc(count || 1), 24), 1)
}

function installmentDueDate(firstDueDate: string, index: number) {
  const date = new Date(`${firstDueDate || todayInputDate()}T00:00:00`)
  date.setMonth(date.getMonth() + index)

  return date.toLocaleDateString('en-CA')
}

function quoteItemDiscountAmount(item: QuoteDraftItem) {
  return percentageAmount(
    Number(item.quantity || 0) * Number(item.unitPrice || 0),
    Number(item.discountPercentage || 0),
  )
}

function percentageAmount(baseAmount: number, percentage: number) {
  return Number(((baseAmount * percentage) / 100).toFixed(2))
}

function moneyInputValue(value: string) {
  const parsedValue = Number(value || 0)
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0
}

function emptyQuotePayment(): QuotePaymentDraft {
  return {
    amount: '',
    paymentMethodId: '',
  }
}

function totalQuoteDiscount(quote: Quote) {
  return (
    Number(quote.discountAmount) +
    quote.items.reduce((sum, item) => sum + Number(item.discountAmount), 0)
  )
}
