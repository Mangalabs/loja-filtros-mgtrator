import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import {
  CreditCard,
  FileText,
  History,
  Package,
  PackagePlus,
  Paperclip,
  Plus,
  ReceiptText,
  Send,
  ShoppingCart,
  User,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type {
  CashRegisterSession,
  Client,
  FiscalDocument,
  PaymentMethod,
  PickupReservation,
  Product,
  Sale,
  ShippingOrder,
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
  type StatusTone,
  type TableActionsMenuAction,
} from '../../components/ui'
import { usePaginatedRows } from '../../hooks/usePaginatedRows'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatQuantity,
} from '../../utils/format'
import { SaleReturnForm, type SaleReturnHandler } from './SaleReturnForm'
import { salePaymentsAllowBilling } from './saleBilling'
import {
  SaleCommercialDetailsForm,
  type SaleCommercialDetailsHandler,
} from './SalesHistoryPage'

type SaleDraftItem = {
  productId: string
  quantity: string
}

type ShippingOrderStatusFilter = ShippingOrder['status'] | 'ALL'
type PickupReservationStatusFilter = PickupReservation['status'] | 'ALL'

type PickupReservationDraftItem = {
  productId: string
  quantity: string
}

export type SalePaymentDraft = {
  paymentMethodId: string
  amount: string
}

export type SaleDraftInput = {
  clientId?: string | null
  billingIssueDate?: string | null
  billingDueDate?: string | null
  discountAmount: number
  allowInsufficientStock?: boolean
  paymentMethodId?: string
  payments: Array<{
    paymentMethodId: string
    amount: number
  }>
  items: Array<{
    productId: string
    quantity: number
    unitPrice?: number
    discountAmount?: number
  }>
}

export type PickupReservationDraftInput = {
  clientId: string
  allowInsufficientStock?: boolean
  items: Array<{
    productId: string
    quantity: number
  }>
}

export function SalesPage({
  cashRegister,
  clients,
  embedded = false,
  excludedSaleIds = [],
  fiscalDocuments = [],
  paymentMethods,
  products,
  sales,
  onCompleteReopenedSale,
  onEditSale,
  onOpenSalesHistory,
  onOpenSaleFiscalQueue,
  onReturnItem,
  onSubmit,
  onUpdateSaleCommercialDetails,
}: {
  cashRegister: CashRegisterSession | null
  clients: Client[]
  embedded?: boolean
  excludedSaleIds?: string[]
  fiscalDocuments?: FiscalDocument[]
  paymentMethods: PaymentMethod[]
  products: Product[]
  sales: Sale[]
  onCompleteReopenedSale?: (sale: Sale) => void
  onEditSale?: (sale: Sale) => void
  onOpenSalesHistory: () => void
  onOpenSaleFiscalQueue?: (sale: Sale) => void
  onReturnItem?: SaleReturnHandler
  onSubmit: (input: SaleDraftInput) => Promise<boolean>
  onUpdateSaleCommercialDetails?: SaleCommercialDetailsHandler
}) {
  const [clientId, setClientId] = useState('')
  const [billingIssueDate, setBillingIssueDate] = useState('')
  const [billingDueDate, setBillingDueDate] = useState('')
  const [discountAmount, setDiscountAmount] = useState('')
  const [showSaleForm, setShowSaleForm] = useState(!embedded)
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<SaleDetail>()
  const [directSaleFiscalFilter, setDirectSaleFiscalFilter] =
    useState<DirectSaleFiscalFilter>('ALL')
  const [directSaleSearch, setDirectSaleSearch] = useState('')
  const [directSaleStatusFilter, setDirectSaleStatusFilter] =
    useState<DirectSaleStatusFilter>('ALL')
  const [payments, setPayments] = useState<SalePaymentDraft[]>([
    emptySalePayment(),
  ])
  const paymentAllowsBilling = salePaymentsAllowBilling(
    paymentMethods,
    payments,
  )
  const [items, setItems] = useState<SaleDraftItem[]>([emptySaleItem()])
  const activeProducts = products.filter((product) => product.active)
  const allDirectSales = useMemo(() => {
    const excludedIds = new Set(excludedSaleIds)

    return sales
      .filter((sale) => !excludedIds.has(sale.id))
      .sort(
        (current, next) =>
          new Date(next.createdAt).getTime() -
          new Date(current.createdAt).getTime(),
      )
  }, [excludedSaleIds, sales])
  const directSales = useMemo(
    () =>
      allDirectSales.filter((sale) =>
        directSaleMatchesFilters(sale, {
          fiscalDocument: directSaleFiscalDocument(fiscalDocuments, sale),
          fiscalStatus: directSaleFiscalFilter,
          search: directSaleSearch,
          status: directSaleStatusFilter,
        }),
      ),
    [
      allDirectSales,
      directSaleFiscalFilter,
      directSaleSearch,
      directSaleStatusFilter,
      fiscalDocuments,
    ],
  )
  const {
    pagination: directSalePagination,
    visibleItems: visibleDirectSales,
  } = usePaginatedRows<Sale>(
    directSales,
    [
      directSaleFiscalFilter,
      directSaleSearch,
      directSaleStatusFilter,
      excludedSaleIds.join('|'),
    ].join('|'),
  )
  const saleSubtotal = items.reduce((sum, item) => {
    const product = activeProducts.find(
      (currentProduct) => currentProduct.id === item.productId,
    )
    return sum + Number(item.quantity || 0) * Number(product?.salePrice ?? 0)
  }, 0)
  const saleDiscount = moneyInputValue(discountAmount)
  const discountExceedsSubtotal = saleDiscount > saleSubtotal
  const saleTotal = Math.max(saleSubtotal - saleDiscount, 0)
  const saleAllowsBilling = salePaymentsAllowBilling(paymentMethods, payments)

  useEffect(() => {
    if (saleAllowsBilling) {
      return
    }

    setBillingIssueDate('')
    setBillingDueDate('')
  }, [saleAllowsBilling])

  function updateItem(index: number, changes: Partial<SaleDraftItem>) {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    )
  }

  function removeItem(index: number) {
    setItems((currentItems) =>
      currentItems.filter((_item, itemIndex) => itemIndex !== index),
    )
  }

  function resetForm() {
    setClientId('')
    setBillingIssueDate('')
    setBillingDueDate('')
    setDiscountAmount('')
    setPayments([emptySalePayment()])
    setItems([emptySaleItem()])
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const saved = await onSubmit({
      clientId: clientId || null,
      billingIssueDate: saleAllowsBilling ? billingIssueDate || null : null,
      billingDueDate: saleAllowsBilling ? billingDueDate || null : null,
      discountAmount: saleDiscount,
      paymentMethodId: payments[0]?.paymentMethodId,
      payments: salePaymentPayloads(payments, saleTotal),
      items: items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      })),
    })

    saved && resetForm()
    embedded && saved && setShowSaleForm(false)
  }

  return (
    <section
      className={
        embedded
          ? 'grid items-start gap-4'
          : 'grid items-start gap-4 xl:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)]'
      }>
      {showSaleForm ? (
      <FormGrid className='gap-5 sm:gap-6' onSubmit={submit}>
        <PageHeader
          description='Monte uma venda direta com um ou mais itens.'
          icon={<ShoppingCart size={18} />}
          title='Nova venda direta'
        />
        {!cashRegister ? (
          <Alert severity='warning' variant='outlined'>
            Abra o caixa antes de registrar vendas.
          </Alert>
        ) : null}

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
                disabled={!cashRegister}
                label='Produto'
                name={`saleItems.${index}.productId`}
                products={activeProducts}
                required
                stockLabel='available'
                value={item.productId}
                onChange={(productId) => updateItem(index, { productId })}
              />
              <TextField
                label='Quantidade'
                value={item.quantity}
                type='number'
                size='medium'
                required
                disabled={!cashRegister}
                onChange={(event) =>
                  updateItem(index, { quantity: event.target.value })
                }
                slotProps={{ htmlInput: { min: '0.001', step: '0.001' } }}
              />
            </FormCard>
          ))}
        </div>

        <ActionGroup>
          <SecondaryButton
            type='button'
            onClick={() =>
              setItems((currentItems) => [...currentItems, emptySaleItem()])
            }
            disabled={!cashRegister}>
            Adicionar item
          </SecondaryButton>
        </ActionGroup>

        <FormRow>
          <PaymentSplitFields
            disabled={!cashRegister}
            fieldPrefix='sale'
            paymentMethods={paymentMethods}
            payments={payments}
            totalAmount={saleTotal}
            onChange={setPayments}
          />
          <TextField
            disabled
            label='Subtotal'
            size='medium'
            value={formatCurrency(saleSubtotal)}
          />
        </FormRow>
        {saleAllowsBilling ? (
          <FormRow>
            <TextField
              disabled={!cashRegister}
              label='Data da fatura'
              size='medium'
              type='date'
              value={billingIssueDate}
              onChange={(event) => setBillingIssueDate(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              disabled={!cashRegister}
              label='Vencimento do boleto/fatura'
              size='medium'
              type='date'
              value={billingDueDate}
              onChange={(event) => setBillingDueDate(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </FormRow>
        ) : null}
        <FormRow>
          <TextField
            disabled={!cashRegister}
            error={discountExceedsSubtotal}
            helperText={
              discountExceedsSubtotal
                ? 'Desconto maior que o subtotal.'
                : 'Informe o desconto em reais, se houver.'
            }
            label='Desconto'
            size='medium'
            type='number'
            value={discountAmount}
            onChange={(event) => setDiscountAmount(event.target.value)}
            slotProps={{ htmlInput: { min: '0', step: '0.01' } }}
          />
          <TextField
            disabled
            label='Total final'
            size='medium'
            value={formatCurrency(saleTotal)}
          />
        </FormRow>
        <TextField
          label='Cliente'
          select
          size='medium'
          value={clientId || ''}
          onChange={(event) => setClientId(event.target.value)}
          disabled={!cashRegister}>
          <MenuItem value=''>Cliente não identificado</MenuItem>
          {clients
            .filter((client) => client.active)
            .map((client) => (
              <MenuItem key={client.id} value={client.id}>
                {client.name}
              </MenuItem>
            ))}
        </TextField>
        <ActionGroup>
          <PrimaryButton
            icon={<Plus size={17} />}
            type='submit'
            disabled={!cashRegister || discountExceedsSubtotal}>
            Concluir venda
          </PrimaryButton>
          {embedded ? (
            <SecondaryButton
              type='button'
              onClick={() => setShowSaleForm(false)}>
              Fechar
            </SecondaryButton>
          ) : null}
        </ActionGroup>
      </FormGrid>
      ) : null}

      <PagePanel>
        <PageHeader
          actions={
            <div className='flex flex-wrap items-center justify-end gap-2'>
              <span className='text-sm text-[#5f665f]'>
                {directSales.length} de {allDirectSales.length} venda(s)
              </span>
              {embedded && !showSaleForm ? (
                <PrimaryButton
                  icon={<Plus size={17} />}
                  type='button'
                  onClick={() => setShowSaleForm(true)}>
                  Nova venda
                </PrimaryButton>
              ) : null}
            </div>
          }
          description='Acompanhe e corrija vendas diretas sem depender do histórico geral.'
          title='Vendas diretas registradas'
        />
        <div className='mb-4 grid gap-3 xl:grid-cols-[minmax(220px,1fr)_180px_180px]'>
          <TextField
            label='Buscar venda direta'
            placeholder='Nº, cliente, produto, pagamento...'
            size='small'
            value={directSaleSearch}
            onChange={(event) => setDirectSaleSearch(event.target.value)}
          />
          <TextField
            label='Status'
            select
            size='small'
            value={directSaleStatusFilter}
            onChange={(event) =>
              setDirectSaleStatusFilter(
                event.target.value as DirectSaleStatusFilter,
              )
            }>
            {directSaleStatusFilterOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label='NF-e'
            select
            size='small'
            value={directSaleFiscalFilter}
            onChange={(event) =>
              setDirectSaleFiscalFilter(
                event.target.value as DirectSaleFiscalFilter,
              )
            }>
            {directSaleFiscalFilterOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </div>
        <ResponsiveTable
          columns={[
            {
              header: 'Nº',
              render: (sale) => (
                <strong className='text-[#203466]'>#{sale.saleNumber}</strong>
              ),
            },
            {
              header: 'Cliente',
              render: (sale) => (
                <>
                  <strong>{sale.clientName ?? 'Cliente não identificado'}</strong>
                  <InlineNote>{sale.items.length} item(ns)</InlineNote>
                </>
              ),
            },
            {
              header: 'Data/hora',
              render: (sale) => formatDateTime(sale.createdAt),
            },
            {
              header: 'Status',
              render: (sale) => <DirectSaleStatus sale={sale} />,
            },
            {
              align: 'right',
              header: 'Total',
              render: (sale) => formatCurrency(sale.totalAmount),
            },
            {
              header: 'Pagamento',
              render: (sale) => directSalePaymentSummary(sale),
            },
            {
              header: 'NF-e',
              render: (sale) => (
                <DirectSaleFiscalStatus
                  fiscalDocument={directSaleFiscalDocument(
                    fiscalDocuments,
                    sale,
                  )}
                />
              ),
            },
            {
              header: 'Operador',
              render: (sale) => sale.createdByUserName,
            },
            {
              align: 'right',
              header: 'Ações',
              render: (sale) => (
                <div onClick={(event) => event.stopPropagation()}>
                  <DirectSaleActions
                    fiscalDocument={directSaleFiscalDocument(
                      fiscalDocuments,
                      sale,
                    )}
                    paymentMethods={paymentMethods}
                    sale={sale}
                    onCompleteReopenedSale={onCompleteReopenedSale}
                    onEditSale={onEditSale}
                    onOpenSaleFiscalQueue={onOpenSaleFiscalQueue}
                    onOpenDetails={() =>
                      setSelectedSaleDetail(
                        saleDetailFromSale(
                          sale,
                          directSaleFiscalDocument(fiscalDocuments, sale),
                          'Venda direta',
                        ),
                      )
                    }
                    onReturnItem={onReturnItem}
                    onUpdateSaleCommercialDetails={onUpdateSaleCommercialDetails}
                  />
                </div>
              ),
            },
          ]}
          emptyMessage='Nenhuma venda direta registrada.'
          getRowId={(sale) => sale.id}
          items={visibleDirectSales}
          onRowClick={(sale) =>
            setSelectedSaleDetail(
              saleDetailFromSale(
                sale,
                directSaleFiscalDocument(fiscalDocuments, sale),
                'Venda direta',
              ),
            )
          }
          pagination={directSalePagination}
        />
        {!embedded ? (
          <ActionGroup>
            <SecondaryButton type='button' onClick={onOpenSalesHistory}>
              Abrir histórico geral
            </SecondaryButton>
          </ActionGroup>
        ) : null}
      </PagePanel>
      <SaleDetailDrawer
        detail={selectedSaleDetail}
        onClose={() => setSelectedSaleDetail(undefined)}
      />
    </section>
  )
}

function emptySaleItem(): SaleDraftItem {
  return {
    productId: '',
    quantity: '',
  }
}

type SaleDetail = {
  fiscalDocument?: FiscalDocument
  history: string[]
  items: Array<{
    id: string
    productName: string
    quantity: string
    totalAmount: string
    unitPrice: string
  }>
  clientName: string
  originLabel: string
  paymentSummary: string
  sale?: Sale
  status: ReactNode
  subtitle: string
  title: string
  totalAmount: string
}

function saleDetailFromSale(
  sale: Sale,
  fiscalDocument: FiscalDocument | undefined,
  originLabel: string,
): SaleDetail {
  return {
    fiscalDocument,
    history: saleDetailHistoryFromSale(sale, fiscalDocument),
    items: sale.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      totalAmount: item.totalAmount,
      unitPrice: item.unitPrice,
    })),
    clientName: sale.clientName ?? 'Cliente não identificado',
    originLabel,
    paymentSummary: directSalePaymentSummary(sale),
    sale,
    status: <DirectSaleStatus sale={sale} />,
    subtitle: formatDateTime(sale.createdAt),
    title: `Venda #${sale.saleNumber}`,
    totalAmount: sale.totalAmount,
  }
}

