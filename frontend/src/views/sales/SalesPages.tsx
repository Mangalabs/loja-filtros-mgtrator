import Alert from '@mui/material/Alert'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import { PackagePlus, Plus, Send, ShoppingCart } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import type {
  CashRegisterSession,
  Client,
  PaymentMethod,
  PickupReservation,
  Product,
  Sale,
  ShippingOrder,
} from '../../api'
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

type SaleDraftItem = {
  productId: string
  quantity: string
}

type PickupReservationDraftItem = {
  productId: string
  quantity: string
}

type SalePaymentDraft = {
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
  paymentMethods,
  products,
  sales,
  onOpenSalesHistory,
  onSubmit,
}: {
  cashRegister: CashRegisterSession | null
  clients: Client[]
  paymentMethods: PaymentMethod[]
  products: Product[]
  sales: Sale[]
  onOpenSalesHistory: () => void
  onSubmit: (input: SaleDraftInput) => Promise<boolean>
}) {
  const [clientId, setClientId] = useState('')
  const [billingIssueDate, setBillingIssueDate] = useState('')
  const [billingDueDate, setBillingDueDate] = useState('')
  const [discountAmount, setDiscountAmount] = useState('')
  const [payments, setPayments] = useState<SalePaymentDraft[]>([
    emptySalePayment(),
  ])
  const [items, setItems] = useState<SaleDraftItem[]>([emptySaleItem()])
  const activeProducts = products.filter((product) => product.active)
  const recentSales = sales
    .filter((sale) => sale.status === 'COMPLETED')
    .slice(0, 3)
  const saleSubtotal = items.reduce((sum, item) => {
    const product = activeProducts.find(
      (currentProduct) => currentProduct.id === item.productId,
    )
    return sum + Number(item.quantity || 0) * Number(product?.salePrice ?? 0)
  }, 0)
  const saleDiscount = moneyInputValue(discountAmount)
  const discountExceedsSubtotal = saleDiscount > saleSubtotal
  const saleTotal = Math.max(saleSubtotal - saleDiscount, 0)

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
      billingIssueDate: billingIssueDate || null,
      billingDueDate: billingDueDate || null,
      discountAmount: saleDiscount,
      paymentMethodId: payments[0]?.paymentMethodId,
      payments: salePaymentPayloads(payments, saleTotal),
      items: items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      })),
    })

    saved && resetForm()
  }

  return (
    <section className='grid items-start gap-4 xl:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)]'>
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
        </ActionGroup>
      </FormGrid>

      <PagePanel>
        <PageHeader
          description='As ações completas ficam no histórico geral.'
          title='Últimas vendas'
        />
        <div className='grid gap-3'>
          {recentSales.length > 0 ? (
            recentSales.map((sale) => (
              <div
                className='rounded-xl border border-[#e4e9e5] bg-white p-3'
                key={sale.id}>
                <div className='flex flex-wrap items-start justify-between gap-2'>
                  <div>
                    <strong className='text-[#203466]'>
                      Nº {sale.saleNumber}
                    </strong>
                    <InlineNote>{formatDateTime(sale.createdAt)}</InlineNote>
                  </div>
                  <strong>{formatCurrency(sale.totalAmount)}</strong>
                </div>
                <div className='mt-2 text-sm text-[#2c281e]'>
                  <SaleItemsSummary sale={sale} />
                </div>
                <InlineNote>
                  {sale.clientName ?? 'Cliente não identificado'} |{' '}
                  {sale.paymentMethodName}
                </InlineNote>
              </div>
            ))
          ) : (
            <InlineNote>Nenhuma venda concluída ainda.</InlineNote>
          )}
        </div>
        <ActionGroup>
          <SecondaryButton type='button' onClick={onOpenSalesHistory}>
            Abrir histórico completo
          </SecondaryButton>
        </ActionGroup>
      </PagePanel>
    </section>
  )
}

function emptySaleItem(): SaleDraftItem {
  return {
    productId: '',
    quantity: '',
  }
}

