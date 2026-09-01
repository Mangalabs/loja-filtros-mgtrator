import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import { FileText, ReceiptText } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import type {
  FiscalDocument,
  PaymentMethod,
  PickupReservation,
  Sale,
  ShippingOrder,
} from '../../api'
import { downloadApiFile } from '../../api'
import {
  ActionStack,
  InlineNote,
  PageHeader,
  PagePanel,
  ResponsiveTable,
} from '../../components/layout'
import {
  StatusChip,
  TableActionsMenu,
  type TableActionsMenuAction,
} from '../../components/ui'
import { usePaginatedRows } from '../../hooks/usePaginatedRows'
import {
  formatCurrency,
  formatDateTime,
  formatQuantity,
} from '../../utils/format'
import {
  fiscalDocumentStatusLabel,
  fiscalDocumentStatusTone,
} from '../finance/fiscalPresentation'
import { SaleReturnForm, type SaleReturnHandler } from './SaleReturnForm'

type SalesHistoryOrigin =
  | 'ALL'
  | 'PICKUP_RESERVATION'
  | 'SALE'
  | 'SHIPPING_ORDER'
type SalesHistoryFiscalFilter =
  | 'ALL'
  | 'AUTHORIZED'
  | 'CANCELLED'
  | 'MISSING'
  | 'PENDING'
  | 'PROCESSING'
  | 'REJECTED'

type SalesHistoryRow = {
  id: string
  saleNumber: number | null
  sourceId: string
  sourceType: FiscalDocument['sourceType']
  originLabel: string
  clientName: string
  totalAmount: string
  refundAmount: number
  netAmount: number
  operatorName: string
  completedAt: string
  saleId: string | null
  sale: Sale | null
  fiscalDocument?: FiscalDocument
}

export type SaleCommercialDetailsHandler = (
  event: FormEvent<HTMLFormElement>,
  sale: Sale,
) => Promise<boolean | void> | boolean | void

export type SaleStatusActionHandler = (
  sale: Sale,
) => Promise<boolean | void> | boolean | void