function saleDetailFromShippingOrder(
  order: ShippingOrder,
  sale: Sale | undefined,
  fiscalDocument: FiscalDocument | undefined,
): SaleDetail {
  if (sale) {
    return saleDetailFromSale(sale, fiscalDocument, 'Pedidos')
  }

  return {
    fiscalDocument,
    history: shippingOrderDetailHistory(order, fiscalDocument),
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.description ?? item.productName,
      quantity: item.quantity,
      totalAmount: item.totalAmount,
      unitPrice: item.unitPrice,
    })),
    clientName: order.clientName,
    originLabel: 'Pedidos',
    paymentSummary: shippingOrderPaymentSummary(order),
    status: <ShippingOrderStatusSummary order={order} />,
    subtitle: formatDateTime(order.completedAt ?? order.createdAt),
    title: shippingOrderNumberLabel(order, sale),
    totalAmount: order.totalAmount,
  }
}

function saleDetailFromPickupReservation(
  reservation: PickupReservation,
  sale: Sale | undefined,
  fiscalDocument: FiscalDocument | undefined,
): SaleDetail {
  if (sale) {
    return saleDetailFromSale(sale, fiscalDocument, 'Retirada')
  }

  return {
    fiscalDocument,
    history: pickupReservationDetailHistory(reservation, fiscalDocument),
    items: reservation.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      totalAmount: item.totalAmount,
      unitPrice: item.unitPrice,
    })),
    clientName: reservation.clientName,
    originLabel: 'Retirada',
    paymentSummary: pickupReservationPaymentSummary(sale),
    status: <PickupReservationStatusSummary reservation={reservation} />,
    subtitle: formatDateTime(reservation.completedAt ?? reservation.createdAt),
    title: pickupReservationNumberLabel(reservation, sale),
    totalAmount: reservation.totalAmount,
  }
}

function saleDetailHistoryFromSale(
  sale: Sale,
  fiscalDocument?: FiscalDocument,
) {
  return [
    `Venda criada em ${formatDateTime(sale.createdAt)} por ${sale.createdByUserName}`,
    sale.status === 'OPEN'
      ? 'Venda reaberta para correção'
      : null,
    sale.status === 'COMPLETED'
      ? 'Venda concluída'
      : null,
    sale.cancelledAt
      ? `Venda cancelada em ${formatDateTime(sale.cancelledAt)} por ${
          sale.cancelledByUserName ?? 'usuário não identificado'
        }`
      : null,
    ...sale.items.flatMap((item) =>
      item.returns.map(
        (saleReturn) =>
          `Devolução de ${formatQuantity(saleReturn.quantity)} ${
            item.productName
          } registrada em ${formatDateTime(saleReturn.createdAt)} por ${
            saleReturn.createdByUserName
          }`,
      ),
    ),
    ...fiscalDocumentHistory(fiscalDocument),
  ].filter((event): event is string => Boolean(event))
}

function shippingOrderDetailHistory(
  order: ShippingOrder,
  fiscalDocument?: FiscalDocument,
) {
  return [
    `Pedido criado em ${formatDateTime(order.createdAt)} por ${order.createdByUserName}`,
    order.approvedAt
      ? `Pedido aprovado em ${formatDateTime(order.approvedAt)} por ${
          order.approvedByUserName ?? 'usuário não identificado'
        }`
      : null,
    order.separatedAt
      ? `Separação confirmada em ${formatDateTime(order.separatedAt)} por ${
          order.separatedByUserName ?? 'usuário não identificado'
        }`
      : null,
    order.completedAt
      ? `Venda concluída em ${formatDateTime(order.completedAt)} por ${
          order.completedByUserName ?? 'usuário não identificado'
        }`
      : null,
    order.cancelledAt
      ? `Pedido cancelado em ${formatDateTime(order.cancelledAt)} por ${
          order.cancelledByUserName ?? 'usuário não identificado'
        }`
      : null,
    ...fiscalDocumentHistory(fiscalDocument),
  ].filter((event): event is string => Boolean(event))
}

function pickupReservationDetailHistory(
  reservation: PickupReservation,
  fiscalDocument?: FiscalDocument,
) {
  return [
    `Reserva criada em ${formatDateTime(reservation.createdAt)} por ${reservation.createdByUserName}`,
    reservation.completedAt
      ? `Venda concluída em ${formatDateTime(reservation.completedAt)} por ${
          reservation.completedByUserName ?? 'usuário não identificado'
        }`
      : null,
    reservation.cancelledAt
      ? `Reserva cancelada em ${formatDateTime(reservation.cancelledAt)} por ${
          reservation.cancelledByUserName ?? 'usuário não identificado'
        }`
      : null,
    ...fiscalDocumentHistory(fiscalDocument),
  ].filter((event): event is string => Boolean(event))
}

function fiscalDocumentHistory(fiscalDocument?: FiscalDocument) {
  if (!fiscalDocument) {
    return []
  }

  return [
    `NF-e enviada para a fila em ${formatDateTime(fiscalDocument.createdAt)} por ${fiscalDocument.issuedByUserName}`,
    fiscalDocument.issuedAt
      ? `NF-e emitida em ${formatDateTime(fiscalDocument.issuedAt)}`
      : null,
    fiscalDocument.status === 'REJECTED' && fiscalDocument.rejectionReason
      ? `NF-e rejeitada: ${fiscalDocument.rejectionReason}`
      : null,
    fiscalDocument.cancelledAt
      ? `NF-e cancelada em ${formatDateTime(fiscalDocument.cancelledAt)} por ${
          fiscalDocument.cancelledByUserName ?? 'usuário não identificado'
        }`
      : null,
  ].filter((event): event is string => Boolean(event))
}