function emptySalePayment(): SalePaymentDraft {
  return {
    paymentMethodId: '',
    amount: '',
  }
}

function PaymentSplitFields({
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
  const activePaymentMethods = paymentMethods.filter((method) => method.active)
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
  paymentMethods,
  orders,
  onOpenQuotes,
  onApprove,
  onSeparate,
  onComplete,
  onCancel,
}: {
  cashRegister: CashRegisterSession | null
  paymentMethods: PaymentMethod[]
  orders: ShippingOrder[]
  onOpenQuotes: () => void
  onApprove: (order: ShippingOrder) => void
  onSeparate: (order: ShippingOrder) => void
  onComplete: (event: FormEvent<HTMLFormElement>, order: ShippingOrder) => void
  onCancel: (event: FormEvent<HTMLFormElement>, order: ShippingOrder) => void
}) {
  const { pagination, visibleItems } = usePaginatedRows<ShippingOrder>(orders)

  return (
    <section className='grid items-start gap-4 xl:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)]'>
      <PagePanel>
        <PageHeader
          description='Crie um orçamento e transforme em pedido quando o cliente aprovar.'
          icon={<Send size={18} />}
          title='Novo pedido por orçamento'
        />
        <InlineNote>
          Pedidos com envio nascem de orçamentos salvos. Quando o cliente
          confirmar, informe o pagamento e conclua a venda em um único passo.
        </InlineNote>
        <PrimaryButton
          icon={<Plus size={17} />}
          type='button'
          onClick={onOpenQuotes}>
          Abrir orçamentos
        </PrimaryButton>
      </PagePanel>

      <PagePanel wide>
        <PageHeader
          actions={
            <span className='text-sm text-[#5f665f]'>
              {orders.length} registros
            </span>
          }
          description='Conclua a venda em um passo quando o cliente confirmar o envio.'
          title='Vendas'
        />
        <ResponsiveTable
          columns={[
            {
              header: 'Pedido',
              render: (order) => (
                <>
                  {formatDateTime(order.createdAt)}
                  <InlineNote>Operador: {order.createdByUserName}</InlineNote>
                </>
              ),
            },
            {
              header: 'Cliente e itens',
              render: (order) => <ShippingOrderItemsSummary order={order} />,
            },
            {
              header: 'Resumo',
              render: (order) => (
                <>
                  <strong>{formatCurrency(order.totalAmount)}</strong>
                  <InlineNote>
                    Qtd. {formatQuantity(totalShippingOrderQuantity(order))}
                  </InlineNote>
                </>
              ),
            },
            {
              header: 'Status',
              render: (order) => <ShippingOrderStatusSummary order={order} />,
            },
            {
              header: 'Ações',
              render: (order) =>
                shippingOrderActionRenderers[order.status]({
                  cashRegister,
                  order,
                  paymentMethods,
                  onApprove,
                  onCancel,
                  onComplete,
                  onSeparate,
                }),
            },
          ]}
          emptyMessage='Nenhum pedido com envio registrado.'
          getRowId={(order) => order.id}
          items={visibleItems}
          pagination={pagination}
        />
      </PagePanel>
    </section>
  )
}

type ShippingOrderActionRendererProps = {
  cashRegister: CashRegisterSession | null
  order: ShippingOrder
  paymentMethods: PaymentMethod[]
  onApprove: (order: ShippingOrder) => void
  onSeparate: (order: ShippingOrder) => void
  onComplete: (event: FormEvent<HTMLFormElement>, order: ShippingOrder) => void
  onCancel: (event: FormEvent<HTMLFormElement>, order: ShippingOrder) => void
}

const shippingOrderActionRenderers: Record<
  ShippingOrder['status'],
  (props: ShippingOrderActionRendererProps) => ReactNode
> = {
  APPROVED: (props) => <ShippingOrderCompleteActions {...props} />,
  CANCELLED: () => '-',
  COMPLETED: () => 'Venda concluída',
  QUOTED: (props) => <ShippingOrderCompleteActions {...props} />,
  SEPARATED: (props) => <ShippingOrderCompleteActions {...props} />,
}