export function SalesHistoryPage({
  fiscalDocuments = [],
  paymentMethods = [],
  pickupReservations = [],
  sales = [],
  shippingOrders = [],
  onCompleteReopenedSale,
  onReopenSale,
  onUpdateSaleCommercialDetails,
  onReturnItem,
}: {
  fiscalDocuments: FiscalDocument[]
  paymentMethods: PaymentMethod[]
  pickupReservations: PickupReservation[]
  sales: Sale[]
  shippingOrders: ShippingOrder[]
  onCompleteReopenedSale: SaleStatusActionHandler
  onReopenSale: SaleStatusActionHandler
  onUpdateSaleCommercialDetails: SaleCommercialDetailsHandler
  onReturnItem: SaleReturnHandler
}) {
  const [search, setSearch] = useState('')
  const [origin, setOrigin] = useState<SalesHistoryOrigin>('ALL')
  const [fiscalStatus, setFiscalStatus] =
    useState<SalesHistoryFiscalFilter>('ALL')
  const rows = useMemo(
    () =>
      filterSalesHistoryRows(
        buildSalesHistoryRows({
          fiscalDocuments,
          pickupReservations,
          sales,
          shippingOrders,
        }),
        { fiscalStatus, origin, search },
      ),
    [
      fiscalDocuments,
      fiscalStatus,
      origin,
      pickupReservations,
      sales,
      search,
      shippingOrders,
    ],
  )
  const { pagination, visibleItems } = usePaginatedRows(rows)

  return (
    <PagePanel className='min-w-0' wide>
      <PageHeader
        description='Consulte vendas fechadas diretas, com envio e retirada.'
        icon={<ReceiptText size={18} />}
        title='Histórico de vendas fechadas'
      />
      <div className='mb-4 rounded-xl border border-[#d8b769]/70 bg-[#fff8e6] p-3 text-sm text-[#2c281e]'>
        <strong className='text-[#203466]'>Comprovante de venda:</strong> use o
        botão de comprovante para baixar um resumo comercial da venda concluída.
        Este arquivo não substitui NF-e, NFC-e, DANFE ou XML fiscal.
      </div>

      <div className='mb-4 grid gap-3 md:grid-cols-[minmax(220px,1fr)_190px_190px]'>
        <TextField
          label='Buscar'
          placeholder='Cliente, operador ou código'
          size='small'
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <TextField
          label='Origem'
          select
          size='small'
          value={origin}
          onChange={(event) =>
            setOrigin(event.target.value as SalesHistoryOrigin)
          }>
          <MenuItem value='ALL'>Todas</MenuItem>
          <MenuItem value='SALE'>Venda direta</MenuItem>
          <MenuItem value='SHIPPING_ORDER'>Com envio</MenuItem>
          <MenuItem value='PICKUP_RESERVATION'>Retirada</MenuItem>
        </TextField>
        <TextField
          label='NF-e'
          select
          size='small'
          value={fiscalStatus}
          onChange={(event) =>
            setFiscalStatus(event.target.value as SalesHistoryFiscalFilter)
          }>
          <MenuItem value='ALL'>Todas</MenuItem>
          <MenuItem value='MISSING'>Sem NF-e</MenuItem>
          <MenuItem value='AUTHORIZED'>Autorizadas</MenuItem>
          <MenuItem value='CANCELLED'>Canceladas</MenuItem>
          <MenuItem value='PENDING'>Pendentes</MenuItem>
          <MenuItem value='PROCESSING'>Processando</MenuItem>
          <MenuItem value='REJECTED'>Rejeitadas</MenuItem>
        </TextField>
      </div>

      <ResponsiveTable
        columns={[
          {
            header: 'Nº da venda',
            render: (row) => row.saleNumber ?? '-',
          },
          {
            header: 'Data',
            render: (row) => formatDateTime(row.completedAt),
          },
          {
            header: 'Cliente',
            render: (row) => row.clientName,
          },
          {
            align: 'right',
            header: 'Total',
            render: (row) => <SalesHistoryTotal row={row} />,
          },
          {
            header: 'NF-e',
            render: (row) => <SalesHistoryFiscalStatus row={row} />,
          },
          {
            header: 'Operador',
            render: (row) => row.operatorName,
          },
          {
            align: 'right',
            header: 'Ações',
            render: (row) => (
              <SalesHistoryActions
                onCompleteReopenedSale={onCompleteReopenedSale}
                onReopenSale={onReopenSale}
                paymentMethods={paymentMethods}
                row={row}
                onUpdateSaleCommercialDetails={onUpdateSaleCommercialDetails}
                onReturnItem={onReturnItem}
              />
            ),
          },
        ]}
        emptyMessage='Nenhuma venda fechada encontrada.'
        getRowId={(row) => row.id}
        items={visibleItems}
        pagination={pagination}
      />
    </PagePanel>
  )
}

function SalesHistoryFiscalStatus({ row }: { row: SalesHistoryRow }) {
  if (row.sale?.status === 'OPEN') {
    return (
      <>
        <StatusChip label='Aberta para correção' tone='warning' />
        <InlineNote>Conclua a venda para emitir NF-e.</InlineNote>
      </>
    )
  }

  return row.fiscalDocument ? (
    <>
      <StatusChip
        label={fiscalDocumentStatusLabel(row.fiscalDocument.status)}
        tone={fiscalDocumentStatusTone(row.fiscalDocument.status)}
      />
      <InlineNote>
        {row.fiscalDocument.number
          ? `NF-e #${row.fiscalDocument.number}`
          : 'Sem numero'}
      </InlineNote>
    </>
  ) : (
    <StatusChip label='Sem NF-e' tone='neutral' />
  )
}

function SalesHistoryTotal({ row }: { row: SalesHistoryRow }) {
  return row.refundAmount > 0 ? (
    <>
      <strong>{formatCurrency(row.netAmount)}</strong>
      <InlineNote>
        Original {formatCurrency(row.totalAmount)} | Estornos{' '}
        {formatCurrency(row.refundAmount)}
      </InlineNote>
    </>
  ) : (
    formatCurrency(row.totalAmount)
  )
}