function SaleDetailDrawer({
  detail,
  onClose,
}: {
  detail?: SaleDetail
  onClose: () => void
}) {
  return (
    <Drawer
      anchor='right'
      open={Boolean(detail)}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            maxWidth: '100%',
            width: { xs: '100%', sm: 460 },
          },
        },
      }}>
      {detail ? (
        <Box className='grid min-h-full grid-rows-[auto_1fr] bg-white'>
          <div className='sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#e4e9e5] bg-white px-5 py-4'>
            <button
              aria-label='Fechar detalhes'
              className='rounded-lg border border-[#cfd8d5] p-1.5 text-[#5f665f] hover:bg-[#f3f5f4]'
              type='button'
              onClick={onClose}>
              <X size={16} />
            </button>
            <div className='grid justify-items-end gap-1 text-right'>
              <div className='flex flex-wrap items-center justify-end gap-2'>
                {detail.status}
                <strong className='text-[#203466]'>{detail.title}</strong>
              </div>
              <InlineNote>
                {detail.subtitle} | {detail.originLabel}
              </InlineNote>
            </div>
          </div>
          <div className='divide-y divide-[#eef1ee] overflow-auto text-left'>
            <SaleDetailSection icon={<User size={15} />} title='Cliente'>
              <strong>{detail.clientName}</strong>
            </SaleDetailSection>
            <SaleDetailSection icon={<Package size={15} />} title='Itens'>
              <div className='grid gap-2'>
                {detail.items.map((item) => (
                  <div
                    className='grid gap-1 rounded-lg border border-[#e4e9e5] bg-[#fbfcfb] p-3 text-left'
                    key={item.id}>
                    <div className='flex w-full items-start justify-between gap-3'>
                      <strong className='text-sm text-[#2c281e]'>
                        {item.productName}
                      </strong>
                      <span className='text-sm text-[#5f665f]'>
                        {formatQuantity(item.quantity)}x
                      </span>
                    </div>
                    <div className='flex w-full items-center justify-between gap-3 text-sm'>
                      <span>Unitário {formatCurrency(item.unitPrice)}</span>
                      <strong>{formatCurrency(item.totalAmount)}</strong>
                    </div>
                  </div>
                ))}
                <div className='flex items-center justify-between pt-2'>
                  <span className='text-sm text-[#5f665f]'>Total</span>
                  <strong>{formatCurrency(detail.totalAmount)}</strong>
                </div>
              </div>
            </SaleDetailSection>
            <SaleDetailSection icon={<CreditCard size={15} />} title='Pagamento'>
              <strong>{detail.paymentSummary}</strong>
              {detail.sale?.billingDueDate ? (
                <InlineNote>
                  Vencimento: {formatDate(detail.sale.billingDueDate)}
                </InlineNote>
              ) : null}
            </SaleDetailSection>
            <SaleDetailSection icon={<ReceiptText size={15} />} title='Status fiscal'>
              <DirectSaleFiscalStatus fiscalDocument={detail.fiscalDocument} />
            </SaleDetailSection>
            <SaleDetailSection icon={<Paperclip size={15} />} title='Arquivos fiscais'>
              <SaleDetailFiles detail={detail} />
            </SaleDetailSection>
            <SaleDetailSection icon={<History size={15} />} title='Histórico'>
              <div className='grid gap-2'>
                {detail.history.map((event) => (
                  <div className='grid gap-0.5' key={event}>
                    <span className='text-sm font-semibold text-[#2c281e]'>
                      {event}
                    </span>
                  </div>
                ))}
              </div>
            </SaleDetailSection>
          </div>
        </Box>
      ) : null}
    </Drawer>
  )
}

function SaleDetailSection({
  children,
  icon,
  title,
}: {
  children: ReactNode
  icon: ReactNode
  title: string
}) {
  return (
    <section className='grid gap-3 px-5 py-4'>
      <div className='flex items-center gap-2 text-xs font-bold uppercase text-[#5f665f]'>
        {icon}
        {title}
      </div>
      <div className='grid gap-1 text-left text-sm text-[#2c281e]'>
        {children}
      </div>
    </section>
  )
}

function SaleDetailFiles({ detail }: { detail: SaleDetail }) {
  const actions = saleDetailFileActions(detail)

  return actions.length > 0 ? (
    <div className='flex flex-wrap justify-end gap-2'>
      {actions.map((action) => (
        <TableActionButton
          icon={<FileText size={14} />}
          key={action.label}
          type='button'
          onClick={action.onSelect}>
          {action.label}
        </TableActionButton>
      ))}
    </div>
  ) : (
    <InlineNote>Nenhum arquivo fiscal disponível.</InlineNote>
  )
}

function saleDetailFileActions(detail: SaleDetail) {
  const fiscalDocument = detail.fiscalDocument
  const actions: Array<{ label: string; onSelect: () => void }> = []

  if (detail.sale) {
    actions.push({
      label: 'Comprovante',
      onSelect: () =>
        void downloadApiFile(
          `/sales/${detail.sale?.id}/receipt`,
          `comprovante-${detail.sale?.id}.pdf`,
        ),
    })
  }

  if (fiscalDocument?.pdfUrl) {
    actions.push({
      label: 'DANFE',
      onSelect: () =>
        void downloadApiFile(
          `/fiscal-documents/${fiscalDocument.id}/files/danfe`,
          `${fiscalDocument.providerReference ?? fiscalDocument.id}.pdf`,
        ),
    })
  }

  if (fiscalDocument?.xmlUrl) {
    actions.push({
      label: 'XML',
      onSelect: () =>
        void downloadApiFile(
          `/fiscal-documents/${fiscalDocument.id}/files/xml`,
          `${fiscalDocument.providerReference ?? fiscalDocument.id}.xml`,
        ),
    })
  }

  return actions
}

function directSalePaymentSummary(sale: Sale) {
  return sale.payments.length
    ? sale.payments
        .map((payment) => payment.paymentMethodName)
        .filter(Boolean)
        .join(' + ')
    : (sale.paymentMethodName ?? 'Não informado')
}

function shippingOrderNumberLabel(order: ShippingOrder, sale?: Sale) {
  return sale ? `#${sale.saleNumber}` : `Pedido ${order.id.slice(0, 8)}`
}

function pickupReservationNumberLabel(
  reservation: PickupReservation,
  sale?: Sale,
) {
  return sale ? `#${sale.saleNumber}` : `Reserva ${reservation.id.slice(0, 8)}`
}

function pickupReservationPaymentSummary(sale?: Sale) {
  return sale ? directSalePaymentSummary(sale) : 'Definido ao concluir'
}

type DirectSaleStatusFilter =
  | 'ALL'
  | 'OPEN'
  | 'COMPLETED'
  | 'RETURNED'
  | 'CANCELLED'
type DirectSaleFiscalFilter =
  | 'ALL'
  | 'MISSING'
  | 'PENDING'
  | 'PROCESSING'
  | 'REJECTED'
  | 'AUTHORIZED'
  | 'CANCELLED'

const directSaleStatusFilterOptions: Array<{
  label: string
  value: DirectSaleStatusFilter
}> = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Abertas', value: 'OPEN' },
  { label: 'Concluídas', value: 'COMPLETED' },
  { label: 'Com devolução', value: 'RETURNED' },
  { label: 'Canceladas', value: 'CANCELLED' },
]

const directSaleFiscalFilterOptions: Array<{
  label: string
  value: DirectSaleFiscalFilter
}> = [
  { label: 'Todas', value: 'ALL' },
  { label: 'Sem NF-e', value: 'MISSING' },
  { label: 'Pendentes', value: 'PENDING' },
  { label: 'Processando', value: 'PROCESSING' },
  { label: 'Rejeitadas', value: 'REJECTED' },
  { label: 'Autorizadas', value: 'AUTHORIZED' },
  { label: 'Canceladas', value: 'CANCELLED' },
]

function directSaleMatchesFilters(
  sale: Sale,
  filters: {
    fiscalDocument?: FiscalDocument
    fiscalStatus: DirectSaleFiscalFilter
    search: string
    status: DirectSaleStatusFilter
  },
) {
  return (
    directSaleMatchesSearch(sale, filters.search) &&
    directSaleMatchesStatus(sale, filters.status) &&
    directSaleMatchesFiscalStatus(
      filters.fiscalDocument,
      filters.fiscalStatus,
    )
  )
}

function directSaleMatchesSearch(sale: Sale, search: string) {
  const normalizedSearch = normalizeDirectSaleSearch(search)

  if (!normalizedSearch) {
    return true
  }

  return [
    sale.saleNumber,
    sale.clientName,
    sale.paymentMethodName,
    sale.createdByUserName,
    ...sale.items.flatMap((item) => [
      item.productInternalCode,
      item.productName,
    ]),
  ].some((value) =>
    normalizeDirectSaleSearch(String(value ?? '')).includes(normalizedSearch),
  )
}

function directSaleMatchesStatus(
  sale: Sale,
  status: DirectSaleStatusFilter,
) {
  if (status === 'ALL') {
    return true
  }

  if (status === 'RETURNED') {
    return sale.items.some((item) => Number(item.returnedQuantity ?? 0) > 0)
  }

  return sale.status === status
}

function directSaleMatchesFiscalStatus(
  fiscalDocument: FiscalDocument | undefined,
  status: DirectSaleFiscalFilter,
) {
  if (status === 'ALL') {
    return true
  }

  if (status === 'MISSING') {
    return !fiscalDocument
  }

  return fiscalDocument?.status === status
}

function normalizeDirectSaleSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}

function DirectSaleStatus({ sale }: { sale: Sale }) {
  if (sale.status === 'OPEN') {
    return (
      <>
        <StatusChip label='Aberta para correção' tone='warning' />
        <InlineNote>Concluir novamente antes da NF-e.</InlineNote>
      </>
    )
  }

  if (sale.status === 'CANCELLED') {
    return <StatusChip label='Cancelada' tone='neutral' />
  }

  const returnedQuantity = sale.items.reduce(
    (sum, item) => sum + Number(item.returnedQuantity ?? 0),
    0,
  )

  return returnedQuantity > 0 ? (
    <>
      <StatusChip label='Concluída com devolução' tone='warning' />
      <InlineNote>Estorno registrado.</InlineNote>
    </>
  ) : (
    <StatusChip label='Concluída' tone='success' />
  )
}

function DirectSaleFiscalStatus({
  fiscalDocument,
}: {
  fiscalDocument?: FiscalDocument
}) {
  if (!fiscalDocument) {
    return <StatusChip label='Sem NF-e' tone='neutral' />
  }

  return (
    <>
      <StatusChip
        label={directSaleFiscalStatusLabel(fiscalDocument.status)}
        tone={directSaleFiscalStatusTone(fiscalDocument.status)}
      />
      <InlineNote>
        {fiscalDocument.number ? `NF-e #${fiscalDocument.number}` : 'Sem numero'}
      </InlineNote>
    </>
  )
}