function ShippingOrderCompleteActions({
  cashRegister,
  order,
  paymentMethods,
  onCancel,
  onComplete,
}: ShippingOrderActionRendererProps) {
  const [openAction, setOpenAction] = useState<'cancel' | 'complete' | null>(
    null,
  )
  const [payments, setPayments] = useState<SalePaymentDraft[]>([
    emptySalePayment(),
  ])
  const usesQuoteBillingData = Boolean(order.quoteId && order.paymentMethodId)
  const actions: TableActionsMenuAction[] = [
    {
      disabled: !cashRegister,
      label: 'Concluir venda',
      onSelect: () => setOpenAction('complete'),
    },
    {
      label: 'Cancelar pedido',
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
          onSubmit={(event) => onComplete(event, order)}>
          {usesQuoteBillingData ? (
            <Alert severity='info' variant='outlined'>
              Pagamento: {order.paymentMethodName ?? 'definido no orçamento'}
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
  paymentMethods,
  products,
  reservations,
  onSubmit,
  onComplete,
  onCancel,
}: {
  cashRegister: CashRegisterSession | null
  clients: Client[]
  paymentMethods: PaymentMethod[]
  products: Product[]
  reservations: PickupReservation[]
  onSubmit: (input: PickupReservationDraftInput) => Promise<boolean>
  onComplete: (
    event: FormEvent<HTMLFormElement>,
    reservation: PickupReservation,
  ) => void
  onCancel: (
    event: FormEvent<HTMLFormElement>,
    reservation: PickupReservation,
  ) => void
}) {
  const [clientId, setClientId] = useState('')
  const [items, setItems] = useState<PickupReservationDraftItem[]>([
    emptyPickupReservationItem(),
  ])
  const { pagination, visibleItems } =
    usePaginatedRows<PickupReservation>(reservations)
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
  }

  return (
    <section className='grid items-start gap-4 xl:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)]'>
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
        </ActionGroup>
      </FormGrid>

      <PagePanel wide>
        <PageHeader
          actions={
            <span className='text-sm text-[#5f665f]'>
              {reservations.length} registros
            </span>
          }
          description='Conclua a venda quando o cliente retirar ou cancele para liberar o estoque.'
          title='Reservas para retirada'
        />
        <ResponsiveTable
          columns={[
            {
              header: 'Data',
              render: (reservation) => formatDateTime(reservation.createdAt),
            },
            {
              header: 'Cliente',
              render: (reservation) => reservation.clientName,
            },
            {
              header: 'Produto',
              render: (reservation) => (
                <PickupReservationItemsSummary reservation={reservation} />
              ),
            },
            {
              header: 'Qtd.',
              render: (reservation) =>
                formatQuantity(totalPickupReservationQuantity(reservation)),
            },
            {
              header: 'Total',
              render: (reservation) => formatCurrency(reservation.totalAmount),
            },
            {
              header: 'Operador',
              render: (reservation) => reservation.createdByUserName,
            },
            {
              header: 'Status',
              render: (reservation) => (
                <PickupReservationStatusSummary reservation={reservation} />
              ),
            },
            {
              header: 'Ações',
              render: (reservation) => (
                <PickupReservationActions
                  cashRegister={cashRegister}
                  paymentMethods={paymentMethods}
                  reservation={reservation}
                  onCancel={onCancel}
                  onComplete={onComplete}
                />
              ),
            },
          ]}
          emptyMessage='Nenhuma reserva para retirada registrada.'
          getRowId={(reservation) => reservation.id}
          items={visibleItems}
          pagination={pagination}
        />
      </PagePanel>
    </section>
  )
}

function SaleItemsSummary({ sale }: { sale: Sale }) {
  return (
    <>
      {sale.items.length} item(ns)
      <InlineNote>
        {sale.items.map((item) => item.productName).join(', ')}
      </InlineNote>
    </>
  )
}

function ShippingOrderItemsSummary({ order }: { order: ShippingOrder }) {
  return (
    <ActionStack>
      <strong>{order.clientName}</strong>
      {order.quoteId ? <InlineNote>Origem: orçamento</InlineNote> : null}
      <InlineNote>
        {order.items
          .map((item) => item.description ?? item.productName)
          .join(', ')}
      </InlineNote>
    </ActionStack>
  )
}

function ShippingOrderStatusSummary({ order }: { order: ShippingOrder }) {
  return (
    <ActionStack>
      <StatusChip
        label={shippingOrderStatusLabel(order.status)}
        tone={shippingOrderStatusTone(order.status)}
      />
      {shippingOrderAuditNotes(order).map((note) => (
        <InlineNote key={note}>{note}</InlineNote>
      ))}
      {order.cancellationReason ? (
        <InlineNote>{order.cancellationReason}</InlineNote>
      ) : null}
    </ActionStack>
  )
}

function PickupReservationItemsSummary({
  reservation,
}: {
  reservation: PickupReservation
}) {
  return (
    <>
      {reservation.items.length} item(ns)
      <InlineNote>
        {reservation.items.map((item) => item.productName).join(', ')}
      </InlineNote>
    </>
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
      {pickupReservationAuditNotes(reservation).map((note) => (
        <InlineNote key={note}>{note}</InlineNote>
      ))}
      {reservation.cancellationReason ? (
        <InlineNote>{reservation.cancellationReason}</InlineNote>
      ) : null}
    </ActionStack>
  )
}

function PickupReservationActions({
  cashRegister,
  paymentMethods,
  reservation,
  onComplete,
  onCancel,
}: {
  cashRegister: CashRegisterSession | null
  paymentMethods: PaymentMethod[]
  reservation: PickupReservation
  onComplete: (
    event: FormEvent<HTMLFormElement>,
    reservation: PickupReservation,
  ) => void
  onCancel: (
    event: FormEvent<HTMLFormElement>,
    reservation: PickupReservation,
  ) => void
}) {
  const [openAction, setOpenAction] = useState<'cancel' | 'complete' | null>(
    null,
  )
  const [payments, setPayments] = useState<SalePaymentDraft[]>([
    emptySalePayment(),
  ])

  if (reservation.status === 'COMPLETED') {
    return 'Venda concluída'
  }

  if (reservation.status !== 'RESERVED') {
    return '-'
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

function totalShippingOrderQuantity(order: ShippingOrder) {
  return String(
    order.items.reduce((sum, item) => sum + Number(item.quantity), 0),
  )
}

function totalPickupReservationQuantity(reservation: PickupReservation) {
  return String(
    reservation.items.reduce((sum, item) => sum + Number(item.quantity), 0),
  )
}

function shippingOrderAuditNotes(order: ShippingOrder) {
  return [
    order.approvedByUserName
      ? `Aprovado por ${order.approvedByUserName}`
      : null,
    order.separatedByUserName
      ? `Separado por ${order.separatedByUserName}`
      : null,
    order.completedByUserName
      ? `Concluído por ${order.completedByUserName}`
      : null,
    order.cancelledByUserName
      ? `Cancelado por ${order.cancelledByUserName}`
      : null,
  ].filter((note): note is string => Boolean(note))
}

function pickupReservationAuditNotes(reservation: PickupReservation) {
  return [
    reservation.completedByUserName
      ? `Concluida por ${reservation.completedByUserName}`
      : null,
    reservation.cancelledByUserName
      ? `Cancelada por ${reservation.cancelledByUserName}`
      : null,
  ].filter((note): note is string => Boolean(note))
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
  SEPARATED: { label: 'Separado para envio', tone: 'success' },
}

const pickupReservationStatusPresentation: Record<
  PickupReservation['status'],
  { label: string; tone: StatusTone }
> = {
  CANCELLED: { label: 'Cancelada', tone: 'neutral' },
  COMPLETED: { label: 'Venda concluída', tone: 'success' },
  RESERVED: { label: 'Reservada', tone: 'warning' },
}