function SalesHistoryActions({
  onCompleteReopenedSale,
  onReopenSale,
  paymentMethods,
  row,
  onUpdateSaleCommercialDetails,
  onReturnItem,
}: {
  onCompleteReopenedSale: SaleStatusActionHandler
  onReopenSale: SaleStatusActionHandler
  paymentMethods: PaymentMethod[]
  row: SalesHistoryRow
  onUpdateSaleCommercialDetails: SaleCommercialDetailsHandler
  onReturnItem: SaleReturnHandler
}) {
  const [showReturnForm, setShowReturnForm] = useState(false)
  const [showCommercialDetailsForm, setShowCommercialDetailsForm] =
    useState(false)
  const fiscalDocumentBlocksReturn = Boolean(
    row.fiscalDocument &&
    returnBlockingFiscalStatuses.includes(row.fiscalDocument.status),
  )
  const fiscalLinks = [
    { fileType: 'danfe', label: 'DANFE', url: row.fiscalDocument?.pdfUrl },
    { fileType: 'xml', label: 'XML', url: row.fiscalDocument?.xmlUrl },
  ].filter(
    (link): link is {
      fileType: 'danfe' | 'xml'
      label: 'DANFE' | 'XML'
      url: string
    } => Boolean(link.url),
  )
  const actions: TableActionsMenuAction[] = [
    ...fiscalLinks.map((link) => ({
      icon: <FileText size={14} />,
      label: `Baixar ${link.label}`,
      onSelect: () =>
        row.fiscalDocument &&
        void downloadApiFile(
          `/fiscal-documents/${row.fiscalDocument.id}/files/${link.fileType}`,
          fiscalDocumentDownloadName(row.fiscalDocument, link.label),
        ),
    })),
  ]

  row.saleId &&
    row.sale?.status === 'COMPLETED' &&
    actions.unshift({
      icon: <ReceiptText size={14} />,
      label: 'Baixar comprovante',
      onSelect: () =>
        void downloadApiFile(
          `/sales/${row.saleId}/receipt`,
          `comprovante-${row.saleId}.pdf`,
        ),
    })

  row.sale?.status === 'COMPLETED' &&
    actions.push({
      disabled: fiscalDocumentBlocksReturn,
      label: 'Reabrir venda',
      onSelect: () => void onReopenSale(row.sale as Sale),
    })

  row.sale?.status === 'OPEN' &&
    actions.push({
      label: 'Concluir venda',
      onSelect: () => void onCompleteReopenedSale(row.sale as Sale),
    })

  row.sale &&
    actions.push({
      disabled: fiscalDocumentBlocksReturn,
      label: 'Corrigir pagamento e fatura',
      onSelect: () => setShowCommercialDetailsForm(true),
    })

  row.sale?.status === 'COMPLETED' &&
    actions.push({
      disabled: fiscalDocumentBlocksReturn,
      label: 'Registrar devolucao',
      onSelect: () => setShowReturnForm(true),
    })

  return (
    <ActionStack>
      <div className='flex justify-end'>
        <TableActionsMenu actions={actions} />
      </div>
      {showCommercialDetailsForm && row.sale && !fiscalDocumentBlocksReturn ? (
        <SaleCommercialDetailsForm
          onCancel={() => setShowCommercialDetailsForm(false)}
          paymentMethods={paymentMethods}
          sale={row.sale}
          onUpdateSaleCommercialDetails={onUpdateSaleCommercialDetails}
        />
      ) : null}
      {showReturnForm && row.sale && !fiscalDocumentBlocksReturn ? (
        <SaleReturnForm
          onCancel={() => setShowReturnForm(false)}
          paymentMethods={paymentMethods}
          sale={row.sale}
          onReturnItem={onReturnItem}
        />
      ) : null}
      {row.sale && fiscalDocumentBlocksReturn ? (
        <InlineNote>
          Cancele a NF-e antes de editar dados comerciais ou devolver itens.
        </InlineNote>
      ) : null}
      {row.sale?.status === 'OPEN' ? (
        <InlineNote>
          Venda aberta para correção. Conclua novamente antes de emitir NF-e.
        </InlineNote>
      ) : null}
      {!row.saleId && fiscalLinks.length === 0 ? (
        <InlineNote>Sem arquivos</InlineNote>
      ) : null}
      {row.sale?.status === 'COMPLETED' ? (
        <SaleReturnSummary sale={row.sale} />
      ) : null}
    </ActionStack>
  )
}