function DirectSaleActions({
  fiscalDocument,
  paymentMethods,
  sale,
  onCompleteReopenedSale,
  onEditSale,
  onOpenDetails,
  onOpenSaleFiscalQueue,
  onReturnItem,
  onUpdateSaleCommercialDetails,
}: {
  fiscalDocument?: FiscalDocument
  paymentMethods: PaymentMethod[]
  sale: Sale
  onCompleteReopenedSale?: (sale: Sale) => void
  onEditSale?: (sale: Sale) => void
  onOpenDetails?: () => void
  onOpenSaleFiscalQueue?: (sale: Sale) => void
  onReturnItem?: SaleReturnHandler
  onUpdateSaleCommercialDetails?: SaleCommercialDetailsHandler
}) {
  const [showReturnForm, setShowReturnForm] = useState(false)
  const [showCommercialDetailsForm, setShowCommercialDetailsForm] =
    useState(false)
  const fiscalDocumentBlocksCommercialChanges = Boolean(
    fiscalDocument &&
      ['AUTHORIZED', 'PENDING', 'PROCESSING'].includes(fiscalDocument.status),
  )
  const fiscalLinks = [
    { fileType: 'danfe', label: 'DANFE', url: fiscalDocument?.pdfUrl },
    { fileType: 'xml', label: 'XML', url: fiscalDocument?.xmlUrl },
  ].filter(
    (link): link is {
      fileType: 'danfe' | 'xml'
      label: 'DANFE' | 'XML'
      url: string
    } => Boolean(link.url),
  )
  const actions: TableActionsMenuAction[] = onOpenDetails
    ? [
        {
          label: 'Ver detalhes',
          onSelect: onOpenDetails,
        },
      ]
    : []

  if (sale.status === 'COMPLETED') {
    actions.push({
      icon: <ReceiptText size={14} />,
      label: 'Baixar comprovante',
      onSelect: () =>
        void downloadApiFile(
          `/sales/${sale.id}/receipt`,
          `comprovante-${sale.id}.pdf`,
        ),
    })
  }

  fiscalLinks.forEach((link) => {
    actions.push({
      icon: <FileText size={14} />,
      label: `Baixar ${link.label}`,
      onSelect: () =>
        fiscalDocument &&
        void downloadApiFile(
          `/fiscal-documents/${fiscalDocument.id}/files/${link.fileType}`,
          directSaleFiscalDocumentDownloadName(fiscalDocument, link.label),
        ),
    })
  })

  if (sale.status === 'COMPLETED' && !fiscalDocument && onOpenSaleFiscalQueue) {
    actions.push({
      icon: <FileText size={14} />,
      label: 'Gerar NF-e',
      onSelect: () => onOpenSaleFiscalQueue(sale),
    })
  }

  if (sale.status === 'OPEN' && onCompleteReopenedSale) {
    actions.push({
      label: 'Concluir venda',
      onSelect: () => onCompleteReopenedSale(sale),
    })
  }

  if ((sale.status === 'OPEN' || sale.status === 'COMPLETED') && onEditSale) {
    actions.push({
      disabled: fiscalDocumentBlocksCommercialChanges,
      label: 'Editar venda',
      onSelect: () => onEditSale(sale),
    })
  }

  if (sale.status === 'COMPLETED' && onUpdateSaleCommercialDetails) {
    actions.push({
      disabled: fiscalDocumentBlocksCommercialChanges,
      label: 'Corrigir pagamento e fatura',
      onSelect: () => setShowCommercialDetailsForm(true),
    })
  }

  if (sale.status === 'COMPLETED' && onReturnItem) {
    actions.push({
      disabled: fiscalDocumentBlocksCommercialChanges,
      label: 'Registrar devolução',
      onSelect: () => setShowReturnForm(true),
    })
  }

  if (actions.length === 0) {
    return <InlineNote>Sem ações</InlineNote>
  }

  return (
    <ActionStack>
      <div className='flex justify-end'>
        <TableActionsMenu actions={actions} />
      </div>
      {fiscalDocumentBlocksCommercialChanges ? (
        <InlineNote>Cancele a NF-e antes de editar a venda.</InlineNote>
      ) : null}
      {showCommercialDetailsForm && onUpdateSaleCommercialDetails ? (
        <SaleCommercialDetailsForm
          onCancel={() => setShowCommercialDetailsForm(false)}
          paymentMethods={paymentMethods}
          sale={sale}
          onUpdateSaleCommercialDetails={onUpdateSaleCommercialDetails}
        />
      ) : null}
      {showReturnForm && onReturnItem ? (
        <SaleReturnForm
          onCancel={() => setShowReturnForm(false)}
          paymentMethods={paymentMethods}
          sale={sale}
          onReturnItem={onReturnItem}
        />
      ) : null}
    </ActionStack>
  )
}

function directSaleFiscalDocument(
  fiscalDocuments: FiscalDocument[],
  sale: Sale,
) {
  return fiscalDocuments.find(
    (document) => document.sourceType === 'SALE' && document.sourceId === sale.id,
  )
}

function directSaleFiscalStatusLabel(status: FiscalDocument['status']) {
  const labels: Record<FiscalDocument['status'], string> = {
    AUTHORIZED: 'Autorizada',
    CANCELLED: 'Cancelada',
    PENDING: 'Pendente',
    PROCESSING: 'Processando',
    REJECTED: 'Rejeitada',
  }

  return labels[status]
}

function directSaleFiscalStatusTone(
  status: FiscalDocument['status'],
): StatusTone {
  const tones: Record<FiscalDocument['status'], StatusTone> = {
    AUTHORIZED: 'success',
    CANCELLED: 'neutral',
    PENDING: 'warning',
    PROCESSING: 'warning',
    REJECTED: 'error',
  }

  return tones[status]
}

function directSaleFiscalDocumentDownloadName(
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

function emptySalePayment(): SalePaymentDraft {
  return {
    paymentMethodId: '',
    amount: '',
  }
}

export function PaymentSplitFields({
  disabled,
  fieldPrefix,
  paymentMethods,
  payments,
  totalAmount,
  onChange,
}: {
  disabled?: boolean
  fieldPrefix: string
  paymentMethods: PaymentMethod[]
  payments: SalePaymentDraft[]
  totalAmount: number
  onChange: (payments: SalePaymentDraft[]) => void
}) {
  const activePaymentMethods = paymentMethods.filter(
    (method) => method.active && method.code !== 'TO_AGREE',
  )
  const paymentTotal = salePaymentDraftTotal(payments, totalAmount)
  const difference = Number((totalAmount - paymentTotal).toFixed(2))
  const hasMultiplePayments = payments.length > 1

  function updatePayment(index: number, changes: Partial<SalePaymentDraft>) {
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
    <FormCard className='gap-3'>
      <div>
        <strong>Formas de pagamento</strong>
        <InlineNote>
          Divida o total quando o cliente pagar em mais de uma forma.
        </InlineNote>
      </div>
      {payments.map((payment, index) => (
        <FormRow key={index} className='items-start'>
          <TextField
            disabled={disabled}
            label={`Pagamento ${index + 1}`}
            name={`${fieldPrefix}PaymentMethodId`}
            onChange={(event) =>
              updatePayment(index, { paymentMethodId: event.target.value })
            }
            required
            select
            size='small'
            value={payment.paymentMethodId}>
            <MenuItem value='' disabled>
              Pagamento
            </MenuItem>
            {activePaymentMethods.map((method) => (
              <MenuItem key={method.id} value={method.id}>
                {method.name}
              </MenuItem>
            ))}
          </TextField>
          <div className='grid gap-2'>
            <TextField
              disabled={disabled}
              helperText={
                !hasMultiplePayments && index === 0
                  ? 'Vazio usa o total final.'
                  : undefined
              }
              label='Valor'
              name={`${fieldPrefix}PaymentAmount`}
              onChange={(event) =>
                updatePayment(index, { amount: event.target.value })
              }
              required={hasMultiplePayments}
              size='small'
              slotProps={{ htmlInput: { min: '0', step: '0.01' } }}
              type='number'
              value={payment.amount}
            />
            {payments.length > 1 ? (
              <TableActionButton
                disabled={disabled}
                type='button'
                onClick={() => removePayment(index)}>
                Remover pagamento
              </TableActionButton>
            ) : null}
          </div>
        </FormRow>
      ))}
      <ActionGroup align='start'>
        <TableActionButton
          disabled={disabled}
          type='button'
          onClick={() => onChange([...payments, emptySalePayment()])}>
          Adicionar forma
        </TableActionButton>
      </ActionGroup>
      <Alert
        severity={Math.abs(difference) < 0.01 ? 'success' : 'info'}
        variant='outlined'>
        Total dos pagamentos: {formatCurrency(paymentTotal)}. Diferença:{' '}
        {formatCurrency(Math.abs(difference))}.
      </Alert>
    </FormCard>
  )
}

function salePaymentPayloads(
  payments: SalePaymentDraft[],
  totalAmount: number,
) {
  const filledPayments = payments.filter((payment) => payment.paymentMethodId)
  const usesSinglePaymentTotal =
    filledPayments.length === 1 && !filledPayments[0].amount

  return filledPayments.map((payment) => ({
    paymentMethodId: payment.paymentMethodId,
    amount: usesSinglePaymentTotal
      ? Number(totalAmount.toFixed(2))
      : moneyInputValue(payment.amount),
  }))
}

function salePaymentDraftTotal(
  payments: SalePaymentDraft[],
  totalAmount: number,
) {
  const payloads = salePaymentPayloads(payments, totalAmount)

  return Number(
    payloads.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2),
  )
}

function moneyInputValue(value: string) {
  const parsedValue = Number(value || 0)
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0
}

function emptyPickupReservationItem(): PickupReservationDraftItem {
  return {
    productId: '',
    quantity: '',
  }
}

