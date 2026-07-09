import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import { FileText, ReceiptText } from 'lucide-react'
import { useMemo, useState } from 'react'
import type {
  FiscalDocument,
  PickupReservation,
  Sale,
  ShippingOrder,
} from '../../api'
import { apiUrl } from '../../api'
import {
  ActionGroup,
  ActionStack,
  InlineNote,
  PageHeader,
  PagePanel,
  ResponsiveTable,
} from '../../components/layout'
import { StatusChip, TableActionButton } from '../../components/ui'
import { usePaginatedRows } from '../../hooks/usePaginatedRows'
import { formatCurrency, formatDateTime } from '../../utils/format'
import {
  fiscalDocumentStatusLabel,
  fiscalDocumentStatusTone,
} from '../finance/fiscalPresentation'
import { SaleReturnForm, type SaleReturnHandler } from './SaleReturnForm'

type SalesHistoryOrigin = 'ALL' | 'PICKUP_RESERVATION' | 'SALE' | 'SHIPPING_ORDER'
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
  sourceId: string
  sourceType: FiscalDocument['sourceType']
  originLabel: string
  clientName: string
  totalAmount: string
  operatorName: string
  completedAt: string
  saleId: string | null
  sale: Sale | null
  fiscalDocument?: FiscalDocument
}

export function SalesHistoryPage({
  fiscalDocuments,
  pickupReservations,
  sales,
  shippingOrders,
  onReturnItem,
}: {
  fiscalDocuments: FiscalDocument[]
  pickupReservations: PickupReservation[]
  sales: Sale[]
  shippingOrders: ShippingOrder[]
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
    [fiscalDocuments, fiscalStatus, origin, pickupReservations, sales, search, shippingOrders],
  )
  const { pagination, visibleItems } = usePaginatedRows(rows)

  return (
    <PagePanel className='min-w-0' wide>
      <PageHeader
        description='Consulte vendas fechadas de balcao, envio e retirada.'
        icon={<ReceiptText size={18} />}
        title='Historico de vendas fechadas'
      />
      <div className='mb-4 rounded-xl border border-[#d8b769]/70 bg-[#fff8e6] p-3 text-sm text-[#2c281e]'>
        <strong className='text-[#203466]'>Comprovante de venda:</strong>{' '}
        use o botao de comprovante para baixar um resumo comercial da venda
        concluida. Este arquivo nao substitui NF-e, NFC-e, DANFE ou XML fiscal.
      </div>

      <div className='mb-4 grid gap-3 md:grid-cols-[minmax(220px,1fr)_190px_190px]'>
        <TextField
          label='Buscar'
          placeholder='Cliente, operador ou codigo'
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
          <MenuItem value='SALE'>Balcao</MenuItem>
          <MenuItem value='SHIPPING_ORDER'>Para envio</MenuItem>
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
            header: 'Data',
            render: (row) => formatDateTime(row.completedAt),
          },
          {
            header: 'Origem',
            render: (row) => (
              <>
                <strong>{row.originLabel}</strong>
                <InlineNote>{row.sourceId}</InlineNote>
              </>
            ),
          },
          {
            header: 'Cliente',
            render: (row) => row.clientName,
          },
          {
            align: 'right',
            header: 'Total',
            render: (row) => formatCurrency(row.totalAmount),
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
            header: 'Acoes',
            render: (row) => (
              <SalesHistoryActions row={row} onReturnItem={onReturnItem} />
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

function SalesHistoryActions({
  row,
  onReturnItem,
}: {
  row: SalesHistoryRow
  onReturnItem: SaleReturnHandler
}) {
  const fiscalLinks = [
    { label: 'DANFE', url: row.fiscalDocument?.pdfUrl },
    { label: 'XML', url: row.fiscalDocument?.xmlUrl },
  ].filter(
    (link): link is { label: 'DANFE' | 'XML'; url: string } =>
      Boolean(link.url),
  )

  return (
    <ActionStack>
      <ActionGroup align='end'>
        {row.saleId ? (
          <TableActionButton
            href={apiUrl(`/sales/${row.saleId}/receipt`)}
            icon={<ReceiptText size={14} />}>
            Comprovante
          </TableActionButton>
        ) : null}
        {fiscalLinks.map((link) => (
          <TableActionButton
            href={fiscalDocumentFileHref(link.url)}
            icon={<FileText size={14} />}
            key={link.label}>
            {link.label}
          </TableActionButton>
        ))}
        {!row.saleId && fiscalLinks.length === 0 ? (
          <InlineNote>Sem arquivos</InlineNote>
        ) : null}
      </ActionGroup>
      {row.sale ? (
        <SaleReturnForm sale={row.sale} onReturnItem={onReturnItem} />
      ) : null}
    </ActionStack>
  )
}

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
    .filter((sale) => sale.status === 'COMPLETED' && !linkedSaleIds.has(sale.id))
    .map((sale): SalesHistoryRow => ({
      clientName: sale.clientName ?? 'Nao identificado',
      completedAt: sale.createdAt,
      fiscalDocument: findFiscalDocument(fiscalDocuments, 'SALE', sale.id),
      id: `SALE-${sale.id}`,
      operatorName: sale.createdByUserName,
      originLabel: 'Balcao',
      sale,
      saleId: sale.id,
      sourceId: sale.id,
      sourceType: 'SALE',
      totalAmount: sale.totalAmount,
    }))
  const shippingRows = shippingOrders
    .filter((order) => order.status === 'COMPLETED')
    .map((order): SalesHistoryRow => ({
      clientName: order.clientName,
      completedAt: order.completedAt ?? order.createdAt,
      fiscalDocument: findFiscalDocument(
        fiscalDocuments,
        'SHIPPING_ORDER',
        order.id,
      ),
      id: `SHIPPING_ORDER-${order.id}`,
      operatorName: order.completedByUserName ?? order.createdByUserName,
      originLabel: 'Para envio',
      sale: findSale(sales, order.saleId),
      saleId: order.saleId,
      sourceId: order.id,
      sourceType: 'SHIPPING_ORDER',
      totalAmount: order.totalAmount,
    }))
  const pickupRows = pickupReservations
    .filter((reservation) => reservation.status === 'COMPLETED')
    .map((reservation): SalesHistoryRow => ({
      clientName: reservation.clientName,
      completedAt: reservation.completedAt ?? reservation.createdAt,
      fiscalDocument: findFiscalDocument(
        fiscalDocuments,
        'PICKUP_RESERVATION',
        reservation.id,
      ),
      id: `PICKUP_RESERVATION-${reservation.id}`,
      operatorName:
        reservation.completedByUserName ?? reservation.createdByUserName,
      originLabel: 'Retirada',
      sale: findSale(sales, reservation.saleId),
      saleId: reservation.saleId,
      sourceId: reservation.id,
      sourceType: 'PICKUP_RESERVATION',
      totalAmount: reservation.totalAmount,
    }))

  return [...directSaleRows, ...shippingRows, ...pickupRows].sort(
    (current, next) =>
      new Date(next.completedAt).getTime() -
      new Date(current.completedAt).getTime(),
  )
}

function findSale(sales: Sale[], saleId: string | null) {
  return saleId ? sales.find((sale) => sale.id === saleId) ?? null : null
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
      [row.clientName, row.operatorName, row.sourceId, row.originLabel].some(
        (value) => value.toLowerCase().includes(normalizedSearch),
      )

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

function fiscalDocumentFileHref(url: string) {
  return url.startsWith('/') ? apiUrl(url) : url
}
