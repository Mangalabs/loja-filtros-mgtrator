import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import { List as ListIcon, Plus } from 'lucide-react'
import { FormEvent, useState } from 'react'
import type { Client, Product, Quote } from '../../api'
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
} from '../../components/ui'
import { usePaginatedRows } from '../../hooks/usePaginatedRows'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format'

type QuoteDraftItem = {
  productId: string
  description: string
  quantity: string
  unitPrice: string
}

export type QuoteDraftInput = {
  clientId: string
  validUntil?: string | null
  notes?: string | null
  showBrand?: boolean
  items: Array<{
    productId: string
    description?: string | null
    quantity: number
    unitPrice?: number | null
  }>
}

export function QuotesPage({
  clients,
  products,
  quotes,
  onSubmit,
  onCancelQuote,
  onCreateShippingOrder,
}: {
  clients: Client[]
  products: Product[]
  quotes: Quote[]
  onSubmit: (input: QuoteDraftInput) => Promise<boolean>
  onCancelQuote: (event: FormEvent<HTMLFormElement>, quote: Quote) => void
  onCreateShippingOrder: (quote: Quote) => void
}) {
  const [clientId, setClientId] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')
  const [showBrand, setShowBrand] = useState(true)
  const [items, setItems] = useState<QuoteDraftItem[]>([emptyQuoteItem()])
  const { pagination, visibleItems } = usePaginatedRows<Quote>(quotes)
  const activeProducts = products.filter((product) => product.active)
  const quoteTotal = items.reduce((sum, item) => {
    return sum + Number(item.quantity || 0) * Number(item.unitPrice || 0)
  }, 0)

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
              product?.description ?? product?.name ?? item.description,
            unitPrice: product?.salePrice ?? item.unitPrice,
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
    setValidUntil('')
    setNotes('')
    setShowBrand(true)
    setItems([emptyQuoteItem()])
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const saved = await onSubmit({
      clientId,
      validUntil: validUntil || null,
      notes: notes.trim() || null,
      showBrand,
      items: items.map((item) => ({
        productId: item.productId,
        description: item.description.trim() || null,
        quantity: Number(item.quantity),
        unitPrice: item.unitPrice === '' ? null : Number(item.unitPrice),
      })),
    })

    if (saved) {
      resetQuoteForm()
    }
  }

  return (
    <section className='grid items-start gap-4 xl:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)]'>
      <FormGrid className='gap-5 sm:gap-6' onSubmit={submit}>
        <PageHeader
          description='Monte itens, valores e dados comerciais antes do PDF.'
          icon={<ListIcon size={18} />}
          title='Novo orcamento'
        />
        <TextField
          label='Cliente'
          select
          size='medium'
          value={clientId || ''}
          onChange={(event) => setClientId(event.target.value)}
          required>
          <MenuItem value='' disabled>
            Cliente
          </MenuItem>
          {clients
            .filter((client) => client.active)
            .map((client) => (
              <MenuItem key={client.id} value={client.id}>
                {client.name}
                {client.phone ? ` - ${client.phone}` : ''}
              </MenuItem>
            ))}
        </TextField>
        <FormRow>
          <TextField
            label='Validade'
            size='medium'
            type='date'
            value={validUntil}
            onChange={(event) => setValidUntil(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            disabled
            label='Total'
            size='medium'
            value={formatCurrency(quoteTotal)}
          />
        </FormRow>
        <TextField
          label='Observacoes do orcamento'
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
                onChange={(productId) => updateItem(index, { productId })}
              />
              <TextField
                label='Descricao comercial'
                value={item.description}
                size='medium'
                onChange={(event) =>
                  updateItem(index, { description: event.target.value })
                }
                slotProps={{ htmlInput: { maxLength: 500 } }}
                required
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
                  slotProps={{ htmlInput: { min: '0.001', step: '0.001' } }}
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
            </FormCard>
          ))}
        </div>

        <ActionGroup className='pt-1'>
          <SecondaryButton
            type='button'
            onClick={() =>
              setItems((currentItems) => [...currentItems, emptyQuoteItem()])
            }>
            Adicionar item
          </SecondaryButton>
          <PrimaryButton icon={<Plus size={17} />} type='submit'>
            Salvar orcamento
          </PrimaryButton>
        </ActionGroup>
      </FormGrid>

      <PagePanel wide>
        <PageHeader
          actions={<StatusChip label='PDF disponivel' tone='success' />}
          description={`${quotes.length} registros`}
          title='Orcamentos salvos'
        />
        <ResponsiveTable
          columns={[
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
              header: 'Validade',
              render: (quote) =>
                quote.validUntil ? formatDate(quote.validUntil) : '-',
            },
            {
              header: 'Total',
              render: (quote) => formatCurrency(quote.totalAmount),
            },
            {
              header: 'Status',
              render: (quote) => <QuoteStatusSummary quote={quote} />,
            },
            {
              header: 'Acoes',
              render: (quote) => (
                <QuoteActions
                  quote={quote}
                  onCancelQuote={onCancelQuote}
                  onCreateShippingOrder={onCreateShippingOrder}
                />
              ),
            },
          ]}
          emptyMessage='Nenhum orcamento salvo.'
          getRowId={(quote) => quote.id}
          items={visibleItems}
          pagination={pagination}
        />
      </PagePanel>
    </section>
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
  onCancelQuote,
  onCreateShippingOrder,
}: {
  quote: Quote
  onCancelQuote: (event: FormEvent<HTMLFormElement>, quote: Quote) => void
  onCreateShippingOrder: (quote: Quote) => void
}) {
  if (quote.shippingOrderId) {
    return (
      <ActionStack>
        <ActionGroup>
          <TableActionButton href={`/api/quotes/${quote.id}/pdf`}>
            Baixar PDF
          </TableActionButton>
        </ActionGroup>
        <InlineNote>Pedido para envio criado</InlineNote>
      </ActionStack>
    )
  }

  if (quote.status !== 'DRAFT') {
    return (
      <ActionStack>
        <ActionGroup>
          <TableActionButton href={`/api/quotes/${quote.id}/pdf`}>
            Baixar PDF
          </TableActionButton>
        </ActionGroup>
        <InlineNote>Orcamento cancelado</InlineNote>
      </ActionStack>
    )
  }

  return (
    <ActionStack>
      <ActionGroup>
        <TableActionButton href={`/api/quotes/${quote.id}/pdf`}>
          Baixar PDF
        </TableActionButton>
        <TableActionButton
          type='button'
          onClick={() => onCreateShippingOrder(quote)}>
          Enviar p/ envio
        </TableActionButton>
      </ActionGroup>
      <form
        className='grid gap-2'
        onSubmit={(event) => onCancelQuote(event, quote)}>
        <TextField
          label='Motivo do cancelamento'
          name='quoteCancellationReason'
          size='small'
          slotProps={{ htmlInput: { maxLength: 500 } }}
          required
        />
        <ActionGroup>
          <TableActionButton type='submit'>Cancelar</TableActionButton>
        </ActionGroup>
      </form>
    </ActionStack>
  )
}

const quoteShippingStatusLabels: Record<
  NonNullable<Quote['shippingOrderStatus']>,
  string
> = {
  APPROVED: 'Envio aprovado',
  CANCELLED: 'Envio cancelado',
  COMPLETED: 'Venda concluida',
  QUOTED: 'Enviado p/ envio',
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
  }
}