export function ShippingOrdersPage({
  cashRegister,
  embedded = false,
  fiscalDocuments = [],
  paymentMethods,
  orders,
  sales = [],
  onCompleteReopenedSale,
  onEditSale,
  onOpenQuotes,
  onOpenSaleFiscalQueue,
  onReturnItem,
  onApprove,
  onSeparate,
  onComplete,
  onCancel,
  onUpdateSaleCommercialDetails,
}: {
  cashRegister: CashRegisterSession | null
  embedded?: boolean
  fiscalDocuments?: FiscalDocument[]
  paymentMethods: PaymentMethod[]
  orders: ShippingOrder[]
  sales?: Sale[]
  onCompleteReopenedSale?: (sale: Sale) => void
  onEditSale?: (sale: Sale) => void
  onOpenQuotes: () => void
  onOpenSaleFiscalQueue?: (sale: Sale) => void
  onReturnItem?: SaleReturnHandler
  onApprove: (order: ShippingOrder) => void
  onSeparate: (order: ShippingOrder) => void
  onComplete: (event: FormEvent<HTMLFormElement>, order: ShippingOrder) => void
  onCancel: (event: FormEvent<HTMLFormElement>, order: ShippingOrder) => void
  onUpdateSaleCommercialDetails?: SaleCommercialDetailsHandler
}) {
  const [search, setSearch] = useState('')
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<SaleDetail>()
  const [statusFilter, setStatusFilter] =
    useState<ShippingOrderStatusFilter>('ALL')
  const [fiscalStatusFilter, setFiscalStatusFilter] =
    useState<DirectSaleFiscalFilter>('ALL')
  const [paymentMethodId, setPaymentMethodId] = useState('ALL')
  const filteredOrders = useMemo(
    () =>
      filterShippingOrders(orders, {
        fiscalDocuments,
        fiscalStatus: fiscalStatusFilter,
        paymentMethodId,
        search,
        status: statusFilter,
      }),
    [fiscalDocuments, fiscalStatusFilter, orders, paymentMethodId, search, statusFilter],
  )
  const { pagination, visibleItems } = usePaginatedRows<ShippingOrder>(
    filteredOrders,
    [fiscalStatusFilter, paymentMethodId, search, statusFilter].join('|'),
  )
  const paymentFilterOptions = paymentMethods.filter((paymentMethod) =>
    orders.some(
      (order) =>
        order.paymentMethodId === paymentMethod.id ||
        order.payments.some(
          (payment) => payment.paymentMethodId === paymentMethod.id,
        ),
    ),
  )

  return (
    <section className='grid gap-4'>
      <PagePanel wide>
        {embedded ? (
          <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
            <InlineNote>
              {filteredOrders.length} de {orders.length} venda(s) via orçamento.
            </InlineNote>
            <PrimaryButton
              icon={<Plus size={17} />}
              type='button'
              onClick={onOpenQuotes}>
              Abrir orçamentos
            </PrimaryButton>
          </div>
        ) : (
          <PageHeader
            actions={
              <div className='flex flex-wrap items-center justify-end gap-2'>
                <span className='text-sm text-[#5f665f]'>
                  {filteredOrders.length} de {orders.length} registro(s)
                </span>
                <PrimaryButton
                  icon={<Plus size={17} />}
                  type='button'
                  onClick={onOpenQuotes}>
                  Abrir orçamentos
                </PrimaryButton>
              </div>
            }
            description='Pedidos confirmados reúnem separação, pagamento, baixa de estoque e emissão fiscal.'
            icon={<Send size={18} />}
            title='Vendas'
          />
        )}
        <div className='mb-4 grid gap-3 xl:grid-cols-[minmax(220px,1fr)_190px_190px_200px]'>
          <TextField
            label='Buscar pedido'
            placeholder='Cliente, produto, operador, orçamento...'
            size='small'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <TextField
            label='Status'
            select
            size='small'
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as ShippingOrderStatusFilter)
            }>
            {shippingOrderStatusFilterOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label='Pagamento'
            select
            size='small'
            value={paymentMethodId}
            onChange={(event) => setPaymentMethodId(event.target.value)}>
            <MenuItem value='ALL'>Todos</MenuItem>
            {paymentFilterOptions.map((method) => (
              <MenuItem key={method.id} value={method.id}>
                {method.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label='NF-e'
            select
            size='small'
            value={fiscalStatusFilter}
            onChange={(event) =>
              setFiscalStatusFilter(
                event.target.value as DirectSaleFiscalFilter,
              )
            }>
            {directSaleFiscalFilterOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </div>
        <ResponsiveTable
          columns={[
            {
              header: 'Nº',
              render: (order) => (
                <strong className='text-[#203466]'>
                  {shippingOrderNumberLabel(
                    order,
                    shippingOrderSale(sales, order),
                  )}
                </strong>
              ),
            },
            {
              header: 'Cliente',
              render: (order) => (
                <>
                  <strong>{order.clientName}</strong>
                  <InlineNote>{order.items.length} item(ns)</InlineNote>
                </>
              ),
            },
            {
              header: 'Data/hora',
              render: (order) =>
                formatDateTime(order.completedAt ?? order.createdAt),
            },
            {
              header: 'Status',
              render: (order) => <ShippingOrderStatusSummary order={order} />,
            },
            {
              align: 'right',
              header: 'Total',
              render: (order) => formatCurrency(order.totalAmount),
            },
            {
              header: 'Pagamento',
              render: (order) => shippingOrderPaymentSummary(order),
            },
            {
              header: 'NF-e',
              render: (order) => (
                <DirectSaleFiscalStatus
                  fiscalDocument={shippingOrderFiscalDocument(
                    fiscalDocuments,
                    order,
                  )}
                />
              ),
            },
            {
              header: 'Operador',
              render: (order) =>
                order.completedByUserName ?? order.createdByUserName,
            },
            {
              align: 'right',
              header: 'Ações',
              render: (order) => (
                <div onClick={(event) => event.stopPropagation()}>
                  {shippingOrderActionRenderers[order.status]({
                    cashRegister,
                    fiscalDocument: shippingOrderFiscalDocument(
                      fiscalDocuments,
                      order,
                    ),
                    order,
                    paymentMethods,
                    sale: shippingOrderSale(sales, order),
                    onCompleteReopenedSale,
                    onEditSale,
                    onApprove,
                    onCancel,
                    onComplete,
                    onOpenSaleFiscalQueue,
                    onReturnItem,
                    onSeparate,
                    onUpdateSaleCommercialDetails,
                  })}
                </div>
              ),
            },
          ]}
          emptyMessage='Nenhuma venda via orçamento registrada.'
          getRowId={(order) => order.id}
          items={visibleItems}
          onRowClick={(order) =>
            setSelectedSaleDetail(
              saleDetailFromShippingOrder(
                order,
                shippingOrderSale(sales, order),
                shippingOrderFiscalDocument(fiscalDocuments, order),
              ),
            )
          }
          pagination={pagination}
        />
      </PagePanel>
      <SaleDetailDrawer
        detail={selectedSaleDetail}
        onClose={() => setSelectedSaleDetail(undefined)}
      />
    </section>
  )
}

type ShippingOrderActionRendererProps = {
  cashRegister: CashRegisterSession | null
  fiscalDocument?: FiscalDocument
  order: ShippingOrder
  paymentMethods: PaymentMethod[]
  sale?: Sale
  onCompleteReopenedSale?: (sale: Sale) => void
  onEditSale?: (sale: Sale) => void
  onApprove: (order: ShippingOrder) => void
  onSeparate: (order: ShippingOrder) => void
  onComplete: (event: FormEvent<HTMLFormElement>, order: ShippingOrder) => void
  onCancel: (event: FormEvent<HTMLFormElement>, order: ShippingOrder) => void
  onOpenSaleFiscalQueue?: (sale: Sale) => void
  onReturnItem?: SaleReturnHandler
  onUpdateSaleCommercialDetails?: SaleCommercialDetailsHandler
}

const shippingOrderActionRenderers: Record<
  ShippingOrder['status'],
  (props: ShippingOrderActionRendererProps) => ReactNode
> = {
  APPROVED: (props) => <ShippingOrderActions {...props} />,
  CANCELLED: () => <InlineNote>Sem ações</InlineNote>,
  COMPLETED: (props) => <CompletedShippingOrderActions {...props} />,
  QUOTED: (props) => <ShippingOrderActions {...props} />,
  SEPARATED: (props) => <ShippingOrderActions {...props} />,
}

function CompletedShippingOrderActions({
  fiscalDocument,
  order,
  paymentMethods,
  sale,
  onCompleteReopenedSale,
  onEditSale,
  onOpenSaleFiscalQueue,
  onReturnItem,
  onUpdateSaleCommercialDetails,
}: ShippingOrderActionRendererProps) {
  const [showCommercialDetailsForm, setShowCommercialDetailsForm] =
    useState(false)
  const [showReturnForm, setShowReturnForm] = useState(false)

  if (!sale) {
    return <InlineNote>Venda concluída</InlineNote>
  }

  const fiscalDocumentBlocksCommercialChanges = Boolean(
    fiscalDocument &&
      ['AUTHORIZED', 'PENDING', 'PROCESSING'].includes(fiscalDocument.status),
  )
  const actions: TableActionsMenuAction[] = [
    {
      icon: <ReceiptText size={14} />,
      label: 'Baixar comprovante',
      onSelect: () =>
        void downloadApiFile(
          `/sales/${sale.id}/receipt`,
          `comprovante-${sale.id}.pdf`,
        ),
    },
  ]

  shippingOrderFiscalLinks(fiscalDocument).forEach((link) => {
    actions.push({
      icon: <FileText size={14} />,
      label: `Baixar ${link.label}`,
      onSelect: () =>
        fiscalDocument &&
        void downloadApiFile(
          `/fiscal-documents/${fiscalDocument.id}/files/${link.fileType}`,
          shippingOrderFiscalDocumentDownloadName(fiscalDocument, link.label),
        ),
    })
  })

  if (!fiscalDocument && onOpenSaleFiscalQueue) {
    actions.push({
      icon: <FileText size={14} />,
      label: 'Gerar NF-e',
      onSelect: () => onOpenSaleFiscalQueue(sale),
    })
  }

  onEditSale &&
    actions.push({
      disabled: fiscalDocumentBlocksCommercialChanges,
      label: 'Reabrir / editar venda',
      onSelect: () => onEditSale(sale),
    })

  sale.status === 'OPEN' &&
    onCompleteReopenedSale &&
    actions.push({
      label: 'Concluir venda',
      onSelect: () => onCompleteReopenedSale(sale),
    })

  onUpdateSaleCommercialDetails &&
    actions.push({
      disabled: fiscalDocumentBlocksCommercialChanges,
      label: 'Corrigir pagamento e fatura',
      onSelect: () => setShowCommercialDetailsForm(true),
    })

  onReturnItem &&
    actions.push({
      disabled: fiscalDocumentBlocksCommercialChanges,
      label: 'Registrar devolução',
      onSelect: () => setShowReturnForm(true),
    })

  return (
    <ActionStack>
      <div className='flex justify-end'>
        <TableActionsMenu actions={actions} />
      </div>
      <InlineNote>
        Venda Nº {sale.saleNumber} gerada via orçamento.
      </InlineNote>
      {fiscalDocumentBlocksCommercialChanges ? (
        <InlineNote>Cancele a NF-e antes de editar a venda.</InlineNote>
      ) : null}
      {showCommercialDetailsForm && onUpdateSaleCommercialDetails ? (
        <SaleCommercialDetailsForm
          onCancel={() => setShowCommercialDetailsForm(false)}
          paymentMethods={paymentMethods}
          sale={sale}
          onUpdateSaleCommercialDetails={onUpdateSaleCommercialDetails}
        />
      ) : null}
      {showReturnForm && onReturnItem ? (
        <SaleReturnForm
          onCancel={() => setShowReturnForm(false)}
          paymentMethods={paymentMethods}
          sale={sale}
          onReturnItem={onReturnItem}
        />
      ) : null}
      {!order.saleId ? <InlineNote>Venda vinculada não encontrada.</InlineNote> : null}
    </ActionStack>
  )
}

function ShippingOrderActions({
  cashRegister,
  order,
  paymentMethods,
  onApprove,
  onCancel,
  onComplete,
  onSeparate,
}: ShippingOrderActionRendererProps) {
  const [openAction, setOpenAction] = useState<'cancel' | 'complete' | null>(
    null,
  )
  const [payments, setPayments] = useState<SalePaymentDraft[]>([
    emptySalePayment(),
  ])
  const orderPayments = order.payments.length
    ? order.payments
    : order.paymentMethodId
      ? [{ paymentMethodId: order.paymentMethodId }]
      : []
  const usesQuoteBillingData = Boolean(
    order.quoteId &&
      salePaymentsAllowBilling(paymentMethods, orderPayments) &&
      (order.billingIssueDate ||
        order.billingDueDate ||
        order.payments.length > 0),
  )
  const manualPaymentAllowsBilling = salePaymentsAllowBilling(
    paymentMethods,
    payments,
  )
  const actions = shippingOrderActionsForStatus({
    cashRegister,
    order,
    onApprove,
    onCancel: () => setOpenAction('cancel'),
    onComplete: () => setOpenAction('complete'),
    onSeparate,
  })

  return (
    <ActionStack>
      <div className='flex justify-end'>
        <TableActionsMenu actions={actions} />
      </div>
      {!cashRegister && shippingOrderCanComplete(order) ? (
        <InlineNote>Abra o caixa para concluir.</InlineNote>
      ) : null}
      {openAction === 'complete' ? (
        <form
          className='grid w-full max-w-72 gap-2'
          onSubmit={(event) => onComplete(event, order)}>
          {usesQuoteBillingData ? (
            <Alert severity='info' variant='outlined'>
              Pagamento: {shippingOrderPaymentSummary(order)}
              <br />
              Data da fatura:{' '}
              {order.billingIssueDate
                ? formatDate(order.billingIssueDate)
                : 'sem data'}
              <br />
              Vencimento do boleto/fatura:{' '}
              {order.billingDueDate
                ? formatDate(order.billingDueDate)
                : 'sem data'}
            </Alert>
          ) : (
            <>
              <PaymentSplitFields
                disabled={!cashRegister}
                fieldPrefix='shipping'
                paymentMethods={paymentMethods}
                payments={payments}
                totalAmount={Number(order.totalAmount)}
                onChange={setPayments}
              />
              {manualPaymentAllowsBilling ? (
                <>
                  <TextField
                    disabled={!cashRegister}
                    label='Data da fatura'
                    name='shippingBillingIssueDate'
                    size='small'
                    type='date'
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    disabled={!cashRegister}
                    label='Vencimento do boleto/fatura'
                    name='shippingBillingDueDate'
                    size='small'
                    type='date'
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </>
              ) : null}
            </>
          )}
          <div className='flex flex-wrap gap-2'>
            <TableActionButton type='submit' disabled={!cashRegister}>
              Concluir venda
            </TableActionButton>
            <TableActionButton
              type='button'
              onClick={() => setOpenAction(null)}>
              Fechar
            </TableActionButton>
          </div>
        </form>
      ) : null}
      {openAction === 'cancel' ? (
        <ShippingOrderCancelForm
          order={order}
          onCancel={onCancel}
          onClose={() => setOpenAction(null)}
        />
      ) : null}
    </ActionStack>
  )
}

function shippingOrderActionsForStatus({
  cashRegister,
  order,
  onApprove,
  onCancel,
  onComplete,
  onSeparate,
}: {
  cashRegister: CashRegisterSession | null
  order: ShippingOrder
  onApprove: (order: ShippingOrder) => void
  onCancel: () => void
  onComplete: () => void
  onSeparate: (order: ShippingOrder) => void
}) {
  const actionsByStatus: Record<
    ShippingOrder['status'],
    TableActionsMenuAction[]
  > = {
    APPROVED: [
      {
        label: 'Confirmar separação',
        onSelect: () => onSeparate(order),
      },
      {
        disabled: !cashRegister,
        label: 'Concluir venda',
        onSelect: onComplete,
      },
      {
        label: 'Cancelar pedido',
        onSelect: onCancel,
      },
    ],
    CANCELLED: [],
    COMPLETED: [],
    QUOTED: [
      {
        label: 'Aprovar e reservar',
        onSelect: () => onApprove(order),
      },
      {
        label: 'Cancelar pedido',
        onSelect: onCancel,
      },
    ],
    SEPARATED: [
      {
        disabled: !cashRegister,
        label: 'Concluir venda',
        onSelect: onComplete,
      },
      {
        label: 'Cancelar pedido',
        onSelect: onCancel,
      },
    ],
  }

  return actionsByStatus[order.status]
}

function shippingOrderCanComplete(order: ShippingOrder) {
  return order.status === 'APPROVED' || order.status === 'SEPARATED'
}

function shippingOrderSale(sales: Sale[], order: ShippingOrder) {
  return order.saleId ? sales.find((sale) => sale.id === order.saleId) : undefined
}

function shippingOrderFiscalDocument(
  fiscalDocuments: FiscalDocument[],
  order: ShippingOrder,
) {
  return fiscalDocuments.find(
    (document) =>
      document.sourceType === 'SHIPPING_ORDER' && document.sourceId === order.id,
  )
}

function shippingOrderFiscalLinks(fiscalDocument?: FiscalDocument) {
  return [
    { fileType: 'danfe', label: 'DANFE', url: fiscalDocument?.pdfUrl },
    { fileType: 'xml', label: 'XML', url: fiscalDocument?.xmlUrl },
  ].filter(
    (link): link is {
      fileType: 'danfe' | 'xml'
      label: 'DANFE' | 'XML'
      url: string
    } => Boolean(link.url),
  )
}

function shippingOrderFiscalDocumentDownloadName(
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

function ShippingOrderCancelForm({
  onClose,
  order,
  onCancel,
}: {
  onClose: () => void
  order: ShippingOrder
  onCancel: (event: FormEvent<HTMLFormElement>, order: ShippingOrder) => void
}) {
  return (
    <form className='grid gap-2' onSubmit={(event) => onCancel(event, order)}>
      <TextField
        label='Motivo do cancelamento'
        name='shippingCancellationReason'
        size='small'
        slotProps={{ htmlInput: { maxLength: 500 } }}
        required
      />
      <div className='flex flex-wrap gap-2'>
        <TableActionButton type='submit'>Cancelar</TableActionButton>
        <TableActionButton type='button' onClick={onClose}>
          Fechar
        </TableActionButton>
      </div>
    </form>
  )
}

export function PickupReservationsPage({
  cashRegister,
  clients,
  embedded = false,
  fiscalDocuments = [],
  paymentMethods,
  products,
  reservations,
  sales = [],
  onCompleteReopenedSale,
  onEditSale,
  onOpenSaleFiscalQueue,
  onReturnItem,
  onSubmit,
  onComplete,
  onCancel,
  onUpdateSaleCommercialDetails,
}: {
  cashRegister: CashRegisterSession | null
  clients: Client[]
  embedded?: boolean
  fiscalDocuments?: FiscalDocument[]
  paymentMethods: PaymentMethod[]
  products: Product[]
  reservations: PickupReservation[]
  sales?: Sale[]
  onCompleteReopenedSale?: (sale: Sale) => void
  onEditSale?: (sale: Sale) => void
  onOpenSaleFiscalQueue?: (sale: Sale) => void
  onReturnItem?: SaleReturnHandler
  onSubmit: (input: PickupReservationDraftInput) => Promise<boolean>
  onComplete: (
    event: FormEvent<HTMLFormElement>,
    reservation: PickupReservation,
  ) => void
  onCancel: (
    event: FormEvent<HTMLFormElement>,
    reservation: PickupReservation,
  ) => void
  onUpdateSaleCommercialDetails?: SaleCommercialDetailsHandler
}) {
  const [clientId, setClientId] = useState('')
  const [showReservationForm, setShowReservationForm] = useState(!embedded)
  const [items, setItems] = useState<PickupReservationDraftItem[]>([
    emptyPickupReservationItem(),
  ])
  const [reservationSearch, setReservationSearch] = useState('')
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<SaleDetail>()
  const [reservationFiscalStatusFilter, setReservationFiscalStatusFilter] =
    useState<DirectSaleFiscalFilter>('ALL')
  const [reservationStatusFilter, setReservationStatusFilter] =
    useState<PickupReservationStatusFilter>('ALL')
  const filteredReservations = useMemo(
    () =>
      filterPickupReservations(reservations, {
        fiscalDocuments,
        fiscalStatus: reservationFiscalStatusFilter,
        search: reservationSearch,
        status: reservationStatusFilter,
      }),
    [
      fiscalDocuments,
      reservationFiscalStatusFilter,
      reservationSearch,
      reservationStatusFilter,
      reservations,
    ],
  )
  const { pagination, visibleItems } = usePaginatedRows<PickupReservation>(
    filteredReservations,
    [
      reservationFiscalStatusFilter,
      reservationSearch,
      reservationStatusFilter,
    ].join('|'),
  )
  const activeProducts = products.filter((product) => product.active)
  const reservationTotal = items.reduce((sum, item) => {
    const product = activeProducts.find(
      (currentProduct) => currentProduct.id === item.productId,
    )
    return sum + Number(item.quantity || 0) * Number(product?.salePrice ?? 0)
  }, 0)

  function updateItem(
    index: number,
    changes: Partial<PickupReservationDraftItem>,
  ) {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    )
  }

  function removeItem(index: number) {
    setItems((currentItems) =>
      currentItems.filter((_item, itemIndex) => itemIndex !== index),
    )
  }

  function resetForm() {
    setClientId('')
    setItems([emptyPickupReservationItem()])
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const saved = await onSubmit({
      clientId,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      })),
    })

    saved && resetForm()
    embedded && saved && setShowReservationForm(false)
  }

  return (
    <section
      className={
        embedded
          ? 'grid items-start gap-4'
          : 'grid items-start gap-4 xl:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)]'
      }>
      {showReservationForm ? (
        <FormGrid className='gap-5 sm:gap-6' onSubmit={submit}>
          <PageHeader
            description='Reserve uma ou mais pecas para retirada na loja.'
            icon={<PackagePlus size={18} />}
            title='Nova reserva'
          />
          <InlineNote>
            A reserva prende o saldo disponivel imediatamente. A baixa acontece
            somente ao concluir a venda.
          </InlineNote>
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
                  name={`pickupItems.${index}.productId`}
                  products={activeProducts}
                  required
                  stockLabel='available'
                  value={item.productId}
                  onChange={(productId) => updateItem(index, { productId })}
                />
                <TextField
                  label='Quantidade'
                  value={item.quantity}
                  type='number'
                  size='medium'
                  required
                  onChange={(event) =>
                    updateItem(index, { quantity: event.target.value })
                  }
                  slotProps={{ htmlInput: { min: '0.001', step: '0.001' } }}
                />
              </FormCard>
            ))}
          </div>

          <ActionGroup>
            <SecondaryButton
              type='button'
              onClick={() =>
                setItems((currentItems) => [
                  ...currentItems,
                  emptyPickupReservationItem(),
                ])
              }>
              Adicionar item
            </SecondaryButton>
          </ActionGroup>
          <TextField
            disabled
            label='Total estimado'
            size='medium'
            value={formatCurrency(reservationTotal)}
          />
          <ActionGroup>
            <PrimaryButton icon={<Plus size={17} />} type='submit'>
              Registrar reserva
            </PrimaryButton>
            {embedded ? (
              <SecondaryButton
                type='button'
                onClick={() => setShowReservationForm(false)}>
                Fechar
              </SecondaryButton>
            ) : null}
          </ActionGroup>
        </FormGrid>
      ) : null}

      <PagePanel wide>
        <PageHeader
          actions={
            <div className='flex flex-wrap items-center justify-end gap-2'>
              <span className='text-sm text-[#5f665f]'>
                {filteredReservations.length} de {reservations.length}{' '}
                registro(s)
              </span>
              {embedded && !showReservationForm ? (
                <PrimaryButton
                  icon={<Plus size={17} />}
                  type='button'
                  onClick={() => setShowReservationForm(true)}>
                  Nova reserva
                </PrimaryButton>
              ) : null}
            </div>
          }
          description='Conclua a venda quando o cliente retirar ou cancele para liberar o estoque.'
          title='Reservas para retirada'
        />
        <div className='mb-4 grid gap-3 xl:grid-cols-[minmax(220px,1fr)_190px_190px]'>
          <TextField
            label='Buscar reserva'
            placeholder='Cliente, produto, operador...'
            size='small'
            value={reservationSearch}
            onChange={(event) => setReservationSearch(event.target.value)}
          />
          <TextField
            label='Status'
            select
            size='small'
            value={reservationStatusFilter}
            onChange={(event) =>
              setReservationStatusFilter(
                event.target.value as PickupReservationStatusFilter,
              )
            }>
            {pickupReservationStatusFilterOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label='NF-e'
            select
            size='small'
            value={reservationFiscalStatusFilter}
            onChange={(event) =>
              setReservationFiscalStatusFilter(
                event.target.value as DirectSaleFiscalFilter,
              )
            }>
            {directSaleFiscalFilterOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </div>
        <ResponsiveTable
          columns={[
            {
              header: 'Nº',
              render: (reservation) => (
                <strong className='text-[#203466]'>
                  {pickupReservationNumberLabel(
                    reservation,
                    pickupReservationSale(sales, reservation),
                  )}
                </strong>
              ),
            },
            {
              header: 'Cliente',
              render: (reservation) => (
                <>
                  <strong>{reservation.clientName}</strong>
                  <InlineNote>{reservation.items.length} item(ns)</InlineNote>
                </>
              ),
            },
            {
              header: 'Data/hora',
              render: (reservation) =>
                formatDateTime(reservation.completedAt ?? reservation.createdAt),
            },
            {
              header: 'Status',
              render: (reservation) => (
                <PickupReservationStatusSummary reservation={reservation} />
              ),
            },
            {
              align: 'right',
              header: 'Total',
              render: (reservation) => formatCurrency(reservation.totalAmount),
            },
            {
              header: 'Pagamento',
              render: (reservation) =>
                pickupReservationPaymentSummary(
                  pickupReservationSale(sales, reservation),
                ),
            },
            {
              header: 'NF-e',
              render: (reservation) => (
                <DirectSaleFiscalStatus
                  fiscalDocument={pickupReservationFiscalDocument(
                    fiscalDocuments,
                    reservation,
                  )}
                />
              ),
            },
            {
              header: 'Operador',
              render: (reservation) =>
                reservation.completedByUserName ?? reservation.createdByUserName,
            },
            {
              align: 'right',
              header: 'Ações',
              render: (reservation) => (
                <div onClick={(event) => event.stopPropagation()}>
                  <PickupReservationActions
                    cashRegister={cashRegister}
                    fiscalDocument={pickupReservationFiscalDocument(
                      fiscalDocuments,
                      reservation,
                    )}
                    paymentMethods={paymentMethods}
                    reservation={reservation}
                    sale={pickupReservationSale(sales, reservation)}
                    onCancel={onCancel}
                    onComplete={onComplete}
                    onCompleteReopenedSale={onCompleteReopenedSale}
                    onEditSale={onEditSale}
                    onOpenSaleFiscalQueue={onOpenSaleFiscalQueue}
                    onReturnItem={onReturnItem}
                    onUpdateSaleCommercialDetails={onUpdateSaleCommercialDetails}
                  />
                </div>
              ),
            },
          ]}
          emptyMessage='Nenhuma reserva para retirada registrada.'
          getRowId={(reservation) => reservation.id}
          items={visibleItems}
          onRowClick={(reservation) =>
            setSelectedSaleDetail(
              saleDetailFromPickupReservation(
                reservation,
                pickupReservationSale(sales, reservation),
                pickupReservationFiscalDocument(fiscalDocuments, reservation),
              ),
            )
          }
          pagination={pagination}
        />
      </PagePanel>
      <SaleDetailDrawer
        detail={selectedSaleDetail}
        onClose={() => setSelectedSaleDetail(undefined)}
      />
    </section>
  )
}