function SaleCommercialDetailsForm({
  paymentMethods,
  sale,
  onCancel,
  onUpdateSaleCommercialDetails,
}: {
  paymentMethods: PaymentMethod[]
  sale: Sale
  onCancel: () => void
  onUpdateSaleCommercialDetails: SaleCommercialDetailsHandler
}) {
  const [payments, setPayments] = useState(() => saleCommercialPaymentDrafts(sale))
  const availablePaymentMethods = paymentMethods.filter(
    (method) =>
      method.active ||
      payments.some((payment) => payment.paymentMethodId === method.id),
  )
  const paymentTotal = saleCommercialPaymentTotal(payments)
  const difference = Number((Number(sale.totalAmount) - paymentTotal).toFixed(2))
  const hasPaymentDifference = Math.abs(difference) >= 0.01

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const saved = await onUpdateSaleCommercialDetails(event, sale)

    if (saved !== false) {
      onCancel()
    }
  }

  return (
    <form
      className='grid gap-3 rounded-xl border border-[#d8b769]/60 bg-white p-3 text-left'
      onSubmit={(event) => void handleSubmit(event)}>
      <strong className='text-sm text-[#203466]'>
        Corrigir pagamento e fatura
      </strong>
      <div className='grid gap-2'>
        {payments.map((payment, index) => (
          <div className='grid gap-2 sm:grid-cols-[1fr_120px_auto]' key={index}>
            <TextField
              label={`Pagamento ${index + 1}`}
              name='saleCommercialPaymentMethodId'
              onChange={(event) =>
                setPayments((currentPayments) =>
                  updateSaleCommercialPayment(currentPayments, index, {
                    paymentMethodId: event.target.value,
                  }),
                )
              }
              required
              select
              size='small'
              value={payment.paymentMethodId}>
              <MenuItem value='' disabled>
                Pagamento
              </MenuItem>
              {availablePaymentMethods.map((method) => (
                <MenuItem key={method.id} value={method.id}>
                  {method.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label='Valor'
              name='saleCommercialPaymentAmount'
              onChange={(event) =>
                setPayments((currentPayments) =>
                  updateSaleCommercialPayment(currentPayments, index, {
                    amount: event.target.value,
                  }),
                )
              }
              required
              size='small'
              slotProps={{ htmlInput: { min: '0.01', step: '0.01' } }}
              type='number'
              value={payment.amount}
            />
            {payments.length > 1 ? (
              <Button
                color='inherit'
                size='small'
                type='button'
                onClick={() =>
                  setPayments((currentPayments) =>
                    currentPayments.filter(
                      (_payment, paymentIndex) => paymentIndex !== index,
                    ),
                  )
                }>
                Remover
              </Button>
            ) : null}
          </div>
        ))}
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <Button
            color='inherit'
            size='small'
            type='button'
            onClick={() =>
              setPayments((currentPayments) => [
                ...currentPayments,
                { amount: '', paymentMethodId: '' },
              ])
            }>
            Adicionar forma
          </Button>
          <InlineNote>
            Pagamentos {formatCurrency(paymentTotal)} | Diferença{' '}
            {formatCurrency(Math.abs(difference))}
          </InlineNote>
        </div>
      </div>
      <TextField
        defaultValue={sale.billingIssueDate?.slice(0, 10) ?? ''}
        label='Data da fatura'
        name='saleBillingIssueDate'
        size='small'
        slotProps={{ inputLabel: { shrink: true } }}
        type='date'
      />
      <TextField
        defaultValue={sale.billingDueDate?.slice(0, 10) ?? ''}
        label='Vencimento do boleto/fatura'
        name='saleBillingDueDate'
        size='small'
        slotProps={{ inputLabel: { shrink: true } }}
        type='date'
      />
      <div className='flex flex-wrap justify-end gap-2'>
        <Button color='inherit' size='small' type='button' onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          disabled={hasPaymentDifference}
          size='small'
          type='submit'
          variant='contained'>
          Salvar
        </Button>
      </div>
    </form>
  )
}

type SaleCommercialPaymentDraft = {
  amount: string
  paymentMethodId: string
}

function saleCommercialPaymentDrafts(sale: Sale): SaleCommercialPaymentDraft[] {
  const payments = Array.isArray(sale.payments) ? sale.payments : []

  return payments.length
    ? payments.map((payment) => ({
        amount: String(payment.amount),
        paymentMethodId: payment.paymentMethodId,
      }))
    : [{ amount: String(sale.totalAmount), paymentMethodId: '' }]
}

function updateSaleCommercialPayment(
  payments: SaleCommercialPaymentDraft[],
  index: number,
  changes: Partial<SaleCommercialPaymentDraft>,
) {
  return payments.map((payment, paymentIndex) =>
    paymentIndex === index ? { ...payment, ...changes } : payment,
  )
}

function saleCommercialPaymentTotal(payments: SaleCommercialPaymentDraft[]) {
  return Number(
    payments
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
      .toFixed(2),
  )
}

function SaleReturnSummary({ sale }: { sale: Sale }) {
  const returns = saleItems(sale).flatMap((item) =>
    saleItemReturns(item).map((itemReturn) => ({
      ...itemReturn,
      productName: item.productName,
    })),
  )

  return returns.length > 0 ? (
    <div className='grid gap-1 rounded-lg border border-[#e4e9e5] bg-[#fbfcfb] p-2 text-left'>
      <strong className='text-xs uppercase tracking-wide text-[#203466]'>
        Estornos registrados
      </strong>
      {returns.map((itemReturn) => (
        <div className='text-xs text-[#2c281e]' key={itemReturn.id}>
          <strong>{itemReturn.productName}</strong> | Qtd.{' '}
          {formatQuantity(itemReturn.quantity)} |{' '}
          {formatCurrency(itemReturn.refundAmount)} via{' '}
          {itemReturn.refundPaymentMethodName}
          <InlineNote>
            {formatDateTime(itemReturn.refundedAt)}
            {itemReturn.refundReference
              ? ` | Ref. ${itemReturn.refundReference}`
              : ''}
          </InlineNote>
        </div>
      ))}
    </div>
  ) : null
}

const returnBlockingFiscalStatuses: FiscalDocument['status'][] = [
  'AUTHORIZED',
  'PENDING',
  'PROCESSING',
]

function buildSalesHistoryRows({
  fiscalDocuments,
  pickupReservations,
  sales,
  shippingOrders,
}: {
  fiscalDocuments: FiscalDocument[]
  pickupReservations: PickupReservation[]
  sales: Sale[]
  shippingOrders: ShippingOrder[]
}) {
  const linkedSaleIds = new Set([
    ...shippingOrders.flatMap((order) => (order.saleId ? [order.saleId] : [])),
    ...pickupReservations.flatMap((reservation) =>
      reservation.saleId ? [reservation.saleId] : [],
    ),
  ])
  const directSaleRows = sales
    .filter(
      (sale) => sale.status !== 'CANCELLED' && !linkedSaleIds.has(sale.id),
    )
    .map(
      (sale): SalesHistoryRow => ({
        clientName: sale.clientName ?? 'Nao identificado',
        completedAt: sale.createdAt,
        fiscalDocument: findFiscalDocument(fiscalDocuments, 'SALE', sale.id),
        id: `SALE-${sale.id}`,
        netAmount: saleNetAmount(sale, sale.totalAmount),
        operatorName: sale.createdByUserName,
        originLabel: 'Venda direta',
        refundAmount: saleRefundAmount(sale),
        sale,
        saleId: sale.id,
        saleNumber: sale.saleNumber,
        sourceId: sale.id,
        sourceType: 'SALE',
        totalAmount: sale.totalAmount,
      }),
    )
  const shippingRows = shippingOrders
    .filter((order) => order.status === 'COMPLETED')
    .map((order): SalesHistoryRow => {
      const sale = findSale(sales, order.saleId)

      return {
        clientName: order.clientName,
        completedAt: order.completedAt ?? order.createdAt,
        fiscalDocument: findFiscalDocument(
          fiscalDocuments,
          'SHIPPING_ORDER',
          order.id,
        ),
        id: `SHIPPING_ORDER-${order.id}`,
        netAmount: saleNetAmount(sale, order.totalAmount),
        operatorName: order.completedByUserName ?? order.createdByUserName,
        originLabel: 'Com envio',
        refundAmount: saleRefundAmount(sale),
        sale,
        saleId: order.saleId,
        saleNumber: sale?.saleNumber ?? null,
        sourceId: order.id,
        sourceType: 'SHIPPING_ORDER',
        totalAmount: order.totalAmount,
      }
    })
  const pickupRows = pickupReservations
    .filter((reservation) => reservation.status === 'COMPLETED')
    .map((reservation): SalesHistoryRow => {
      const sale = findSale(sales, reservation.saleId)

      return {
        clientName: reservation.clientName,
        completedAt: reservation.completedAt ?? reservation.createdAt,
        fiscalDocument: findFiscalDocument(
          fiscalDocuments,
          'PICKUP_RESERVATION',
          reservation.id,
        ),
        id: `PICKUP_RESERVATION-${reservation.id}`,
        netAmount: saleNetAmount(sale, reservation.totalAmount),
        operatorName:
          reservation.completedByUserName ?? reservation.createdByUserName,
        originLabel: 'Retirada',
        refundAmount: saleRefundAmount(sale),
        sale,
        saleId: reservation.saleId,
        saleNumber: sale?.saleNumber ?? null,
        sourceId: reservation.id,
        sourceType: 'PICKUP_RESERVATION',
        totalAmount: reservation.totalAmount,
      }
    })

  return [...directSaleRows, ...shippingRows, ...pickupRows].sort(
    (current, next) =>
      new Date(next.completedAt).getTime() -
      new Date(current.completedAt).getTime(),
  )
}

function findSale(sales: Sale[], saleId: string | null) {
  return saleId ? (sales.find((sale) => sale.id === saleId) ?? null) : null
}

function saleRefundAmount(sale: Sale | null) {
  return saleItems(sale).reduce(
    (total, item) =>
      total +
      saleItemReturns(item).reduce(
        (itemTotal, itemReturn) => itemTotal + Number(itemReturn.refundAmount),
        0,
      ),
    0,
  )
}

function saleItems(sale: Sale | null) {
  return Array.isArray(sale?.items) ? sale.items : []
}

function saleItemReturns(item: Sale['items'][number]) {
  return Array.isArray(item.returns) ? item.returns : []
}

function saleNetAmount(sale: Sale | null, fallbackTotalAmount: string) {
  return Math.max(Number(fallbackTotalAmount) - saleRefundAmount(sale), 0)
}

function filterSalesHistoryRows(
  rows: SalesHistoryRow[],
  filters: {
    fiscalStatus: SalesHistoryFiscalFilter
    origin: SalesHistoryOrigin
    search: string
  },
) {
  const normalizedSearch = filters.search.trim().toLowerCase()

  return rows.filter((row) => {
    const matchesOrigin =
      filters.origin === 'ALL' || row.sourceType === filters.origin
    const matchesFiscalStatus =
      filters.fiscalStatus === 'ALL' ||
      (filters.fiscalStatus === 'MISSING'
        ? !row.fiscalDocument
        : row.fiscalDocument?.status === filters.fiscalStatus)
    const matchesSearch =
      !normalizedSearch ||
      [
        row.clientName,
        row.operatorName,
        row.sourceId,
        row.originLabel,
        row.saleNumber ? String(row.saleNumber) : '',
      ].some((value) => value.toLowerCase().includes(normalizedSearch))

    return matchesOrigin && matchesFiscalStatus && matchesSearch
  })
}

function findFiscalDocument(
  fiscalDocuments: FiscalDocument[],
  sourceType: FiscalDocument['sourceType'],
  sourceId: string,
) {
  return fiscalDocuments.find(
    (document) =>
      document.sourceType === sourceType && document.sourceId === sourceId,
  )
}

function fiscalDocumentDownloadName(
  document: FiscalDocument,
  label: 'DANFE' | 'XML',
) {
  const extensionByLabel = {
    DANFE: 'pdf',
    XML: 'xml',
  }
  const reference = document.providerReference ?? document.id

  return `${reference}.${extensionByLabel[label]}`
}
