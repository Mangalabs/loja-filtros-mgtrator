import Autocomplete from '@mui/material/Autocomplete'
import Alert from '@mui/material/Alert'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import TextField from '@mui/material/TextField'
import { CreditCard, List as ListIcon, Pencil, Plus } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import type {
  Client,
  CommercialSettings,
  PaymentMethod,
  Product,
  Quote,
  QuoteFormDraft,
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

type QuoteDiscountMode = 'PERCENTAGE' | 'AMOUNT'

type QuoteListStatusFilter =
  | 'ALL'
  | 'CANCELLED'
  | 'DRAFT'
  | 'SHIPPING_ORDER'
  | 'SHIPPING_ORDER_APPROVED'
  | 'SHIPPING_ORDER_CANCELLED'
  | 'SHIPPING_ORDER_COMPLETED'
  | 'SHIPPING_ORDER_SEPARATED'

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
  discountAmount?: number
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

export type QuoteFormDraftPayload = {
  clientId: string
  clientName: string | null
  payments: QuotePaymentDraft[]
  billingIssueDate: string
  billingDueDate: string
  billingDueDateTouched: boolean
  validUntil: string
  notes: string
  showBrand: boolean
  discountMode: QuoteDiscountMode
  discountPercentage: string
  discountAmount: string
  installmentCount: number
  paymentInstallments: QuotePaymentInstallmentDraft[]
  items: QuoteDraftItem[]
  totalAmount: number
}

export function QuotesPage({
  clients,
  commercialSettings,
  mode = 'all',
  paymentMethods,
  products,
  quoteFormDrafts,
  quotes,
  sourceQuote,
  onSubmit,
  onSaveQuoteFormDraft,
  onDeleteQuoteFormDraft,
  onDiscardQuoteFormDraft,
  onEditQuote,
  onReuseQuote,
  onCancelQuote,
  onCreateShippingOrder,
}: {
  clients: Client[]
  commercialSettings: CommercialSettings | null
  mode?: 'all' | 'form' | 'list'
  paymentMethods: PaymentMethod[]
  products: Product[]
  quoteFormDrafts: QuoteFormDraft[]
  quotes: Quote[]
  sourceQuote?: Quote
  onSubmit: (input: QuoteDraftInput) => Promise<boolean>
  onSaveQuoteFormDraft: (
    input: QuoteFormDraftPayload,
    draft?: QuoteFormDraft,
  ) => Promise<boolean>
  onDeleteQuoteFormDraft: (draft: QuoteFormDraft) => Promise<boolean | void>
  onDiscardQuoteFormDraft: (draft: QuoteFormDraft) => Promise<boolean>
  onEditQuote: (quote: Quote) => void
  onReuseQuote: (quote: Quote) => void
  onCancelQuote: (event: FormEvent<HTMLFormElement>, quote: Quote) => void
  onCreateShippingOrder: (quote: Quote) => void
}) {
  const [clientId, setClientId] = useState('')
  const [sourceDraft, setSourceDraft] = useState<QuoteFormDraft | null>(null)
  const [pendingSavedDraftSignature, setPendingSavedDraftSignature] =
    useState<string | null>(null)
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
  const [discountMode, setDiscountMode] =
    useState<QuoteDiscountMode>('PERCENTAGE')
  const [discountPercentage, setDiscountPercentage] = useState('')
  const [discountAmount, setDiscountAmount] = useState('')
  const [installmentCount, setInstallmentCount] = useState(1)
  const [paymentInstallments, setPaymentInstallments] = useState<
    QuotePaymentInstallmentDraft[]
  >([])
  const [items, setItems] = useState<QuoteDraftItem[]>([emptyQuoteItem()])
  const [quoteSearch, setQuoteSearch] = useState('')
  const [quoteStatusFilter, setQuoteStatusFilter] =
    useState<QuoteListStatusFilter>('ALL')
  const [quotePaymentMethodId, setQuotePaymentMethodId] = useState('ALL')
  const filteredQuotes = useMemo(
    () =>
      filterQuotes(quotes, {
        paymentMethodId: quotePaymentMethodId,
        search: quoteSearch,
        status: quoteStatusFilter,
      }),
    [quotePaymentMethodId, quoteSearch, quoteStatusFilter, quotes],
  )
  const { pagination, visibleItems } = usePaginatedRows<Quote>(
    filteredQuotes,
    [quotePaymentMethodId, quoteSearch, quoteStatusFilter].join('|'),
  )
  const activeProducts = products.filter((product) => product.active)
  const activeClients = clients.filter((client) => client.active)
  const selectedClient =
    activeClients.find((client) => client.id === clientId) ?? null
  const activePaymentMethods = paymentMethods.filter(
    (paymentMethod) => paymentMethod.active,
  )
  const quotePaymentFilterOptions = paymentMethods.filter((paymentMethod) =>
    quotes.some(
      (quote) =>
        quote.paymentMethodId === paymentMethod.id ||
        quote.payments.some(
          (payment) => payment.paymentMethodId === paymentMethod.id,
        ),
    ),
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
  const quoteSubtotal = items.reduce((sum, item) => {
    return sum + Number(item.quantity || 0) * Number(item.unitPrice || 0)
  }, 0)
  const itemDiscountTotal = items.reduce(
    (sum, item) => sum + quoteItemDiscountAmount(item),
    0,
  )
  const totalBeforeGeneralDiscount = quoteSubtotal - itemDiscountTotal
  const generalDiscount = quoteGeneralDiscountAmount(
    totalBeforeGeneralDiscount,
    discountMode,
    discountPercentage,
    discountAmount,
  )
  const quoteTotal = Math.max(totalBeforeGeneralDiscount - generalDiscount, 0)
  const bankSlipAmount = usesBankSlip
    ? quotePaymentMethodAmount(payments, quoteTotal, paymentMethods, 'BOLETO')
    : 0
  const installmentTotal = quotePaymentInstallmentsTotal(paymentInstallments)
  const installmentDifference = Number(
    (bankSlipAmount - installmentTotal).toFixed(2),
  )
  const hasInstallmentDifference =
    usesBankSlip && Math.abs(installmentDifference) >= 0.01
  const paymentTotal = quotePaymentDraftTotal(payments, quoteTotal)
  const paymentDifference = Number((quoteTotal - paymentTotal).toFixed(2))
  const hasPaymentDifference = Math.abs(paymentDifference) >= 0.01
  const quoteFormIssues = quoteBlockingIssues({
    clientId,
    discountExceedsTotal: generalDiscount > totalBeforeGeneralDiscount,
    hasPaymentDifference,
    hasInstallmentDifference,
    items,
    installmentDifference,
    paymentDifference,
    primaryPaymentMethodId,
    quoteTotal,
  })
  const hasQuoteBlockingIssues = quoteFormIssues.length > 0

  useEffect(() => {
    setValidUntil(quoteValidityDate(billingIssueDate, commercialSettings))
  }, [
    billingIssueDate,
    commercialSettings?.defaultQuoteValidityDays,
  ])

  useEffect(() => {
    if (billingDueDateTouched) {
      return
    }

    const nextDueDate = quoteDueDate(billingIssueDate, commercialSettings)

    setBillingDueDate(nextDueDate)
    if (usesBankSlip) {
      setPaymentInstallments(
        quotePaymentInstallments(
          installmentCount,
          nextDueDate,
          bankSlipAmount,
        ),
      )
    }
  }, [
    bankSlipAmount,
    billingDueDateTouched,
    billingIssueDate,
    commercialSettings?.defaultQuoteDueDays,
    installmentCount,
    usesBankSlip,
  ])

  useEffect(() => {
    if (!usesBankSlip) {
      setPaymentInstallments([])
      return
    }

    setPaymentInstallments((currentInstallments) =>
      syncQuotePaymentInstallments(
        currentInstallments,
        installmentCount,
        billingDueDate || billingIssueDate,
        bankSlipAmount,
      ),
    )
  }, [
    bankSlipAmount,
    billingDueDate,
    billingIssueDate,
    installmentCount,
    usesBankSlip,
  ])

  useEffect(() => {
    if (!pendingSavedDraftSignature || sourceDraft) {
      return
    }

    const savedDraft = quoteFormDrafts.find(
      (draft) =>
        quoteFormDraftPayloadSignature(draft.payload) ===
        pendingSavedDraftSignature,
    )

    if (!savedDraft) {
      return
    }

    setSourceDraft(savedDraft)
    setPendingSavedDraftSignature(null)
  }, [pendingSavedDraftSignature, quoteFormDrafts, sourceDraft])

  useEffect(() => {
    if (!sourceQuote) {
      return
    }

    loadReusableQuote(sourceQuote)
  }, [sourceQuote?.id])

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
    setClientId('')
    setSourceDraft(null)
    setPendingSavedDraftSignature(null)
    setPayments([emptyQuotePayment()])
    const issueDate = todayInputDate()

    setBillingIssueDate(issueDate)
    setBillingDueDate(quoteDueDate(issueDate, commercialSettings))
    setBillingDueDateTouched(false)
    setValidUntil(quoteValidityDate(issueDate, commercialSettings))
    setNotes('')
    setShowBrand(true)
    setDiscountMode('PERCENTAGE')
    setDiscountPercentage('')
    setDiscountAmount('')
    setInstallmentCount(1)
    setPaymentInstallments([])
    setItems([emptyQuoteItem()])
  }

  function currentQuoteFormDraftPayload(): QuoteFormDraftPayload {
    return {
      clientId,
      clientName: selectedClient?.name ?? null,
      payments,
      billingIssueDate,
      billingDueDate,
      billingDueDateTouched,
      validUntil,
      notes,
      showBrand,
      discountMode,
      discountPercentage,
      discountAmount,
      installmentCount,
      paymentInstallments,
      items,
      totalAmount: quoteTotal,
    }
  }

  function loadQuoteFormDraft(draft: QuoteFormDraft) {
    const payload = normalizeQuoteFormDraftPayload(draft.payload)

    setSourceDraft(draft)
    setClientId(payload.clientId)
    setPayments(payload.payments)
    setBillingIssueDate(payload.billingIssueDate)
    setBillingDueDate(payload.billingDueDate)
    setBillingDueDateTouched(payload.billingDueDateTouched)
    setValidUntil(payload.validUntil)
    setNotes(payload.notes)
    setShowBrand(payload.showBrand)
    setDiscountMode(payload.discountMode)
    setDiscountPercentage(payload.discountPercentage)
    setDiscountAmount(payload.discountAmount)
    setInstallmentCount(payload.installmentCount)
    setPaymentInstallments(payload.paymentInstallments)
    setItems(payload.items)
  }

  function loadReusableQuote(quote: Quote) {
    const issueDate = todayInputDate()
    const discountMode =
      Number(quote.discountPercentage || 0) > 0 ? 'PERCENTAGE' : 'AMOUNT'

    setSourceDraft(null)
    setPendingSavedDraftSignature(null)
    setClientId(quote.clientId)
    setPayments(quotePaymentDrafts(quote))
    setBillingIssueDate(issueDate)
    setBillingDueDate(quoteDueDate(issueDate, commercialSettings))
    setBillingDueDateTouched(false)
    setValidUntil(quoteValidityDate(issueDate, commercialSettings))
    setNotes(quote.notes ?? '')
    setShowBrand(quote.showBrand)
    setDiscountMode(discountMode)
    setDiscountPercentage(
      discountMode === 'PERCENTAGE' ? quote.discountPercentage : '',
    )
    setDiscountAmount(discountMode === 'AMOUNT' ? quote.discountAmount : '')
    setInstallmentCount(Math.max(quote.paymentInstallments.length, 1))
    setPaymentInstallments(
      quotePaymentInstallmentDrafts(
        quote.paymentInstallments,
        Math.max(quote.paymentInstallments.length, 1),
        quoteDueDate(issueDate, commercialSettings),
        Number(quote.totalAmount),
      ),
    )
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

  async function saveQuoteFormDraft() {
    const payload = currentQuoteFormDraftPayload()
    const saved = await onSaveQuoteFormDraft(payload, sourceDraft ?? undefined)

    if (!saved) {
      return
    }

    if (!sourceDraft) {
      setPendingSavedDraftSignature(quoteFormDraftPayloadSignature(payload))
      return
    }

    setSourceDraft({
      ...sourceDraft,
      payload,
      updatedAt: new Date().toISOString(),
    })
  }

  async function deleteLoadedQuoteFormDraft() {
    if (!sourceDraft) {
      return
    }

    const deleted = await onDeleteQuoteFormDraft(sourceDraft)

    if (deleted) {
      setSourceDraft(null)
    }
  }

  function updatePaymentInstallment(
    index: number,
    changes: Partial<QuotePaymentInstallmentDraft>,
  ) {
    setPaymentInstallments((currentInstallments) =>
      currentInstallments.map((installment, installmentIndex) =>
        installmentIndex === index
          ? { ...installment, ...changes }
          : installment,
      ),
    )
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
      ...quoteGeneralDiscountInput(
        discountMode,
        discountPercentage,
        discountAmount,
      ),
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
    const saved = await onSubmit(input)

    if (saved) {
      if (sourceDraft) {
        await onDiscardQuoteFormDraft(sourceDraft)
      }

      resetQuoteForm()
    }
  }

  return (
    <section className='grid gap-4'>
      {mode !== 'list' ? (
      <FormGrid className='gap-5 sm:gap-6' onSubmit={submit}>
        <PageHeader
          description='Monte itens, valores e dados comerciais antes do PDF.'
          icon={<ListIcon size={18} />}
          title='Novo orçamento'
        />
        <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]'>
          <Autocomplete
            getOptionLabel={(draft) =>
              `${draft.title} - ${formatDateTime(draft.updatedAt)}`
            }
            isOptionEqualToValue={(option, value) => option.id === value.id}
            noOptionsText='Nenhum rascunho salvo'
            options={quoteFormDrafts}
            value={sourceDraft}
            onChange={(_event, draft) => {
              if (draft) {
                loadQuoteFormDraft(draft)
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label='Carregar rascunho'
                size='medium'
              />
            )}
          />
          <SecondaryButton type='button' onClick={saveQuoteFormDraft}>
            {sourceDraft ? 'Atualizar rascunho' : 'Salvar rascunho'}
          </SecondaryButton>
          {sourceDraft ? (
            <SecondaryButton
              type='button'
              onClick={() => void deleteLoadedQuoteFormDraft()}>
              Excluir rascunho
            </SecondaryButton>
          ) : null}
        </div>
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
              description='As parcelas são sugeridas pela configuração comercial e podem ser ajustadas manualmente.'
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
            <QuoteInstallmentsEditor
              installments={paymentInstallments}
              onChange={updatePaymentInstallment}
            />
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
            helperText={`Sugerido pela configuração comercial: ${quoteDueDays(commercialSettings)} dia(s). Pode ser alterado manualmente.`}
            label='Primeiro vencimento do boleto/fatura'
            size='medium'
            type='date'
            value={billingDueDate}
            onChange={(event) => {
              const nextDueDate = event.target.value

              setBillingDueDate(nextDueDate)
              setBillingDueDateTouched(true)
              setPaymentInstallments(
                quotePaymentInstallments(
                  installmentCount,
                  nextDueDate || billingIssueDate,
                  bankSlipAmount,
                ),
              )
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
          <div className='grid gap-2'>
            <ToggleButtonGroup
              exclusive
              size='small'
              value={discountMode}
              onChange={(_event, value: QuoteDiscountMode | null) => {
                if (value) {
                  setDiscountMode(value)
                }
              }}>
              <ToggleButton value='PERCENTAGE'>%</ToggleButton>
              <ToggleButton value='AMOUNT'>R$</ToggleButton>
            </ToggleButtonGroup>
            <TextField
              label={
                discountMode === 'PERCENTAGE'
                  ? 'Desconto geral (%)'
                  : 'Desconto geral (R$)'
              }
              value={
                discountMode === 'PERCENTAGE'
                  ? discountPercentage
                  : discountAmount
              }
              type='number'
              size='medium'
              onChange={(event) => {
                if (discountMode === 'PERCENTAGE') {
                  setDiscountPercentage(event.target.value)
                } else {
                  setDiscountAmount(event.target.value)
                }
              }}
              slotProps={{
                htmlInput:
                  discountMode === 'PERCENTAGE'
                    ? { min: '0', max: '100', step: '0.01' }
                    : { min: '0', step: '0.01' },
              }}
            />
          </div>
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
            Salvar orçamento
          </PrimaryButton>
        </ActionGroup>
      </FormGrid>
      ) : null}

      {mode !== 'form' ? (
      <PagePanel wide>
        <PageHeader
          actions={<StatusChip label='PDF disponível' tone='success' />}
          description={`${filteredQuotes.length} de ${quotes.length} registro(s)`}
          title='Orçamentos salvos'
        />
        <div className='mb-4 grid gap-3 xl:grid-cols-[minmax(220px,1fr)_220px_200px]'>
          <TextField
            label='Buscar orçamento'
            placeholder='Cliente, nº, produto, vendedor...'
            size='small'
            value={quoteSearch}
            onChange={(event) => setQuoteSearch(event.target.value)}
          />
          <TextField
            label='Situação'
            select
            size='small'
            value={quoteStatusFilter}
            onChange={(event) =>
              setQuoteStatusFilter(event.target.value as QuoteListStatusFilter)
            }>
            {quoteListStatusFilterOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label='Pagamento'
            select
            size='small'
            value={quotePaymentMethodId}
            onChange={(event) => setQuotePaymentMethodId(event.target.value)}>
            <MenuItem value='ALL'>Todos</MenuItem>
            {quotePaymentFilterOptions.map((method) => (
              <MenuItem key={method.id} value={method.id}>
                {method.name}
              </MenuItem>
            ))}
          </TextField>
        </div>
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
              render: (quote) => `${quote.items.length} item(ns)`,
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
                  onEditQuote={onEditQuote}
                  onReuseQuote={onReuseQuote}
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
      ) : null}
    </section>
  )
}

export function QuoteEditPage({
  clients,
  commercialSettings,
  paymentMethods,
  products,
  quote,
  onCancel,
  onSubmit,
}: {
  clients: Client[]
  commercialSettings: CommercialSettings | null
  paymentMethods: PaymentMethod[]
  products: Product[]
  quote: Quote
  onCancel: () => void
  onSubmit: (quote: Quote, input: QuoteDraftInput) => Promise<boolean>
}) {
  const [clientId, setClientId] = useState(quote.clientId)
  const [payments, setPayments] = useState<QuotePaymentDraft[]>(
    quotePaymentDrafts(quote),
  )
  const [billingIssueDate, setBillingIssueDate] = useState(
    quote.billingIssueDate?.slice(0, 10) ?? '',
  )
  const [billingDueDate, setBillingDueDate] = useState(
    quote.billingDueDate?.slice(0, 10) ?? '',
  )
  const [billingDueDateTouched, setBillingDueDateTouched] = useState(
    Boolean(quote.billingDueDate),
  )
  const [validUntil, setValidUntil] = useState(
    quote.validUntil?.slice(0, 10) ?? '',
  )
  const [notes, setNotes] = useState(quote.notes ?? '')
  const [showBrand, setShowBrand] = useState(quote.showBrand)
  const [discountMode, setDiscountMode] =
    useState<QuoteDiscountMode>('PERCENTAGE')
  const [discountPercentage, setDiscountPercentage] = useState(
    quote.discountPercentage,
  )
  const [discountAmount, setDiscountAmount] = useState(quote.discountAmount)
  const [installmentCount, setInstallmentCount] = useState(
    Math.max(quote.paymentInstallments.length, 1),
  )
  const [paymentInstallments, setPaymentInstallments] = useState<
    QuotePaymentInstallmentDraft[]
  >(() =>
    quotePaymentInstallmentDrafts(
      quote.paymentInstallments,
      Math.max(quote.paymentInstallments.length, 1),
      quote.billingDueDate?.slice(0, 10) ??
        quoteDueDate(todayInputDate(), commercialSettings),
      Number(quote.totalAmount),
    ),
  )
  const [items, setItems] = useState<QuoteDraftItem[]>(
    quote.items.map((item) => ({
      productId: item.productId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercentage: item.discountPercentage,
    })),
  )
  const activeClients = clients.filter(
    (client) => client.active || client.id === quote.clientId,
  )
  const selectedClient =
    activeClients.find((client) => client.id === clientId) ?? null
  const selectableProducts = products.filter(
    (product) =>
      product.active || items.some((item) => item.productId === product.id),
  )
  const activePaymentMethods = paymentMethods.filter(
    (paymentMethod) =>
      paymentMethod.active ||
      payments.some((payment) => payment.paymentMethodId === paymentMethod.id),
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
  const quoteSubtotal = items.reduce((sum, item) => {
    return sum + Number(item.quantity || 0) * Number(item.unitPrice || 0)
  }, 0)
  const itemDiscountTotal = items.reduce(
    (sum, item) => sum + quoteItemDiscountAmount(item),
    0,
  )
  const totalBeforeGeneralDiscount = quoteSubtotal - itemDiscountTotal
  const generalDiscount = quoteGeneralDiscountAmount(
    totalBeforeGeneralDiscount,
    discountMode,
    discountPercentage,
    discountAmount,
  )
  const quoteTotal = Math.max(totalBeforeGeneralDiscount - generalDiscount, 0)
  const bankSlipAmount = usesBankSlip
    ? quotePaymentMethodAmount(payments, quoteTotal, paymentMethods, 'BOLETO')
    : 0
  const installmentTotal = quotePaymentInstallmentsTotal(paymentInstallments)
  const installmentDifference = Number(
    (bankSlipAmount - installmentTotal).toFixed(2),
  )
  const hasInstallmentDifference =
    usesBankSlip && Math.abs(installmentDifference) >= 0.01
  const paymentTotal = quotePaymentDraftTotal(payments, quoteTotal)
  const paymentDifference = Number((quoteTotal - paymentTotal).toFixed(2))
  const hasPaymentDifference = Math.abs(paymentDifference) >= 0.01
  const quoteFormIssues = quoteBlockingIssues({
    clientId,
    discountExceedsTotal: generalDiscount > totalBeforeGeneralDiscount,
    hasPaymentDifference,
    hasInstallmentDifference,
    items,
    installmentDifference,
    paymentDifference,
    primaryPaymentMethodId,
    quoteTotal,
  })
  const quoteIsEditable = quote.status === 'DRAFT'
  const hasQuoteBlockingIssues = quoteFormIssues.length > 0 || !quoteIsEditable

  useEffect(() => {
    setClientId(quote.clientId)
    setPayments(quotePaymentDrafts(quote))
    setBillingIssueDate(quote.billingIssueDate?.slice(0, 10) ?? '')
    setBillingDueDate(quote.billingDueDate?.slice(0, 10) ?? '')
    setBillingDueDateTouched(Boolean(quote.billingDueDate))
    setValidUntil(quote.validUntil?.slice(0, 10) ?? '')
    setNotes(quote.notes ?? '')
    setShowBrand(quote.showBrand)
    setDiscountMode('PERCENTAGE')
    setDiscountPercentage(quote.discountPercentage)
    setDiscountAmount(quote.discountAmount)
    setInstallmentCount(Math.max(quote.paymentInstallments.length, 1))
    setPaymentInstallments(
      quotePaymentInstallmentDrafts(
        quote.paymentInstallments,
        Math.max(quote.paymentInstallments.length, 1),
        quote.billingDueDate?.slice(0, 10) ??
          quoteDueDate(todayInputDate(), commercialSettings),
        Number(quote.totalAmount),
      ),
    )
    setItems(
      quote.items.map((item) => ({
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercentage: item.discountPercentage,
      })),
    )
  }, [quote])

  useEffect(() => {
    if (billingDueDateTouched) {
      return
    }

    const nextDueDate = quoteDueDate(
      billingIssueDate || todayInputDate(),
      commercialSettings,
    )

    setBillingDueDate(nextDueDate)
    if (usesBankSlip) {
      setPaymentInstallments(
        quotePaymentInstallments(
          installmentCount,
          nextDueDate,
          bankSlipAmount,
        ),
      )
    }
  }, [
    bankSlipAmount,
    billingDueDateTouched,
    billingIssueDate,
    commercialSettings?.defaultQuoteDueDays,
    installmentCount,
    usesBankSlip,
  ])

  useEffect(() => {
    if (!usesBankSlip) {
      setPaymentInstallments([])
      return
    }

    setPaymentInstallments((currentInstallments) =>
      syncQuotePaymentInstallments(
        currentInstallments,
        installmentCount,
        billingDueDate || billingIssueDate || todayInputDate(),
        bankSlipAmount,
      ),
    )
  }, [
    bankSlipAmount,
    billingDueDate,
    billingIssueDate,
    installmentCount,
    usesBankSlip,
  ])

  function updateItem(index: number, changes: Partial<QuoteDraftItem>) {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item
        }

        if (changes.productId) {
          const product = selectableProducts.find(
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

  function updatePaymentInstallment(
    index: number,
    changes: Partial<QuotePaymentInstallmentDraft>,
  ) {
    setPaymentInstallments((currentInstallments) =>
      currentInstallments.map((installment, installmentIndex) =>
        installmentIndex === index
          ? { ...installment, ...changes }
          : installment,
      ),
    )
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const saved = await onSubmit(quote, {
      clientId,
      paymentMethodId: primaryPaymentMethodId,
      payments: quotePaymentPayloads(payments, quoteTotal),
      billingIssueDate: billingIssueDate || null,
      billingDueDate: billingDueDate || null,
      validUntil: validUntil || null,
      notes: notes.trim() || null,
      showBrand,
      ...quoteGeneralDiscountInput(
        discountMode,
        discountPercentage,
        discountAmount,
      ),
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
    })

    if (saved) {
      onCancel()
    }
  }

  return (
    <FormGrid className='max-w-5xl gap-5 sm:gap-6' onSubmit={submit}>
      <PageHeader
        description='Ajuste os dados antes de reenviar ou baixar o PDF atualizado.'
        icon={<Pencil size={18} />}
        title={`Editar orçamento Nº ${quote.quoteNumber}`}
      />
      {!quoteIsEditable ? (
        <Alert severity='warning' variant='outlined'>
          Orçamentos cancelados não podem ser editados.
        </Alert>
      ) : null}
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
            description='As parcelas são sugeridas pela configuração comercial e podem ser ajustadas manualmente.'
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
          <QuoteInstallmentsEditor
            installments={paymentInstallments}
            onChange={updatePaymentInstallment}
          />
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
          helperText={`Sugerido pela configuração comercial: ${quoteDueDays(commercialSettings)} dia(s). Pode ser alterado manualmente.`}
          label='Primeiro vencimento do boleto/fatura'
          size='medium'
          type='date'
          value={billingDueDate}
          onChange={(event) => {
            const nextDueDate = event.target.value

            setBillingDueDate(nextDueDate)
            setBillingDueDateTouched(true)
            setPaymentInstallments(
              quotePaymentInstallments(
                installmentCount,
                nextDueDate || billingIssueDate || todayInputDate(),
                bankSlipAmount,
              ),
            )
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
        <div className='grid gap-2'>
          <ToggleButtonGroup
            exclusive
            size='small'
            value={discountMode}
            onChange={(_event, value: QuoteDiscountMode | null) => {
              if (value) {
                setDiscountMode(value)
              }
            }}>
            <ToggleButton value='PERCENTAGE'>%</ToggleButton>
            <ToggleButton value='AMOUNT'>R$</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            label={
              discountMode === 'PERCENTAGE'
                ? 'Desconto geral (%)'
                : 'Desconto geral (R$)'
            }
            value={
              discountMode === 'PERCENTAGE' ? discountPercentage : discountAmount
            }
            type='number'
            size='medium'
            onChange={(event) => {
              if (discountMode === 'PERCENTAGE') {
                setDiscountPercentage(event.target.value)
              } else {
                setDiscountAmount(event.target.value)
              }
            }}
            slotProps={{
              htmlInput:
                discountMode === 'PERCENTAGE'
                  ? { min: '0', max: '100', step: '0.01' }
                  : { min: '0', step: '0.01' },
            }}
          />
        </div>
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
              name={`quoteEditItems.${index}.productId`}
              products={selectableProducts}
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
        {quoteFormIssues[0] ? <InlineNote>{quoteFormIssues[0]}</InlineNote> : null}
        <SecondaryButton type='button' onClick={onCancel}>
          Cancelar
        </SecondaryButton>
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
          Salvar alterações
        </PrimaryButton>
      </ActionGroup>
    </FormGrid>
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

function QuoteInstallmentsEditor({
  installments,
  onChange,
}: {
  installments: QuotePaymentInstallmentDraft[]
  onChange: (
    index: number,
    changes: Partial<QuotePaymentInstallmentDraft>,
  ) => void
}) {
  return (
    <div className='grid gap-3'>
      {installments.map((installment, index) => (
        <div
          className='grid gap-3 rounded-lg border border-[#e4e9e5] bg-[#fbfcfb] p-3 md:grid-cols-[80px_minmax(0,1fr)_180px]'
          key={installment.position}>
          <InlineNote>Parcela {installment.position}</InlineNote>
          <TextField
            label='Vencimento'
            required
            size='small'
            type='date'
            value={installment.dueDate}
            onChange={(event) =>
              onChange(index, { dueDate: event.target.value })
            }
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label='Valor'
            required
            size='small'
            type='number'
            value={installment.amount}
            onChange={(event) =>
              onChange(index, { amount: event.target.value })
            }
            slotProps={{ htmlInput: { min: '0.01', step: '0.01' } }}
          />
        </div>
      ))}
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
  onReuseQuote,
  onCancelQuote,
  onCreateShippingOrder,
}: {
  quote: Quote
  onEditQuote: (quote: Quote) => void
  onReuseQuote: (quote: Quote) => void
  onCancelQuote: (event: FormEvent<HTMLFormElement>, quote: Quote) => void
  onCreateShippingOrder: (quote: Quote) => void
}) {
  const [showCancellationForm, setShowCancellationForm] = useState(false)
  const actions = quoteActions({
    onCancelQuote: () => setShowCancellationForm(true),
    onCreateShippingOrder: () => onCreateShippingOrder(quote),
    onEditQuote: () => onEditQuote(quote),
    onReuseQuote: () => onReuseQuote(quote),
    quote,
  })

  if (quote.shippingOrderId && quote.status !== 'DRAFT') {
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
  onReuseQuote,
  quote,
}: {
  onCancelQuote: () => void
  onCreateShippingOrder: () => void
  onEditQuote: () => void
  onReuseQuote: () => void
  quote: Quote
}) {
  const actions: TableActionsMenuAction[] = [
    {
      label: 'Baixar PDF',
      onSelect: () => void downloadQuotePdf(quote),
    },
    {
      label: 'Reutilizar orçamento',
      onSelect: onReuseQuote,
    },
  ]

  quote.status === 'DRAFT' &&
    actions.push(
      {
        label: 'Editar',
        onSelect: onEditQuote,
      },
      {
        label: quote.shippingOrderId ? 'Criar nova venda' : 'Criar venda',
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
  return downloadApiFile(`/quotes/${quote.id}/pdf`, quotePdfFileName(quote))
}

function quotePdfFileName(quote: Quote) {
  return `ORCAMENTO-${quotePdfFileNamePart(quote.clientName)}-${
    quote.quoteNumber
  }.pdf`
}

function quotePdfFileNamePart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase()
}

const quoteShippingStatusLabels: Record<
  NonNullable<Quote['shippingOrderStatus']>,
  string
> = {
  APPROVED: 'Pedido aprovado',
  CANCELLED: 'Pedido cancelado',
  COMPLETED: 'Venda concluída',
  QUOTED: 'Pedido criado',
  SEPARATED: 'Separado',
}

const quoteListStatusFilterOptions: Array<{
  label: string
  value: QuoteListStatusFilter
}> = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Rascunhos', value: 'DRAFT' },
  { label: 'Com pedido criado', value: 'SHIPPING_ORDER' },
  { label: 'Pedidos aprovados', value: 'SHIPPING_ORDER_APPROVED' },
  { label: 'Separados', value: 'SHIPPING_ORDER_SEPARATED' },
  { label: 'Vendas concluídas', value: 'SHIPPING_ORDER_COMPLETED' },
  { label: 'Pedidos cancelados', value: 'SHIPPING_ORDER_CANCELLED' },
  { label: 'Cancelados', value: 'CANCELLED' },
]

function filterQuotes(
  quotes: Quote[],
  filters: {
    paymentMethodId: string
    search: string
    status: QuoteListStatusFilter
  },
) {
  const normalizedSearch = normalizeQuoteSearchText(filters.search)

  return quotes.filter((quote) => {
    const matchesStatus = quoteMatchesStatusFilter(quote, filters.status)
    const matchesPayment =
      filters.paymentMethodId === 'ALL' ||
      quote.paymentMethodId === filters.paymentMethodId ||
      quote.payments.some(
        (payment) => payment.paymentMethodId === filters.paymentMethodId,
      )
    const matchesSearch =
      !normalizedSearch ||
      quoteSearchText(quote).includes(normalizedSearch)

    return matchesStatus && matchesPayment && matchesSearch
  })
}

function quoteMatchesStatusFilter(
  quote: Quote,
  status: QuoteListStatusFilter,
) {
  if (status === 'ALL') {
    return true
  }

  if (status === 'DRAFT') {
    return quote.status === 'DRAFT'
  }

  if (status === 'CANCELLED') {
    return quote.status === 'CANCELLED'
  }

  if (status === 'SHIPPING_ORDER') {
    return Boolean(quote.shippingOrderId)
  }

  return quote.shippingOrderStatus === quoteShippingStatusByFilter[status]
}

const quoteShippingStatusByFilter: Record<
  Exclude<
    QuoteListStatusFilter,
    'ALL' | 'CANCELLED' | 'DRAFT' | 'SHIPPING_ORDER'
  >,
  NonNullable<Quote['shippingOrderStatus']>
> = {
  SHIPPING_ORDER_APPROVED: 'APPROVED',
  SHIPPING_ORDER_CANCELLED: 'CANCELLED',
  SHIPPING_ORDER_COMPLETED: 'COMPLETED',
  SHIPPING_ORDER_SEPARATED: 'SEPARATED',
}

function quoteSearchText(quote: Quote) {
  return normalizeQuoteSearchText(
    [
      quote.quoteNumber,
      quote.clientName,
      quote.clientPhone,
      quote.clientDocument,
      quote.clientEmail,
      quote.createdByUserName,
      quote.paymentMethodName,
      quote.shippingOrderStatus
        ? quoteShippingStatusLabel(quote.shippingOrderStatus)
        : '',
      quoteStatusPresentation(quote).label,
      quote.totalAmount,
      quote.subtotalAmount,
      quote.notes,
      ...quote.payments.map((payment) => payment.paymentMethodName),
      ...quote.items.flatMap((item) => [
        item.productInternalCode,
        item.productName,
        item.productBrandName,
        item.description,
        item.productNcm,
      ]),
    ].join(' '),
  )
}

function normalizeQuoteSearchText(value: string | number | null | undefined) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
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
                  ? 'Com uma forma, acompanha o total final.'
                  : undefined
              }
              label='Valor'
              disabled={payments.length === 1}
              onChange={(event) =>
                updatePayment(index, { amount: event.target.value })
              }
              required={payments.length > 1}
              size='medium'
              slotProps={
                payments.length > 1
                  ? { htmlInput: { min: '0', step: '0.01' } }
                  : undefined
              }
              type={payments.length > 1 ? 'number' : undefined}
              value={
                payments.length === 1
                  ? formatCurrency(totalAmount)
                  : payment.amount
              }
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
  date.setDate(date.getDate() + quoteDueDays(settings))

  return date.toLocaleDateString('en-CA')
}

function quoteDueDays(settings: CommercialSettings | null) {
  return Number(settings?.defaultQuoteDueDays ?? 0)
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

function quotePaymentInstallmentsTotal(
  installments: QuotePaymentInstallmentDraft[],
) {
  return Number(
    installments
      .reduce((sum, installment) => sum + moneyInputValue(installment.amount), 0)
      .toFixed(2),
  )
}

function quotePaymentInstallmentDrafts(
  installments: Quote['paymentInstallments'],
  count: number,
  firstDueDate: string,
  totalAmount: number,
) {
  if (installments.length > 0) {
    return installments.map((installment, index) => ({
      amount: installment.amount,
      dueDate: installment.dueDate.slice(0, 10),
      position: index + 1,
    }))
  }

  return quotePaymentInstallments(count, firstDueDate, totalAmount)
}

function syncQuotePaymentInstallments(
  currentInstallments: QuotePaymentInstallmentDraft[],
  count: number,
  firstDueDate: string,
  totalAmount: number,
) {
  const nextInstallments = quotePaymentInstallments(
    count,
    firstDueDate,
    totalAmount,
  )

  return nextInstallments.map((installment, index) => ({
    ...installment,
    dueDate: currentInstallments[index]?.dueDate || installment.dueDate,
    amount: currentInstallments[index]?.amount || installment.amount,
  }))
}

function quotePaymentPayloads(
  payments: QuotePaymentDraft[],
  totalAmount: number,
) {
  const filledPayments = payments.filter((payment) => payment.paymentMethodId)
  const usesSinglePaymentTotal = filledPayments.length === 1

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
  discountExceedsTotal,
  hasInstallmentDifference,
  hasPaymentDifference,
  installmentDifference,
  items,
  paymentDifference,
  primaryPaymentMethodId,
  quoteTotal,
}: {
  clientId: string
  discountExceedsTotal: boolean
  hasInstallmentDifference: boolean
  hasPaymentDifference: boolean
  installmentDifference: number
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
    discountExceedsTotal
      ? 'Desconto geral nao pode ser maior que o total dos itens.'
      : null,
    quoteTotal > 0 ? null : 'O total do orçamento precisa ser maior que zero.',
    hasPaymentDifference
      ? `A soma dos pagamentos precisa bater com o total final. Diferença atual: ${formatCurrency(Math.abs(paymentDifference))}.`
      : null,
    hasInstallmentDifference
      ? `A soma das parcelas do boleto precisa bater com o valor do boleto. Diferença atual: ${formatCurrency(Math.abs(installmentDifference))}.`
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

function quoteGeneralDiscountAmount(
  baseAmount: number,
  mode: QuoteDiscountMode,
  percentage: string,
  amount: string,
) {
  if (mode === 'AMOUNT') {
    return moneyInputValue(amount)
  }

  return percentageAmount(baseAmount, Number(percentage || 0))
}

function quoteGeneralDiscountInput(
  mode: QuoteDiscountMode,
  percentage: string,
  amount: string,
) {
  return mode === 'AMOUNT'
    ? {
        discountAmount: moneyInputValue(amount),
        discountPercentage: undefined,
      }
    : {
        discountAmount: undefined,
        discountPercentage: Number(percentage || 0),
      }
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

function normalizeQuoteFormDraftPayload(
  payload: Record<string, unknown>,
): QuoteFormDraftPayload {
  const installmentCount = numberPayloadValue(payload.installmentCount, 1)
  const paymentInstallments = quotePaymentInstallmentPayloads(
    payload.paymentInstallments,
  )

  return {
    clientId: stringPayloadValue(payload.clientId),
    clientName: nullableStringPayloadValue(payload.clientName),
    payments: quotePaymentDraftPayloads(payload.payments),
    billingIssueDate: stringPayloadValue(payload.billingIssueDate) || todayInputDate(),
    billingDueDate: stringPayloadValue(payload.billingDueDate),
    billingDueDateTouched: booleanPayloadValue(payload.billingDueDateTouched),
    validUntil: stringPayloadValue(payload.validUntil),
    notes: stringPayloadValue(payload.notes),
    showBrand: payload.showBrand === undefined
      ? true
      : booleanPayloadValue(payload.showBrand),
    discountMode: quoteDiscountModePayloadValue(payload.discountMode),
    discountPercentage: stringPayloadValue(payload.discountPercentage),
    discountAmount: stringPayloadValue(payload.discountAmount),
    installmentCount,
    paymentInstallments,
    items: quoteItemDraftPayloads(payload.items),
    totalAmount: numberPayloadValue(payload.totalAmount, 0),
  }
}

function quotePaymentInstallmentPayloads(value: unknown) {
  const installments = Array.isArray(value) ? value : []

  return installments
    .map((installment, index) =>
      installment && typeof installment === 'object'
        ? quotePaymentInstallmentPayload(
            installment as Record<string, unknown>,
            index,
          )
        : null,
    )
    .filter(
      (installment): installment is QuotePaymentInstallmentDraft =>
        Boolean(installment),
    )
}

function quotePaymentInstallmentPayload(
  installment: Record<string, unknown>,
  index: number,
): QuotePaymentInstallmentDraft | null {
  const dueDate = stringPayloadValue(installment.dueDate)
  const amount = stringPayloadValue(installment.amount)

  if (!dueDate || !amount) {
    return null
  }

  return {
    amount,
    dueDate,
    position: numberPayloadValue(installment.position, index + 1),
  }
}

function quoteFormDraftPayloadSignature(payload: unknown) {
  const draftPayload =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : {}

  return JSON.stringify(normalizeQuoteFormDraftPayload(draftPayload))
}

function quotePaymentDraftPayloads(value: unknown): QuotePaymentDraft[] {
  if (!Array.isArray(value)) {
    return [emptyQuotePayment()]
  }

  const payments = value
    .filter((payment): payment is Record<string, unknown> =>
      Boolean(payment) && typeof payment === 'object',
    )
    .map((payment) => ({
      amount: stringPayloadValue(payment.amount),
      paymentMethodId: stringPayloadValue(payment.paymentMethodId),
    }))

  return payments.length > 0 ? payments : [emptyQuotePayment()]
}

function quoteItemDraftPayloads(value: unknown): QuoteDraftItem[] {
  if (!Array.isArray(value)) {
    return [emptyQuoteItem()]
  }

  const items = value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === 'object',
    )
    .map((item) => ({
      productId: stringPayloadValue(item.productId),
      description: stringPayloadValue(item.description),
      quantity: stringPayloadValue(item.quantity) || '1',
      unitPrice: stringPayloadValue(item.unitPrice),
      discountPercentage: stringPayloadValue(item.discountPercentage),
    }))

  return items.length > 0 ? items : [emptyQuoteItem()]
}

function quoteDiscountModePayloadValue(value: unknown): QuoteDiscountMode {
  return value === 'AMOUNT' ? 'AMOUNT' : 'PERCENTAGE'
}

function stringPayloadValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function nullableStringPayloadValue(value: unknown) {
  return typeof value === 'string' ? value : null
}

function booleanPayloadValue(value: unknown) {
  return value === true
}

function numberPayloadValue(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function totalQuoteDiscount(quote: Quote) {
  return (
    Number(quote.discountAmount) +
    quote.items.reduce((sum, item) => sum + Number(item.discountAmount), 0)
  )
}