function ShippingOrderStatusSummary({ order }: { order: ShippingOrder }) {
  return (
    <ActionStack>
      <StatusChip
        label={shippingOrderStatusLabel(order.status)}
        tone={shippingOrderStatusTone(order.status)}
      />
      {order.cancellationReason ? (
        <InlineNote>{order.cancellationReason}</InlineNote>
      ) : null}
    </ActionStack>
  )
}

function PickupReservationStatusSummary({
  reservation,
}: {
  reservation: PickupReservation
}) {
  return (
    <ActionStack>
      <StatusChip
        label={pickupReservationStatusLabel(reservation.status)}
        tone={pickupReservationStatusTone(reservation.status)}
      />
      {reservation.cancellationReason ? (
        <InlineNote>{reservation.cancellationReason}</InlineNote>
      ) : null}
    </ActionStack>
  )
}

function PickupReservationActions({
  cashRegister,
  fiscalDocument,
  paymentMethods,
  reservation,
  sale,
  onComplete,
  onCancel,
  onCompleteReopenedSale,
  onEditSale,
  onOpenSaleFiscalQueue,
  onReturnItem,
  onUpdateSaleCommercialDetails,
}: {
  cashRegister: CashRegisterSession | null
  fiscalDocument?: FiscalDocument
  paymentMethods: PaymentMethod[]
  reservation: PickupReservation
  sale?: Sale
  onComplete: (
    event: FormEvent<HTMLFormElement>,
    reservation: PickupReservation,
  ) => void
  onCancel: (
    event: FormEvent<HTMLFormElement>,
    reservation: PickupReservation,
  ) => void
  onCompleteReopenedSale?: (sale: Sale) => void
  onEditSale?: (sale: Sale) => void
  onOpenSaleFiscalQueue?: (sale: Sale) => void
  onReturnItem?: SaleReturnHandler
  onUpdateSaleCommercialDetails?: SaleCommercialDetailsHandler
}) {
  const [openAction, setOpenAction] = useState<'cancel' | 'complete' | null>(
    null,
  )
  const [showCommercialDetailsForm, setShowCommercialDetailsForm] =
    useState(false)
  const [showReturnForm, setShowReturnForm] = useState(false)
  const [payments, setPayments] = useState<SalePaymentDraft[]>([
    emptySalePayment(),
  ])
  const paymentAllowsBilling = salePaymentsAllowBilling(
    paymentMethods,
    payments,
  )

  if (reservation.status === 'COMPLETED') {
    return (
      <CompletedPickupReservationActions
        fiscalDocument={fiscalDocument}
        paymentMethods={paymentMethods}
        reservation={reservation}
        sale={sale}
        showCommercialDetailsForm={showCommercialDetailsForm}
        showReturnForm={showReturnForm}
        onCompleteReopenedSale={onCompleteReopenedSale}
        onEditSale={onEditSale}
        onOpenSaleFiscalQueue={onOpenSaleFiscalQueue}
        onReturnItem={onReturnItem}
        onShowCommercialDetailsForm={setShowCommercialDetailsForm}
        onShowReturnForm={setShowReturnForm}
        onUpdateSaleCommercialDetails={onUpdateSaleCommercialDetails}
      />
    )
  }

  if (reservation.status !== 'RESERVED') {
    return <InlineNote>Sem ações</InlineNote>
  }

  const actions: TableActionsMenuAction[] = [
    {
      disabled: !cashRegister,
      label: 'Concluir venda',
      onSelect: () => setOpenAction('complete'),
    },
    {
      label: 'Cancelar reserva',
      onSelect: () => setOpenAction('cancel'),
    },
  ]

  return (
    <ActionStack>
      <div className='flex justify-end'>
        <TableActionsMenu actions={actions} />
      </div>
      {!cashRegister ? (
        <InlineNote>Abra o caixa para concluir.</InlineNote>
      ) : null}
      {openAction === 'complete' ? (
        <form
          className='grid w-full max-w-72 gap-2'
          onSubmit={(event) => onComplete(event, reservation)}>
          <PaymentSplitFields
            disabled={!cashRegister}
            fieldPrefix='pickup'
            paymentMethods={paymentMethods}
            payments={payments}
            totalAmount={Number(reservation.totalAmount)}
            onChange={setPayments}
          />
          {paymentAllowsBilling ? (
            <>
              <TextField
                disabled={!cashRegister}
                label='Data da fatura'
                name='pickupBillingIssueDate'
                size='small'
                type='date'
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                disabled={!cashRegister}
                label='Vencimento do boleto/fatura'
                name='pickupBillingDueDate'
                size='small'
                type='date'
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </>
          ) : null}
          <div className='flex flex-wrap gap-2'>
            <TableActionButton type='submit' disabled={!cashRegister}>
              Concluir venda
            </TableActionButton>
            <TableActionButton
              type='button'
              onClick={() => setOpenAction(null)}>
              Fechar
            </TableActionButton>
          </div>
        </form>
      ) : null}
      {openAction === 'cancel' ? (
        <form
          className='grid w-full max-w-72 gap-2'
          onSubmit={(event) => onCancel(event, reservation)}>
          <TextField
            label='Motivo do cancelamento'
            name='pickupCancellationReason'
            size='small'
            slotProps={{ htmlInput: { maxLength: 500 } }}
            required
          />
          <div className='flex flex-wrap gap-2'>
            <TableActionButton type='submit'>Cancelar</TableActionButton>
            <TableActionButton
              type='button'
              onClick={() => setOpenAction(null)}>
              Fechar
            </TableActionButton>
          </div>
        </form>
      ) : null}
    </ActionStack>
  )
}

function CompletedPickupReservationActions({
  fiscalDocument,
  paymentMethods,
  reservation,
  sale,
  showCommercialDetailsForm,
  showReturnForm,
  onCompleteReopenedSale,
  onEditSale,
  onOpenSaleFiscalQueue,
  onReturnItem,
  onShowCommercialDetailsForm,
  onShowReturnForm,
  onUpdateSaleCommercialDetails,
}: {
  fiscalDocument?: FiscalDocument
  paymentMethods: PaymentMethod[]
  reservation: PickupReservation
  sale?: Sale
  showCommercialDetailsForm: boolean
  showReturnForm: boolean
  onCompleteReopenedSale?: (sale: Sale) => void
  onEditSale?: (sale: Sale) => void
  onOpenSaleFiscalQueue?: (sale: Sale) => void
  onReturnItem?: SaleReturnHandler
  onShowCommercialDetailsForm: (show: boolean) => void
  onShowReturnForm: (show: boolean) => void
  onUpdateSaleCommercialDetails?: SaleCommercialDetailsHandler
}) {
  if (!sale) {
    return <InlineNote>Venda concluída</InlineNote>
  }

  const fiscalDocumentBlocksCommercialChanges = Boolean(
    fiscalDocument &&
      ['AUTHORIZED', 'PENDING', 'PROCESSING'].includes(fiscalDocument.status),
  )
  const actions: TableActionsMenuAction[] = [
    {
      icon: <ReceiptText size={14} />,
      label: 'Baixar comprovante',
      onSelect: () =>
        void downloadApiFile(
          `/sales/${sale.id}/receipt`,
          `comprovante-${sale.id}.pdf`,
        ),
    },
  ]

  pickupReservationFiscalLinks(fiscalDocument).forEach((link) => {
    actions.push({
      icon: <FileText size={14} />,
      label: `Baixar ${link.label}`,
      onSelect: () =>
        fiscalDocument &&
        void downloadApiFile(
          `/fiscal-documents/${fiscalDocument.id}/files/${link.fileType}`,
          pickupReservationFiscalDocumentDownloadName(
            fiscalDocument,
            link.label,
          ),
        ),
    })
  })

  if (!fiscalDocument && onOpenSaleFiscalQueue) {
    actions.push({
      icon: <FileText size={14} />,
      label: 'Gerar NF-e',
      onSelect: () => onOpenSaleFiscalQueue(sale),
    })
  }

  onEditSale &&
    actions.push({
      disabled: fiscalDocumentBlocksCommercialChanges,
      label: 'Reabrir / editar venda',
      onSelect: () => onEditSale(sale),
    })

  sale.status === 'OPEN' &&
    onCompleteReopenedSale &&
    actions.push({
      label: 'Concluir venda',
      onSelect: () => onCompleteReopenedSale(sale),
    })

  onUpdateSaleCommercialDetails &&
    actions.push({
      disabled: fiscalDocumentBlocksCommercialChanges,
      label: 'Corrigir pagamento e fatura',
      onSelect: () => onShowCommercialDetailsForm(true),
    })

  onReturnItem &&
    actions.push({
      disabled: fiscalDocumentBlocksCommercialChanges,
      label: 'Registrar devolução',
      onSelect: () => onShowReturnForm(true),
    })

  return (
    <ActionStack>
      <div className='flex justify-end'>
        <TableActionsMenu actions={actions} />
      </div>
      <InlineNote>
        Venda Nº {sale.saleNumber} gerada pela retirada.
      </InlineNote>
      {fiscalDocumentBlocksCommercialChanges ? (
        <InlineNote>Cancele a NF-e antes de editar a venda.</InlineNote>
      ) : null}
      {showCommercialDetailsForm && onUpdateSaleCommercialDetails ? (
        <SaleCommercialDetailsForm
          onCancel={() => onShowCommercialDetailsForm(false)}
          paymentMethods={paymentMethods}
          sale={sale}
          onUpdateSaleCommercialDetails={onUpdateSaleCommercialDetails}
        />
      ) : null}
      {showReturnForm && onReturnItem ? (
        <SaleReturnForm
          onCancel={() => onShowReturnForm(false)}
          paymentMethods={paymentMethods}
          sale={sale}
          onReturnItem={onReturnItem}
        />
      ) : null}
      {!reservation.saleId ? (
        <InlineNote>Venda vinculada não encontrada.</InlineNote>
      ) : null}
    </ActionStack>
  )
}

function pickupReservationSale(
  sales: Sale[],
  reservation: PickupReservation,
) {
  return reservation.saleId
    ? sales.find((sale) => sale.id === reservation.saleId)
    : undefined
}

function pickupReservationFiscalDocument(
  fiscalDocuments: FiscalDocument[],
  reservation: PickupReservation,
) {
  return fiscalDocuments.find(
    (document) =>
      document.sourceType === 'PICKUP_RESERVATION' &&
      document.sourceId === reservation.id,
  )
}

function pickupReservationFiscalLinks(fiscalDocument?: FiscalDocument) {
  return [
    { fileType: 'danfe', label: 'DANFE', url: fiscalDocument?.pdfUrl },
    { fileType: 'xml', label: 'XML', url: fiscalDocument?.xmlUrl },
  ].filter(
    (link): link is {
      fileType: 'danfe' | 'xml'
      label: 'DANFE' | 'XML'
      url: string
    } => Boolean(link.url),
  )
}

function pickupReservationFiscalDocumentDownloadName(
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

const pickupReservationStatusFilterOptions: Array<{
  label: string
  value: PickupReservationStatusFilter
}> = [
  { label: 'Todas', value: 'ALL' },
  { label: 'Reservadas', value: 'RESERVED' },
  { label: 'Vendas concluídas', value: 'COMPLETED' },
  { label: 'Canceladas', value: 'CANCELLED' },
]

function filterPickupReservations(
  reservations: PickupReservation[],
  filters: {
    fiscalDocuments: FiscalDocument[]
    fiscalStatus: DirectSaleFiscalFilter
    search: string
    status: PickupReservationStatusFilter
  },
) {
  const normalizedSearch = normalizePickupReservationSearchText(filters.search)

  return reservations.filter((reservation) => {
    const matchesStatus =
      filters.status === 'ALL' || reservation.status === filters.status
    const matchesFiscalStatus = directSaleMatchesFiscalStatus(
      pickupReservationFiscalDocument(filters.fiscalDocuments, reservation),
      filters.fiscalStatus,
    )
    const matchesSearch =
      !normalizedSearch ||
      pickupReservationSearchText(reservation).includes(normalizedSearch)

    return matchesStatus && matchesFiscalStatus && matchesSearch
  })
}

function pickupReservationSearchText(reservation: PickupReservation) {
  return normalizePickupReservationSearchText(
    [
      reservation.clientName,
      reservation.clientPhone,
      reservation.saleId,
      reservation.createdByUserName,
      reservation.completedByUserName,
      reservation.cancelledByUserName,
      reservation.cancellationReason,
      reservation.totalAmount,
      pickupReservationStatusLabel(reservation.status),
      ...reservation.items.flatMap((item) => [
        item.productName,
        item.quantity,
        item.totalAmount,
      ]),
    ].join(' '),
  )
}

function normalizePickupReservationSearchText(
  value: string | number | null | undefined,
) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
}

function shippingOrderPaymentSummary(order: ShippingOrder) {
  return order.payments.length
    ? order.payments.map((payment) => payment.paymentMethodName).join(' + ')
    : (order.paymentMethodName ?? 'definido no orçamento')
}

const shippingOrderStatusFilterOptions: Array<{
  label: string
  value: ShippingOrderStatusFilter
}> = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Orçamento enviado', value: 'QUOTED' },
  { label: 'Aprovados', value: 'APPROVED' },
  { label: 'Separados', value: 'SEPARATED' },
  { label: 'Vendas concluídas', value: 'COMPLETED' },
  { label: 'Cancelados', value: 'CANCELLED' },
]

function filterShippingOrders(
  orders: ShippingOrder[],
  filters: {
    fiscalDocuments: FiscalDocument[]
    fiscalStatus: DirectSaleFiscalFilter
    paymentMethodId: string
    search: string
    status: ShippingOrderStatusFilter
  },
) {
  const normalizedSearch = normalizeShippingOrderSearchText(filters.search)

  return orders.filter((order) => {
    const matchesStatus =
      filters.status === 'ALL' || order.status === filters.status
    const matchesFiscalStatus = directSaleMatchesFiscalStatus(
      shippingOrderFiscalDocument(filters.fiscalDocuments, order),
      filters.fiscalStatus,
    )
    const matchesPayment =
      filters.paymentMethodId === 'ALL' ||
      order.paymentMethodId === filters.paymentMethodId ||
      order.payments.some(
        (payment) => payment.paymentMethodId === filters.paymentMethodId,
      )
    const matchesSearch =
      !normalizedSearch ||
      shippingOrderSearchText(order).includes(normalizedSearch)

    return matchesStatus && matchesFiscalStatus && matchesPayment && matchesSearch
  })
}

function shippingOrderSearchText(order: ShippingOrder) {
  return normalizeShippingOrderSearchText(
    [
      order.clientName,
      order.clientPhone,
      order.quoteId ? 'orçamento' : '',
      order.quoteId,
      order.saleId,
      order.createdByUserName,
      order.approvedByUserName,
      order.separatedByUserName,
      order.completedByUserName,
      order.cancelledByUserName,
      order.cancellationReason,
      order.totalAmount,
      shippingOrderPaymentSummary(order),
      shippingOrderStatusLabel(order.status),
      ...order.payments.map((payment) => payment.paymentMethodName),
      ...order.items.flatMap((item) => [
        item.description,
        item.productName,
        item.quantity,
        item.totalAmount,
      ]),
    ].join(' '),
  )
}

function normalizeShippingOrderSearchText(
  value: string | number | null | undefined,
) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
}

function shippingOrderStatusLabel(status: ShippingOrder['status']) {
  return shippingOrderStatusPresentation[status].label
}

function shippingOrderStatusTone(status: ShippingOrder['status']): StatusTone {
  return shippingOrderStatusPresentation[status].tone
}

function pickupReservationStatusLabel(status: PickupReservation['status']) {
  return pickupReservationStatusPresentation[status].label
}

function pickupReservationStatusTone(
  status: PickupReservation['status'],
): StatusTone {
  return pickupReservationStatusPresentation[status].tone
}

const shippingOrderStatusPresentation: Record<
  ShippingOrder['status'],
  { label: string; tone: StatusTone }
> = {
  APPROVED: { label: 'Aprovado - separar', tone: 'success' },
  CANCELLED: { label: 'Cancelado', tone: 'neutral' },
  COMPLETED: { label: 'Venda concluída', tone: 'success' },
  QUOTED: { label: 'Orçamento enviado', tone: 'warning' },
  SEPARATED: { label: 'Separado', tone: 'success' },
}

const pickupReservationStatusPresentation: Record<
  PickupReservation['status'],
  { label: string; tone: StatusTone }
> = {
  CANCELLED: { label: 'Cancelada', tone: 'neutral' },
  COMPLETED: { label: 'Venda concluída', tone: 'success' },
  RESERVED: { label: 'Reservada', tone: 'warning' },
}
